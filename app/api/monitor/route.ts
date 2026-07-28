import { NextResponse } from "next/server";
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

/** Reveals consume commitments; running out halts every round. */
const MIN_COMMITMENTS = 10;

/** Rounds to look back over. Cheap, and far more than a stall would need. */
const ROUND_SCAN = 25;

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
      if (age > STUCK_ROUND_SECONDS) {
        stuck.push(`#${id} ${STATE_NAME[state] ?? state} for ${Math.floor(age / 60)}m`);
      }
    }

    facts.newestRound = newest;
    facts.refundsOwedWei = refundsOwed.toString();

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

  // ---- 3. Randomness: commitments left, and any reveal missed ----
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
  } catch (error) {
    failed.push(`randomness: ${error instanceof Error ? error.message : "read failed"}`);
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
