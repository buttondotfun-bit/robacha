import { NextResponse } from "next/server";
import { encodeAbiParameters, keccak256, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
  ROBACHA_GACHA_ABI,
  ROBACHA_POOL_REGISTRY_ABI,
} from "@/lib/abi";
import { ACTIVE_POOL_ID, contracts } from "@/lib/config";
import { keeper } from "@/lib/env/server";
import { publicClient } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Things that need a human, and nothing else.
 *
 * `/api/health` answers "is the site up", which is a different question and is
 * answered honestly by a deployment that is serving pages while rounds quietly
 * pile up unsettled. Nothing was watching for that: the last stall was found by
 * trying to spin and noticing it did not work. Every check here is a condition
 * where someone's money is stuck or about to be, so an empty `alerts` array is
 * the only good result.
 *
 * Public on purpose. Every value returned is already readable on chain by
 * anyone — balances, round states, contract counters. The keeper's address is
 * derived from its key so the balance can be checked, but only the address is
 * ever returned, and the key is never logged or echoed.
 */

/** Below this the keeper cannot reliably pay for a settle. */
const KEEPER_MIN_GAS_WEI = 2_000_000_000_000_000n; // 0.002 ETH

/** A round past this age in a non-terminal state is not progressing on its own. */
const STUCK_ROUND_SECONDS = 15 * 60;

/**
 * How long an Open round may sit past its own close time.
 *
 * Tighter than `STUCK_ROUND_SECONDS`, because the two say different things. A
 * round that has closed and is waiting on randomness is mid-cycle: a request
 * and a reveal both have to land, and minutes of that are ordinary. A round
 * still Open past its deadline is waiting on `closeRound`, which is one cheap
 * permissionless call with nothing to wait for — so a few minutes of it means
 * the keeper is not running at all, and folding that into a fifteen minute
 * threshold delays the loudest signal there is.
 *
 * Rounds are 120 seconds, so three minutes is comfortably past anything
 * normal without alerting on a slow block or a keeper tick that just missed.
 *
 * There is a second reason to be quick. `markRoundRefundable` only accepts
 * rounds that have closed, so an Open round cannot time out and refund the way
 * every other stall eventually does. It sits, holding money, until somebody
 * calls `closeRound`. Nothing about it self-heals.
 */
const OPEN_OVERDUE_SECONDS = 3 * 60;

/** Reveals consume commitments; running out halts every round. */
const MIN_COMMITMENTS = 10;

/** Rounds to look back over. Cheap, and far more than a stall would need. */
const ROUND_SCAN = 25;

/** A refund for a failed draw is worth shouting about for this long. */
const REFUND_ALERT_WINDOW_SECONDS = 48 * 3600;

/**
 * How far back to scan for refund events.
 *
 * Blocks are about 0.10s here, so 48h is roughly 1.7m of them; this is a
 * generous multiple of that, and still a fraction of the chain. The timestamp
 * filter below is what actually decides the window — this only keeps the query
 * answerable.
 */
const REFUND_SCAN_BLOCKS = 2_500_000n;

/**
 * The StonkPit entropy adapter's surface, and the conductor's.
 *
 * Only what this file reads. The adapter is detected rather than configured:
 * `randomnessSender` is one env var pointing at whichever source is wired, and
 * the two implementations answer entirely different questions. Asking the
 * wrong one does not degrade — it reverts, which took the whole randomness
 * block down and with it the commitment, missed-reveal and keeper-secret
 * checks, silently, from the moment the source was switched.
 */
const ENTROPY_ADAPTER_ABI = [
  { type: "function", name: "conductor", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "runwayRounds", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "isReady", stateMutability: "view", inputs: [],
    outputs: [{ type: "bool" }, { type: "string" }],
  },
] as const;

const CONDUCTOR_ABI = [
  { type: "function", name: "liveTapeCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

/** Below this many rounds of runway the machine is close to closing itself. */
const MIN_ENTROPY_RUNWAY = 8;

const ROUND_REFUNDABLE = parseAbiItem(
  "event RoundRefundable(uint256 indexed roundId, string reason)",
);

/**
 * The secret the keeper would use for a commitment, derived exactly as the
 * keeper derives it.
 *
 * Kept byte-identical to the settle route's copy on purpose: a check that
 * computes the secret differently from the code doing the revealing would
 * report healthy while reveals fail, which is the failure this exists to catch.
 * The return value is never logged, returned or put in a message — only whether
 * its hash matched.
 */
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

const State = {
  None: 0, Open: 1, Closed: 2, RandomnessRequested: 3, CrossChainPending: 4,
  VRFPending: 5, ResultReturning: 6, RandomnessReceived: 7, Settled: 8,
  Failed: 9, Refundable: 10, Cancelled: 11,
} as const;

const STATE_NAME = Object.fromEntries(
  Object.entries(State).map(([name, value]) => [value, name]),
) as Record<number, string>;

/**
 * A round in one of these is finished as far as the keeper is concerned.
 *
 * Refundable belongs here even though it is not a success: the keeper cannot
 * advance it, only the entrants can, by withdrawing. Whether money is still
 * owed is tracked separately by escrow — flagging these as "stuck" produced a
 * standing alert for two fully-refunded rounds that nobody could ever clear,
 * which is the fastest way to teach someone to ignore the alert.
 */
const TERMINAL = new Set<number>([
  State.None,
  State.Settled,
  State.Cancelled,
  State.Refundable,
]);

type Severity = "critical" | "warning";
interface Alert {
  check: string;
  severity: Severity;
  detail: string;
}

export async function GET() {
  const started = Date.now();
  const alerts: Alert[] = [];
  const facts: Record<string, unknown> = {};
  const failed: string[] = [];

  if (!contracts.gacha || !contracts.randomnessSender || !contracts.poolRegistry) {
    return NextResponse.json(
      { status: "unknown", reason: "contracts not configured", alerts: [], checkedAt: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const gacha = contracts.gacha;
  const randomness = contracts.randomnessSender;
  const registry = contracts.poolRegistry;
  const client = publicClient();
  const nowSeconds = Math.floor(Date.now() / 1000);

  // ---- 1. Can the keeper still pay for its own transactions? ----
  //
  // Derived rather than configured: a KEEPER_ADDRESS env var can drift from the
  // key actually signing, and then this would watch the wrong wallet.
  const rawKey = keeper.privateKey?.trim();
  if (!rawKey || !/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
    alerts.push({
      check: "keeperKey",
      severity: "critical",
      detail: "KEEPER_PRIVATE_KEY is missing or malformed — no round can be settled",
    });
  } else {
    try {
      const address = privateKeyToAccount(rawKey as `0x${string}`).address;
      const balance = await client.getBalance({ address });
      facts.keeperAddress = address;
      facts.keeperBalanceWei = balance.toString();
      if (balance < KEEPER_MIN_GAS_WEI) {
        alerts.push({
          check: "keeperGas",
          severity: "critical",
          detail: `keeper ${address} holds ${balance} wei, below ${KEEPER_MIN_GAS_WEI} — top it up or rounds stop settling`,
        });
      }
    } catch (error) {
      failed.push(`keeperGas: ${error instanceof Error ? error.message : "read failed"}`);
    }
  }

  // ---- 2. Is any round stuck partway through? ----
  //
  // This is the one that actually bites. A round that closed but never settled
  // holds real money and looks like nothing at all from the outside.
  try {
    const nextRoundId = (await client.readContract({
      address: gacha,
      abi: ROBACHA_GACHA_ABI,
      functionName: "nextRoundId",
    })) as bigint;

    const newest = Number(nextRoundId) - 1;
    const oldest = Math.max(1, newest - ROUND_SCAN + 1);
    const stuck: string[] = [];
    const notClosing: string[] = [];
    let refundsOwed = 0n;

    const ids = Array.from({ length: newest - oldest + 1 }, (_, i) => oldest + i);
    const rounds = (await Promise.all(
      ids.map((id) =>
        client.readContract({
          address: gacha,
          abi: ROBACHA_GACHA_ABI,
          functionName: "getRound",
          args: [BigInt(id)],
        }),
      ),
    )) as { state: number; closesAt: bigint; entryCount: number; escrowWei: bigint }[];

    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      const round = rounds[i];

      const state = Number(round.state);
      if (Number(round.entryCount) === 0) continue;

      // Counted before the terminal check: a refundable round is finished for
      // the keeper but may still owe people money.
      if (state === State.Refundable) refundsOwed += round.escrowWei;
      if (TERMINAL.has(state)) continue;

      // An Open round inside its own window is doing exactly what it should.
      const deadline = Number(round.closesAt);
      const age = nowSeconds - deadline;
      if (state === State.Open && age <= 0) continue;

      // Reported separately and sooner: still Open past its deadline means
      // nobody is calling `closeRound`, which is the single clearest sign the
      // keeper is down, and the one stall that cannot resolve itself.
      if (state === State.Open && age > OPEN_OVERDUE_SECONDS) {
        notClosing.push(`#${id} open ${Math.floor(age / 60)}m past close`);
        continue;
      }

      if (age > STUCK_ROUND_SECONDS) {
        stuck.push(`#${id} ${STATE_NAME[state] ?? state} for ${Math.floor(age / 60)}m`);
      }
    }

    facts.newestRound = newest;
    facts.refundsOwedWei = refundsOwed.toString();

    if (notClosing.length > 0) {
      alerts.push({
        check: "roundsNotClosing",
        severity: "critical",
        detail:
          `${notClosing.join(", ")} — nobody is calling closeRound, so the keeper is almost certainly down. ` +
          `These cannot time out and refund on their own: markRoundRefundable will not accept an Open round.`,
      });
    }
    if (stuck.length > 0) {
      alerts.push({
        check: "stuckRounds",
        severity: "critical",
        detail: `not progressing: ${stuck.join(", ")} — the keeper is not advancing them`,
      });
    }
    if (refundsOwed > 0n) {
      alerts.push({
        check: "refundsOwed",
        severity: "warning",
        detail: `${refundsOwed} wei is refundable and unwithdrawn — people are owed money they may not know about`,
      });
    }
  } catch (error) {
    failed.push(`stuckRounds: ${error instanceof Error ? error.message : "read failed"}`);
  }

  // ---- 3. Randomness ----
  //
  // Which source is wired decides what is worth asking. Under commit-reveal the
  // risks are running out of commitments and failing to reveal; under bought
  // entropy neither exists — there is nothing to reveal and no commitment
  // queue — and the risk moves to the float that pays for words and to whether
  // the mining floor is alive at all.
  const entropyConductor = await client
    .readContract({ address: randomness, abi: ENTROPY_ADAPTER_ABI, functionName: "conductor" })
    .catch(() => null);

  if (entropyConductor) {
    facts.randomnessSource = "stonkpit";
    facts.entropyConductor = entropyConductor;
    try {
      const [runway, ready, floatWei, tapes] = await Promise.all([
        client.readContract({ address: randomness, abi: ENTROPY_ADAPTER_ABI, functionName: "runwayRounds" }) as Promise<bigint>,
        client.readContract({ address: randomness, abi: ENTROPY_ADAPTER_ABI, functionName: "isReady" }) as Promise<readonly [boolean, string]>,
        client.getBalance({ address: randomness }),
        client.readContract({ address: entropyConductor as `0x${string}`, abi: CONDUCTOR_ABI, functionName: "liveTapeCount" }).catch(() => null) as Promise<bigint | null>,
      ]);

      facts.entropyRunwayRounds = Number(runway);
      facts.entropyFloatWei = floatWei.toString();
      facts.entropyReady = ready[0];
      if (tapes !== null) facts.liveTapeCount = Number(tapes);

      // Not ready means the gacha refuses to sell spins. That is the correct
      // behaviour and also an outage, so it is the loudest thing here.
      if (!ready[0]) {
        alerts.push({
          check: "entropyNotReady",
          severity: "critical",
          detail:
            `the entropy adapter reports not ready — "${ready[1]}". The gacha will refuse to sell ` +
            "spins until this clears, so the machine is closed to new players.",
        });
      } else if (runway < BigInt(MIN_ENTROPY_RUNWAY)) {
        alerts.push({
          check: "entropyRunway",
          severity: "warning",
          detail:
            `${runway} rounds of entropy runway left at the fee ceiling, below ${MIN_ENTROPY_RUNWAY}. ` +
            "Sweep the randomness treasury into the adapter before it closes the machine on its own.",
        });
      }

      if (tapes !== null && tapes === 0n) {
        alerts.push({
          check: "quietFloor",
          severity: "critical",
          detail: "the entropy conductor reports no live mining tapes — requests will revert and rounds cannot draw",
        });
      }
    } catch (error) {
      failed.push(`entropy: ${error instanceof Error ? error.message : "read failed"}`);
    }
  } else
  try {
    const [available, missed] = (await Promise.all([
      client.readContract({
        address: randomness,
        abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
        functionName: "availableCommitments",
      }),
      client.readContract({
        address: randomness,
        abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
        functionName: "totalMissed",
      }),
    ])) as [bigint, bigint];

    facts.availableCommitments = Number(available);
    facts.totalMissed = Number(missed);

    if (available === 0n) {
      alerts.push({
        check: "commitments",
        severity: "critical",
        detail: "no commitments left — no round can draw a number until more are posted",
      });
    } else if (Number(available) < MIN_COMMITMENTS) {
      alerts.push({
        check: "commitments",
        severity: "warning",
        detail: `${available} commitments left, below ${MIN_COMMITMENTS} — post more before they run out`,
      });
    }

    if (missed > 0n) {
      alerts.push({
        check: "missedReveals",
        severity: "critical",
        detail: `${missed} reveal(s) missed and slashed — rounds were cancelled and this is publicly counted`,
      });
    }

    // ---- Can the keeper actually reveal, or is it only configured? ----
    //
    // Presence and shape of the env vars was all that was checked before, and
    // that reported healthy while four consecutive rounds refunded for a draw
    // that never arrived. Closing and requesting are permissionless so they
    // kept working; reveal is the only step needing the secret, and it was the
    // only one failing. A configuration check cannot tell those apart.
    //
    // So this does the real thing: take the next commitment the keeper will be
    // asked to open, produce the secret the way the keeper would, and hash it
    // against what is stored on chain. A truncated secrets map fails here
    // immediately rather than silently falling through to a derivation that
    // yields the wrong secret for a legacy commitment.
    try {
      const nextUnused = (await client.readContract({
        address: randomness,
        abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
        functionName: "nextUnused",
      })) as bigint;

      const commitment = (await client.readContract({
        address: randomness,
        abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
        functionName: "commitments",
        args: [nextUnused],
      })) as readonly [`0x${string}`, bigint, boolean];

      const secret = secretForIndex(Number(nextUnused));
      const matches = secret !== null && keccak256(secret) === commitment[0];

      facts.nextCommitmentIndex = Number(nextUnused);
      facts.keeperCanReveal = matches;

      if (!matches) {
        alerts.push({
          check: "keeperCannotReveal",
          severity: "critical",
          detail:
            `the keeper cannot produce the secret for commitment #${nextUnused} — ` +
            "its hash does not match the one posted on chain, so every reveal will fail " +
            "and rounds will refund on timeout. Check KEEPER_LEGACY_SECRETS and " +
            "KEEPER_COMMITMENT_SEED in the deployment environment",
        });
      }
    } catch (error) {
      failed.push(`keeperCanReveal: ${error instanceof Error ? error.message : "read failed"}`);
    }
  } catch (error) {
    failed.push(`randomness: ${error instanceof Error ? error.message : "read failed"}`);
  }

  // ---- Rounds that refunded instead of paying ----
  //
  // These never showed as stuck: a refundable round is finished as far as the
  // keeper is concerned, and once entrants withdraw its escrow is zero. That is
  // exactly how four in a row went unreported while the monitor said ok. A
  // refund for a failed draw is a failure whether or not anyone is still owed.
  try {
    const head = await client.getBlockNumber();
    const logs = await client.getLogs({
      address: gacha,
      event: ROUND_REFUNDABLE,
      // Bounded to the window we actually alert on. This scanned from block 0,
      // which worked when the chain was young and now simply dies: nearly 30m
      // blocks is past what the node will answer, and the failure surfaced as
      // "missing or invalid parameters" rather than anything about size. The
      // alert only ever looks 48h back, so the extra 29m blocks were never
      // read for a reason.
      fromBlock: head > REFUND_SCAN_BLOCKS ? head - REFUND_SCAN_BLOCKS : 0n,
      toBlock: head,
    });

    const recent: string[] = [];
    for (const log of logs.slice(-12)) {
      if (!log.blockNumber) continue;
      const block = await client.getBlock({ blockNumber: log.blockNumber });
      if (nowSeconds - Number(block.timestamp) > REFUND_ALERT_WINDOW_SECONDS) continue;
      const args = log.args as { roundId?: bigint; reason?: string };
      recent.push(`#${args.roundId} (${args.reason ?? "unknown"})`);
    }

    facts.refundedRoundsLast48h = recent.length;

    if (recent.length > 0) {
      alerts.push({
        check: "roundsRefunded",
        severity: "critical",
        detail:
          `${recent.length} round(s) refunded in the last 48h instead of paying out: ` +
          `${recent.join(", ")} — people paid to spin and got their money back rather than a prize`,
      });
    }
  } catch (error) {
    failed.push(`roundsRefunded: ${error instanceof Error ? error.message : "read failed"}`);
  }

  // ---- 4. Can the live pool still pay every prize it advertises? ----
  //
  // An insolvent pool keeps taking spins and refunds the tier it cannot cover,
  // which is exactly how 4663 sat broken across 30 paid spins without anyone
  // noticing. It is silent from the outside, so it has to be watched.
  try {
    const version = (await client.readContract({
      address: registry,
      abi: ROBACHA_POOL_REGISTRY_ABI,
      functionName: "activeVersion",
      args: [ACTIVE_POOL_ID],
    })) as bigint;

    facts.activeVersion = Number(version);

    if (version === 0n) {
      alerts.push({
        check: "activePool",
        severity: "critical",
        detail: "no active pool version — nobody can spin",
      });
    } else {
      const readiness = (await client.readContract({
        address: registry,
        abi: ROBACHA_POOL_REGISTRY_ABI,
        functionName: "activationReadiness",
        args: [ACTIVE_POOL_ID, version],
      })) as readonly [boolean, boolean, boolean, boolean, boolean, string];

      const solvent = readiness[4];
      facts.inventorySolvent = solvent;
      if (!solvent) {
        alerts.push({
          check: "vaultSolvency",
          severity: "critical",
          detail: `vault cannot cover every prize; first unfunded token ${readiness[5]} — that tier refunds instead of paying`,
        });
      }
    }
  } catch (error) {
    failed.push(`vaultSolvency: ${error instanceof Error ? error.message : "read failed"}`);
  }

  // A check that could not run is not a check that passed.
  for (const detail of failed) {
    alerts.push({ check: "readFailed", severity: "warning", detail });
  }

  const critical = alerts.some((a) => a.severity === "critical");

  return NextResponse.json(
    {
      status: alerts.length === 0 ? "ok" : critical ? "critical" : "warning",
      alerts,
      facts,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
