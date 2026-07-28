import { NextResponse } from "next/server";
import { createWalletClient, encodeAbiParameters, http, keccak256, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
  ROBACHA_GACHA_ABI,
} from "@/lib/abi";
import { chainConfig, contracts } from "@/lib/config";
import { keeper, rpc } from "@/lib/env/server";
import { publicClient, robinhoodChain } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Settle one round now, rather than waiting for the keeper's next tick.
 *
 * A round that fills closes itself immediately, and the chain confirms blocks
 * in about a tenth of a second — so the only thing standing between a full
 * round and its results was the five-minute cron. Someone who buys a whole
 * round in one signature should not stare at a spinner for five minutes
 * because of a scheduler.
 *
 * Deliberately unauthenticated. Three of the four steps — closing, requesting
 * randomness, settling — are permissionless on the contract, so requiring a
 * secret would protect nothing. The fourth, revealing, needs the commitment
 * secret, and that stays server-side; this route is the only way a visitor can
 * cause it to happen, and only for a round that is genuinely due.
 *
 * Abuse is bounded by construction rather than by a rate limiter: every action
 * is simulated first and skipped unless the round is actually in the matching
 * state, and each state transition is one-way. Calling this repeatedly against
 * the same round does nothing after the first pass, and calling it against a
 * round that is not ready does nothing at all.
 */

const State = {
  None: 0, Open: 1, Closed: 2, RandomnessRequested: 3, CrossChainPending: 4,
  VRFPending: 5, ResultReturning: 6, RandomnessReceived: 7, Settled: 8,
  Failed: 9, Refundable: 10, Cancelled: 11,
} as const;

/** Same derivation the keeper uses. */
function secretForIndex(index: number): `0x${string}` | null {
  if (keeper.legacySecrets) {
    try {
      const map = JSON.parse(keeper.legacySecrets) as Record<string, string>;
      const legacy = map[String(index)];
      if (legacy) return legacy as `0x${string}`;
    } catch {
      /* fall through to derivation */
    }
  }
  if (!keeper.commitmentSeed) return null;
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [keeper.commitmentSeed as `0x${string}`, BigInt(index)],
    ),
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { roundId?: number } | null;
  const roundId = Number(body?.roundId);

  if (!Number.isInteger(roundId) || roundId <= 0) {
    return NextResponse.json({ error: "roundId required" }, { status: 400 });
  }
  if (!contracts.gacha || !contracts.randomnessSender) {
    return NextResponse.json({ error: "contracts not configured" }, { status: 503 });
  }
  const rawKey = keeper.privateKey?.trim();
  if (!rawKey || !/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
    return NextResponse.json({ error: "settler not configured" }, { status: 503 });
  }

  const gacha = contracts.gacha as Address;
  const randomness = contracts.randomnessSender as Address;
  const client = publicClient();
  const account = privateKeyToAccount(rawKey as `0x${string}`);
  const wallet = createWalletClient({
    account,
    chain: robinhoodChain,
    transport: http(rpc.robinhood ?? chainConfig.rpcUrl, { retryCount: 2, timeout: 12_000 }),
  });

  const steps: { step: string; txHash?: string; skipped?: string }[] = [];

  async function attempt(
    step: string,
    address: Address,
    abi: readonly unknown[],
    functionName: string,
    args: readonly unknown[],
  ): Promise<boolean> {
    try {
      const { request: sim } = await client.simulateContract({
        address,
        abi: abi as never,
        functionName: functionName as never,
        args: args as never,
        account,
      });
      const hash = await wallet.writeContract(sim);
      await client.waitForTransactionReceipt({ hash });
      steps.push({ step, txHash: hash });
      return true;
    } catch (error) {
      steps.push({
        step,
        skipped: error instanceof Error ? error.message.split("\n")[0].slice(0, 140) : "reverted",
      });
      return false;
    }
  }

  async function readState() {
    const round = (await client.readContract({
      address: gacha,
      abi: ROBACHA_GACHA_ABI,
      functionName: "getRound",
      args: [BigInt(roundId)],
    })) as { state: number; entryCount: number; closesAt: bigint };
    return { state: Number(round.state), entryCount: Number(round.entryCount), closesAt: round.closesAt };
  }

  try {
    // Walk the round forward one step at a time, re-reading between each so a
    // state that has already moved is never acted on twice.
    for (let pass = 0; pass < 4; pass += 1) {
      const { state, entryCount, closesAt } = await readState();

      if (state === State.Settled || state === State.Refundable || state === State.None) break;
      if (entryCount === 0) break;

      if (state === State.Open) {
        // Only a round whose window has elapsed may be closed; a full round
        // closed itself when the last entry landed.
        if (BigInt(Math.floor(Date.now() / 1000)) < closesAt) {
          steps.push({ step: "closeRound", skipped: "round is still open for more entries" });
          break;
        }
        if (!(await attempt("closeRound", gacha, ROBACHA_GACHA_ABI, "closeRound", [BigInt(roundId)]))) break;
        continue;
      }

      if (state === State.Closed) {
        if (!(await attempt("requestRoundRandomness", gacha, ROBACHA_GACHA_ABI, "requestRoundRandomness", [BigInt(roundId)]))) break;
        continue;
      }

      if (state === State.RandomnessRequested || state === State.CrossChainPending) {
        const pending = (await client.readContract({
          address: randomness,
          abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
          functionName: "pending",
          args: [BigInt(roundId)],
        })) as readonly [string, bigint, bigint, boolean, boolean];

        const secret = secretForIndex(Number(pending[1]));
        if (!secret) {
          steps.push({ step: "reveal", skipped: "no secret derivable for this commitment" });
          break;
        }
        if (!(await attempt("reveal", randomness, ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI, "reveal", [BigInt(roundId), secret]))) break;
        continue;
      }

      if (state === State.RandomnessReceived) {
        await attempt("settleEntries", gacha, ROBACHA_GACHA_ABI, "settleEntries", [BigInt(roundId), 25]);
        continue;
      }

      break;
    }

    const final = await readState();
    return NextResponse.json(
      { ok: true, roundId, state: Object.keys(State)[final.state] ?? final.state, steps },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "settle failed", steps },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
