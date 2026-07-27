"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { ROBACHA_GACHA_ABI } from "@/lib/abi/robacha-gacha";
import { contracts } from "@/lib/config";

/**
 * Spins this wallet has paid for that have not finished yet.
 *
 * The spin store only knows about a spin for as long as the tab stays open, so
 * a reload used to leave someone staring at a fresh spin button with no sign
 * that their money was already in a round. That is the worst thing this
 * interface can do: it reads as "nothing happened, pay again".
 *
 * Note on the read: `entriesByWallet` looks like the obvious source and is
 * not — it is keyed by pool *version*, not round, and counts a wallet's
 * lifetime entries against the per-wallet cap. Reading it per round returns
 * zero for wallets that plainly have entries. The authoritative per-round
 * record is `getEntry(roundId, index).user`, so that is what this walks.
 */

/** Mirrors `RoundState` in RobachaGacha.sol. */
export const RoundState = {
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

export interface PendingSpin {
  roundId: number;
  entries: number;
  state: number;
  label: string;
  detail: string;
  closesAt: number | null;
  refundableAt: number | null;
  withdrawable: boolean;
}

/** Rounds back to inspect. Older rounds are terminal. */
const LOOKBACK = 8;
/** Matches `maxEntriesPerRound`; guards against an unbounded read. */
const MAX_ENTRIES = 25;

function describe(state: number, entries: number): { label: string; detail: string } {
  const s = entries === 1 ? "spin" : "spins";
  switch (state) {
    case RoundState.Open:
      return {
        label: "Waiting for the round",
        detail: `Your ${entries} ${s} ${entries === 1 ? "is" : "are"} in. The round finishes when it fills up or its timer runs out.`,
      };
    case RoundState.Closed:
      return {
        label: "Round closed",
        detail: "Unsealing this round's random number.",
      };
    case RoundState.RandomnessRequested:
    case RoundState.CrossChainPending:
    case RoundState.VRFPending:
    case RoundState.ResultReturning:
      return {
        label: "Draw in progress",
        detail:
          "Waiting for this round's sealed number to be unsealed. It was locked in before the round opened, so nobody can change it now.",
      };
    case RoundState.RandomnessReceived:
      return {
        label: "Draw complete",
        detail: "The number arrived. Prizes are being handed out now.",
      };
    case RoundState.Refundable:
      return {
        label: "Refund ready",
        detail: "The draw couldn't be completed, so your full payment is waiting for you.",
      };
    case RoundState.Failed:
    case RoundState.Cancelled:
      return {
        label: "Round didn't complete",
        detail: "Your payment is being returned in full.",
      };
    default:
      return { label: "In progress", detail: "This round is still being worked through." };
  }
}

export function usePendingSpins() {
  const { address, isConnected } = useAccount();
  const gacha = contracts.gacha;

  const headQuery = useReadContracts({
    allowFailure: true,
    query: { enabled: Boolean(gacha), refetchInterval: 30_000 },
    contracts: gacha
      ? [
          { address: gacha, abi: ROBACHA_GACHA_ABI, functionName: "nextRoundId" },
          { address: gacha, abi: ROBACHA_GACHA_ABI, functionName: "randomnessTimeout" },
        ]
      : [],
  });

  const [nextRoundResult, timeoutResult] = headQuery.data ?? [];
  const nextRoundId =
    nextRoundResult?.status === "success" ? Number(nextRoundResult.result) : 0;
  const timeout =
    timeoutResult?.status === "success" ? Number(timeoutResult.result) : null;

  const roundIds = useMemo(() => {
    if (!nextRoundId) return [];
    const ids: number[] = [];
    for (let id = Math.max(1, nextRoundId - LOOKBACK); id < nextRoundId; id += 1) {
      ids.push(id);
    }
    return ids;
  }, [nextRoundId]);

  const enabled = Boolean(gacha && address && isConnected && roundIds.length > 0);

  // Round state and size together; both are needed before entries can be read.
  const roundsQuery = useReadContracts({
    allowFailure: true,
    query: { enabled, refetchInterval: 20_000 },
    contracts: enabled
      ? roundIds.flatMap((id) => [
          {
            address: gacha!,
            abi: ROBACHA_GACHA_ABI,
            functionName: "getRound" as const,
            args: [BigInt(id)] as const,
          },
          {
            address: gacha!,
            abi: ROBACHA_GACHA_ABI,
            functionName: "entryCount" as const,
            args: [BigInt(id)] as const,
          },
        ])
      : [],
  });

  /** Rounds that are still live and actually hold entries. */
  const candidates = useMemo(() => {
    if (!roundsQuery.data) return [];
    return roundIds
      .map((roundId, index) => {
        const roundResult = roundsQuery.data![index * 2];
        const countResult = roundsQuery.data![index * 2 + 1];
        if (roundResult?.status !== "success" || countResult?.status !== "success") {
          return null;
        }
        const round = roundResult.result as {
          state: number;
          closesAt: bigint;
          closedAt: bigint;
        };
        const state = Number(round.state);
        const count = Math.min(Number(countResult.result as bigint), MAX_ENTRIES);
        if (count === 0) return null;
        // Settled rounds belong in My Bag; None is not a round.
        if (state === RoundState.Settled || state === RoundState.None) return null;
        return { roundId, state, count, closesAt: round.closesAt, closedAt: round.closedAt };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [roundsQuery.data, roundIds]);

  // Walk each candidate's entries and pick out this wallet's.
  const entryCalls = useMemo(
    () =>
      candidates.flatMap((round) =>
        Array.from({ length: round.count }, (_, i) => ({
          address: gacha!,
          abi: ROBACHA_GACHA_ABI,
          functionName: "getEntry" as const,
          args: [BigInt(round.roundId), BigInt(i)] as const,
        })),
      ),
    [candidates, gacha],
  );

  const entriesQuery = useReadContracts({
    allowFailure: true,
    query: { enabled: entryCalls.length > 0, refetchInterval: 20_000 },
    contracts: entryCalls,
  });

  const pending: PendingSpin[] = useMemo(() => {
    if (!entriesQuery.data || !address) return [];
    const wallet = address.toLowerCase();

    const rows: PendingSpin[] = [];
    let cursor = 0;

    for (const round of candidates) {
      let mine = 0;
      for (let i = 0; i < round.count; i += 1) {
        const result = entriesQuery.data[cursor + i];
        if (result?.status !== "success") continue;
        const entry = result.result as { user: string; settled: boolean; refunded: boolean };
        // A settled or refunded entry is finished even if the round is not.
        if (entry.user.toLowerCase() === wallet && !entry.settled && !entry.refunded) {
          mine += 1;
        }
      }
      cursor += round.count;
      if (mine === 0) continue;

      const { label, detail } = describe(round.state, mine);
      const closedAt = Number(round.closedAt);

      rows.push({
        roundId: round.roundId,
        entries: mine,
        state: round.state,
        label,
        detail,
        closesAt: round.state === RoundState.Open ? Number(round.closesAt) * 1000 : null,
        refundableAt: timeout !== null && closedAt > 0 ? (closedAt + timeout) * 1000 : null,
        withdrawable:
          round.state === RoundState.Refundable ||
          round.state === RoundState.Failed ||
          round.state === RoundState.Cancelled,
      });
    }

    return rows;
  }, [entriesQuery.data, candidates, address, timeout]);

  return {
    pending,
    isLoading: headQuery.isLoading || roundsQuery.isLoading || entriesQuery.isLoading,
    hasWallet: Boolean(address && isConnected),
  };
}
