import { NextResponse } from "next/server";
import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ROBACHA_GACHA_ABI } from "@/lib/abi/robacha-gacha";
import { ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI } from "@/lib/abi/robacha-commit-reveal-randomness";
import { keccak256, encodeAbiParameters } from "viem";
import { chainConfig, contracts } from "@/lib/config";
import { keeper, rpc } from "@/lib/env/server";
import { publicClient, robinhoodChain } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Advances rounds that are waiting on somebody to push them along.
 *
 * A spin does not settle itself. The contract deliberately leaves
 * `closeRound`, `requestRoundRandomness` and `settleEntries` permissionless so
 * that no operator can strand a round — but permissionless is not automatic.
 * Without this, a paid round sits at Closed forever and the only exit anyone
 * gets is the refund timeout. That is precisely how three funded rounds ended
 * up stuck in production.
 *
 * Every action is simulated before it is sent, so a call that would revert is
 * skipped rather than burning gas, and the whole route is idempotent: running
 * it twice does nothing the second time.
 */

/** Mirrors `RoundState` in RobachaGacha.sol. */
const State = {
  None: 0,
  Open: 1,
  Closed: 2,
  RandomnessRequested: 3,
  CrossChainPending: 4,
  VRFPending: 5,
  ResultReturning: 6,
  RandomnessReceived: 7,
  Settled: 8,
  Failed: 9,
  Refundable: 10,
  Cancelled: 11,
} as const;

/** How many rounds back to inspect. Old rounds are terminal and never change. */
const SCAN_DEPTH = 25n;
const SETTLE_BATCH = 25;

/**
 * Secret for a commitment index, derived rather than stored.
 *
 * Deterministic in the master seed, so any invocation on any container can
 * recompute any secret. Nothing is written to disk, which is what makes this
 * survive a serverless host: there is no file to be missing, and no window
 * between posting a commitment and persisting its secret.
 *
 * Indices predating the seed fall back to an explicit map, because their
 * hashes are already on chain and the queue is FIFO — they must stay
 * revealable until consumed.
 */
function secretForIndex(index: number): `0x${string}` | null {
  if (keeper.legacySecrets) {
    try {
      const map = JSON.parse(keeper.legacySecrets) as Record<string, string>;
      const legacy = map[String(index)];
      if (legacy) return legacy as `0x${string}`;
    } catch {
      // A malformed map must not mask a derivable secret.
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

type Action = {
  roundId: number;
  action: string;
  txHash?: string;
  skipped?: string;
};

export async function GET(request: Request) {
  // Vercel Cron presents the secret as a bearer token. Reject anything else so
  // this cannot be triggered by a stranger to drain the keeper's gas.
  const auth = request.headers.get("authorization");
  if (!keeper.cronSecret || auth !== `Bearer ${keeper.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  if (!keeper.privateKey || !contracts.gacha) {
    return NextResponse.json(
      { error: "keeper not configured", configured: false },
      { status: 503 },
    );
  }

  const gacha = contracts.gacha as Address;
  const client = publicClient();
  const account = privateKeyToAccount(keeper.privateKey as `0x${string}`);
  const wallet = createWalletClient({
    account,
    chain: robinhoodChain,
    // Resolved the same way publicClient does, rather than read off the
    // transport, which is not guaranteed to expose a url.
    transport: http(rpc.robinhood ?? chainConfig.rpcUrl, { retryCount: 2, timeout: 12_000 }),
  });

  const actions: Action[] = [];

  /**
   * Simulate, then send. The simulation is the guard: round state can change
   * between the read below and this call, and a revert here would be a wasted
   * fee rather than a caught condition.
   */
  async function attempt(
    roundId: number,
    action: string,
    functionName: "closeRound" | "requestRoundRandomness" | "markRoundRefundable",
    args: readonly unknown[],
  ) {
    try {
      const { request: sim } = await client.simulateContract({
        address: gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName,
        args: args as never,
        account,
      });
      const txHash = await wallet.writeContract(sim);
      actions.push({ roundId, action, txHash });
    } catch (error) {
      actions.push({
        roundId,
        action,
        skipped: error instanceof Error ? error.message.split("\n")[0] : "reverted",
      });
    }
  }

  try {
    const randomnessSender = contracts.randomnessSender as Address;

    if (randomnessSender) {
      try {
        const available = Number(
          await client.readContract({
            address: randomnessSender,
            abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
            functionName: "availableCommitments",
          }),
        );

        if (available < 10) {
          const nextUnused = Number(
            await client.readContract({
              address: randomnessSender,
              abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
              functionName: "nextUnused",
            }),
          );
          const startIndex = available + nextUnused;
          const count = 50;

          // Derive first. If a secret cannot be produced, nothing is posted —
          // posting a commitment we cannot later reveal is strictly worse than
          // running the queue dry, which merely stalls spins.
          const newHashes: `0x${string}`[] = [];
          for (let i = 0; i < count; i += 1) {
            const secret = secretForIndex(startIndex + i);
            if (!secret) {
              throw new Error("KEEPER_COMMITMENT_SEED is not set — refusing to post unrevealable commitments");
            }
            newHashes.push(keccak256(encodeAbiParameters([{ type: "bytes32" }], [secret])));
          }

          const { request: postSim } = await client.simulateContract({
            address: randomnessSender,
            abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
            functionName: "postCommitments",
            args: [newHashes],
            account,
          });
          const txHash = await wallet.writeContract(postSim);
          actions.push({ roundId: 0, action: `postCommitments:${count}`, txHash });
        }
      } catch (err) {
        actions.push({
          roundId: 0,
          action: "postCommitments",
          skipped: err instanceof Error ? err.message.split("\n")[0] : "failed",
        });
      }
    }

    const nextRoundId = (await client.readContract({
      address: gacha,
      abi: ROBACHA_GACHA_ABI,
      functionName: "nextRoundId",
    })) as bigint;

    const from = nextRoundId > SCAN_DEPTH ? nextRoundId - SCAN_DEPTH : 1n;
    const now = BigInt(Math.floor(Date.now() / 1000));

    const timeout = (await client.readContract({
      address: gacha,
      abi: ROBACHA_GACHA_ABI,
      functionName: "randomnessTimeout",
    })) as number;

    for (let id = from; id < nextRoundId; id += 1n) {
      const round = (await client.readContract({
        address: gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "getRound",
        args: [id],
      })) as {
        state: number;
        entryCount: number;
        settledCount: number;
        closesAt: bigint;
        closedAt: bigint;
      };

      const roundId = Number(id);
      const state = Number(round.state);

      // Terminal states need nothing.
      if (
        state === State.None ||
        state === State.Settled ||
        state === State.Cancelled ||
        state === State.Refundable
      ) {
        continue;
      }

      // 1. An open round whose window has elapsed can be closed by anyone.
      if (state === State.Open && now >= round.closesAt && round.entryCount > 0) {
        await attempt(roundId, "closeRound", "closeRound", [id]);
        continue; // Request randomness on the next tick, once Closed is final.
      }

      // 2. A closed round needs its random word requested.
      if (state === State.Closed && round.entryCount > 0) {
        await attempt(
          roundId,
          "requestRoundRandomness",
          "requestRoundRandomness",
          [id],
        );
        continue;
      }

      // 2.5. A round in RandomnessRequested state needs to be revealed if using CommitReveal.
      if (state === State.RandomnessRequested && randomnessSender) {
        try {
          const pending = (await client.readContract({
            address: randomnessSender,
            abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
            functionName: "pending",
            args: [id],
          })) as readonly [`0x${string}`, bigint, bigint, boolean, boolean];

          const [requestId, commitmentIndex, , revealed, missed] = pending;

          if (
            requestId !== "0x0000000000000000000000000000000000000000000000000000000000000000" &&
            !revealed &&
            !missed
          ) {
            const secret = secretForIndex(Number(commitmentIndex));
            if (secret) {
              const { request: revealSim } = await client.simulateContract({
                address: randomnessSender,
                abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
                functionName: "reveal",
                args: [id, secret],
                account,
              });
              const txHash = await wallet.writeContract(revealSim);
              actions.push({ roundId, action: "reveal", txHash });
              continue;
            } else {
              actions.push({
                roundId,
                action: "reveal",
                skipped: `No secret derivable for commitment index ${commitmentIndex}`,
              });
            }
          }
        } catch (error) {
          actions.push({
            roundId,
            action: "reveal",
            skipped: error instanceof Error ? error.message.split("\n")[0] : "reverted",
          });
        }
      }

      // 3. The word arrived — pay everyone out, in batches.
      if (state === State.RandomnessReceived) {
        try {
          const { request: sim } = await client.simulateContract({
            address: gacha,
            abi: ROBACHA_GACHA_ABI,
            functionName: "settleEntries",
            args: [id, SETTLE_BATCH],
            account,
          });
          const txHash = await wallet.writeContract(sim);
          actions.push({ roundId, action: "settleEntries", txHash });
        } catch (error) {
          actions.push({
            roundId,
            action: "settleEntries",
            skipped:
              error instanceof Error ? error.message.split("\n")[0] : "reverted",
          });
        }
        continue;
      }

      // 4. Randomness never came back. Past the timeout, open the refund path
      //    so people can take their money out rather than waiting on us.
      const awaitingRandomness =
        state === State.RandomnessRequested ||
        state === State.CrossChainPending ||
        state === State.VRFPending ||
        state === State.ResultReturning;

      if (awaitingRandomness && round.closedAt > 0n) {
        const refundableAt = round.closedAt + BigInt(timeout);
        if (now >= refundableAt) {
          await attempt(
            roundId,
            "markRoundRefundable",
            "markRoundRefundable",
            [id],
          );
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        keeper: account.address,
        scannedFrom: Number(from),
        scannedTo: Number(nextRoundId) - 1,
        actions,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        // The key must never reach a response body or a log line.
        error: error instanceof Error ? error.message : "keeper failed",
        actions,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
