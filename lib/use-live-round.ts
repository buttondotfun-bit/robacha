"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { ACTIVE_POOL_ID, chainConfig, contracts, isGachaConfigured } from "./config";
import { RoundState } from "./use-pending-spins";
import { useSecondsTick } from "./use-tick";

/**
 * The round currently taking entries, for anyone — connected or not.
 *
 * This exists because "Closes in" used to read the pool version's `endTime`,
 * which is the date the whole machine retires, not a round timer. That field is
 * 0 for an open-ended pool, so the countdown never rendered at all, and where it
 * did render it printed "Open-ended" under a label that said "Closes in". The
 * question people actually have before spinning is how long the current batch
 * has left, and this answers that one.
 *
 * `openRound` resolves the live version itself and returns 0 when no round is
 * taking entries. The gacha clears `openRoundOf` the moment a round closes, so
 * a non-zero id here is genuinely open rather than a stale pointer — but the
 * state is checked anyway, because a round stays Open past its own deadline
 * until somebody calls `closeRound`.
 */

/** Rounds are short. Poll faster than the rest of the pool state. */
const REFETCH_MS = 5_000;

export type LiveRoundStatus =
  /** Nothing is taking entries. The next spin opens a round. */
  | "none"
  /** Taking entries, with time on the clock. */
  | "open"
  /** Past its deadline, waiting for someone to close it. */
  | "closing"
  /** Not enough is configured to say anything truthful. */
  | "unknown";

export interface LiveRound {
  status: LiveRoundStatus;
  roundId: number | null;
  /** Entries taken so far. Null until the round is known. */
  entryCount: number | null;
  /** Milliseconds until the deadline. 0 once it has passed. */
  msLeft: number | null;
}

export function useLiveRound(): LiveRound {
  // contracts.gacha is null when unset; wagmi wants undefined.
  const gacha = contracts.gacha ?? undefined;
  const enabled = Boolean(gacha) && isGachaConfigured;

  const openQuery = useReadContract({
    address: gacha,
    abi: ROBACHA_GACHA_ABI,
    functionName: "openRound",
    args: [ACTIVE_POOL_ID],
    chainId: chainConfig.id,
    query: { enabled, refetchInterval: REFETCH_MS },
  });

  const roundId = openQuery.data ? Number(openQuery.data as bigint) : 0;
  const hasRound = roundId > 0;

  const roundQuery = useReadContract({
    address: gacha,
    abi: ROBACHA_GACHA_ABI,
    functionName: "getRound",
    args: [BigInt(roundId)],
    chainId: chainConfig.id,
    query: { enabled: enabled && hasRound, refetchInterval: REFETCH_MS },
  });

  // Shared with every other countdown on the page, so the pool bar's clock and
  // the machine's ring can never sit on different seconds. See `useSecondsTick`.
  const now = useSecondsTick();

  return useMemo<LiveRound>(() => {
    if (!enabled) return { status: "unknown", roundId: null, entryCount: null, msLeft: null };
    if (!openQuery.isSuccess) {
      return { status: "unknown", roundId: null, entryCount: null, msLeft: null };
    }
    if (!hasRound) return { status: "none", roundId: null, entryCount: null, msLeft: null };

    const round = roundQuery.data as
      | { state: number; closesAt: bigint; entryCount: number }
      | undefined;
    if (!round) return { status: "unknown", roundId, entryCount: null, msLeft: null };

    // openRoundOf is cleared on close, so this should not happen — but a read
    // that lands mid-transition should say nothing rather than guess.
    if (Number(round.state) !== RoundState.Open) {
      return { status: "none", roundId: null, entryCount: null, msLeft: null };
    }

    const msLeft = Math.max(0, Number(round.closesAt) * 1000 - now);
    return {
      status: msLeft > 0 ? "open" : "closing",
      roundId,
      entryCount: Number(round.entryCount),
      msLeft,
    };
  }, [enabled, openQuery.isSuccess, hasRound, roundQuery.data, roundId, now]);
}

/** "1:40", "0:07" — a clock, not prose. Rounds are too short for "2 minutes". */
export function formatRoundClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
