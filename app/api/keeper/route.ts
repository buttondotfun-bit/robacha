import { NextResponse } from "next/server";
import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ROBACHA_GACHA_ABI } from "@/lib/abi/robacha-gacha";
import { ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI } from "@/lib/abi/robacha-commit-reveal-randomness";
import { keccak256, encodeAbiParameters } from "viem";
import { chainConfig, contracts } from "@/lib/config";
import { keeper, rpc } from "@/lib/env/server";
import { publicClient, robinhoodChain } from "@/lib/server/chain";
import { activeRandomnessAdapter } from "@/lib/server/randomness-adapter";
import { sweepEntropyFloat } from "@/lib/server/entropy-float";
import { restockVault } from "@/lib/server/restock";
import { buybackAndBurnRob } from "@/lib/server/rob-burn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Seconds this route may run for.
 *
 * Undeclared, it takes the platform default of ten. Every action here waits
 * for its receipt before starting the next, so four transactions routinely ran
 * past that and the run was killed partway — which is why round timings came
 * out anywhere between four seconds and sixteen minutes with no pattern. The
 * work was never the slow part; the function was being cut off.
 *
 * Sixty is the ceiling this plan allows. Worth remembering the cron lesson
 * here: exceeding a plan limit in configuration does not degrade gracefully.
 */
export const maxDuration = 60;

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
 * WHERE THE CADENCE COMES FROM
 *
 * cron-job.org calls this every minute. That is the real schedule, and it has
 * to be roughly that fast: a round becomes refundable 7200s after it closes,
 * and a keeper that ticks slower than that hands people refunds instead of
 * rewards.
 *
 * `vercel.json` also has a cron here, set to daily, and it must stay daily.
 * This account is on Hobby, which allows one cron run per day, and Vercel does
 * not clamp a faster schedule or warn about it — it refuses to create the
 * deployment at all, with `cron_jobs_limits_reached`. Setting it to every
 * minute once blocked four commits from ever being built while the deployment
 * list showed twenty consecutive successes, so production quietly served an
 * older commit for hours. Hourly fails the same way; daily is the only
 * schedule this plan accepts.
 *
 * So the Vercel entry is a backstop rather than the mechanism: if the external
 * job dies, a round still eventually gets closed and settled rather than
 * sitting Open forever — and an Open round cannot time out and refund on its
 * own, so nothing else would rescue it.
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
 * Actions attempted per invocation.
 *
 * A round needs three of these to go from paid to paid-out: close, request,
 * settle. At four per tick the keeper could fully advance barely one round a
 * minute, so any burst queued behind itself — five spins in a minute took four
 * minutes to clear, and players read that as the machine being slow when it
 * was the keeper being rationed.
 *
 * Twelve is four rounds a tick, comfortably ahead of observed arrival rate,
 * and it fits the sixty seconds declared above with room for slow receipts.
 * Stopping early is still safe: the run is idempotent and the next tick
 * resumes from whatever is outstanding.
 */
const MAX_ACTIONS_PER_RUN = 12;

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

  /**
   * Validate the key's SHAPE before viem sees it.
   *
   * `privateKeyToAccount` throws on anything malformed, and it used to run
   * outside the try below — so a key pasted without its `0x`, or with a stray
   * newline from a dashboard field, produced a bare 500 with no clue what was
   * wrong. That is a miserable thing to debug from a CI log.
   *
   * Only the shape is checked and only the shape is reported. The key itself
   * is never echoed, logged, or included in a response.
   */
  const rawKey = keeper.privateKey.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
    const hint = rawKey.startsWith("0x")
      ? `expected 64 hex characters after 0x, got ${rawKey.length - 2}`
      : "missing the 0x prefix";
    return NextResponse.json(
      { ok: false, error: `KEEPER_PRIVATE_KEY is malformed: ${hint}` },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (keeper.commitmentSeed && !/^0x[0-9a-fA-F]{64}$/.test(keeper.commitmentSeed.trim())) {
    return NextResponse.json(
      { ok: false, error: "KEEPER_COMMITMENT_SEED is malformed: expected 0x followed by 64 hex characters" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const account = privateKeyToAccount(rawKey as `0x${string}`);
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
      // Wait for it to land. Without this the next simulate/send reuses the
      // same nonce, so only one transaction per invocation ever survives —
      // which is why six ready rounds advanced one at a time.
      await client.waitForTransactionReceipt({ hash: txHash });
      actions.push({ roundId, action, txHash });
    } catch (error) {
      actions.push({
        roundId,
        action,
        skipped: error instanceof Error ? error.message.split("\n")[0] : "reverted",
      });
    }
  }

  /** Simulate, send, wait — shared with the restock and buyback steps. */
  async function sendOnce(
    label: string,
    params: {
      address: Address;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
      // Native ETH to attach. Only the buyback swap uses it; every other
      // caller omits it and pays nothing, exactly as before.
      value?: bigint;
    },
  ): Promise<`0x${string}` | null> {
    try {
      const { request: sim } = await client.simulateContract({
        address: params.address,
        abi: params.abi as never,
        functionName: params.functionName as never,
        args: params.args as never,
        value: params.value,
        account,
      });
      const hash = await wallet.writeContract(sim);
      await client.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      actions.push({
        roundId: 0,
        action: label,
        skipped: error instanceof Error ? error.message.split("\n")[0] : "reverted",
      });
      return null;
    }
  }

  try {
    // The gacha names the adapter; configuration has been stale before, and a
    // write aimed at a retired contract is a transaction to the wrong address.
    // See `activeRandomnessAdapter`.
    const randomnessSender = await activeRandomnessAdapter(client);

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
          await client.waitForTransactionReceipt({ hash: txHash });
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
      if (actions.filter((a) => a.txHash).length >= MAX_ACTIONS_PER_RUN) break;
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
              await client.waitForTransactionReceipt({ hash: txHash });
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
          await client.waitForTransactionReceipt({ hash: txHash });
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

    // Carry the surcharge across into the entropy float. Runs before the
    // restock because a thin float stops spins being sold at all, whereas a
    // thin vault only stops one token's prize — and both are paid for out of
    // money already earned rather than topped up by hand.
    try {
      const swept = await sweepEntropyFloat(client, account, sendOnce);
      for (const r of swept) {
        actions.push({ roundId: 0, action: r.action, txHash: r.txHash, skipped: r.skipped });
      }
    } catch (error) {
      actions.push({
        roundId: 0,
        action: "sweepEntropyFloat",
        skipped: error instanceof Error ? error.message.split("\n")[0] : "failed",
      });
    }

    // Turn the accrued reward reserve back into prizes. Runs last so
    // settling paid rounds always gets the run's budget first.
    try {
      const restock = await restockVault(client, account, sendOnce);
      for (const r of restock) {
        actions.push({ roundId: 0, action: r.action, txHash: r.txHash, skipped: r.skipped });
      }
    } catch (error) {
      actions.push({
        roundId: 0,
        action: "restock",
        skipped: error instanceof Error ? error.message.split("\n")[0] : "failed",
      });
    }

    // Buy back and burn ROB from protocol margin — dead last, after prizes and
    // the entropy float, because those are obligations and this is a choice.
    // It self-gates on accrued margin and a keeper gas floor, so at low volume
    // it does nothing at all. See `buybackAndBurnRob`.
    try {
      const burned = await buybackAndBurnRob(client, account, sendOnce);
      for (const r of burned) {
        actions.push({ roundId: 0, action: r.action, txHash: r.txHash, skipped: r.skipped });
      }
    } catch (error) {
      actions.push({
        roundId: 0,
        action: "buybackAndBurn",
        skipped: error instanceof Error ? error.message.split("\n")[0] : "failed",
      });
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
