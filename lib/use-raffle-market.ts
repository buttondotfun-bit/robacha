"use client";

import { useMemo } from "react";
import { RAFFLES, type RaffleConfig } from "@/data/raffle";
import { HubRaffleState } from "./abi/robacha-raffle-hub";
import { RaffleState, useRaffle, type RaffleView } from "./use-raffle";
import { useHubRaffles, type HubRaffle } from "./use-raffle-hub";

/**
 * One read of the whole raffle market: the platform's own standalone raffles
 * (each its own `RobachaRaffle` — the featured Chimpers draw and the winding-
 * down Meebit) and every community raffle on the hub, plus a few headline
 * figures derived from them.
 *
 * Nothing here is invented. Each stat is a straight aggregate of contract
 * state — counts of raffles in a given state, a sum of tickets sold — so the
 * page can show a market summary without a single fabricated number. Metrics
 * that would need off-chain indexing to compute honestly (e.g. unique
 * participants across every raffle) are deliberately absent rather than faked.
 */

export interface RaffleMarketStats {
  /** Raffles currently taking tickets (platform + community). */
  liveRaffles: number;
  /** Tickets sold across every raffle, ever. */
  ticketsSold: number;
  /** Raffles that have drawn a winner. */
  nftsAwarded: number;
  /** Every raffle the market knows about. */
  totalRaffles: number;
}

export interface StandaloneRaffle {
  config: RaffleConfig;
  view: RaffleView;
}

export interface RaffleMarket {
  /** Configured platform raffles, featured first. */
  standalone: StandaloneRaffle[];
  community: HubRaffle[];
  communityConfigured: boolean;
  stats: RaffleMarketStats;
  isLoading: boolean;
}

export function useRaffleMarket(): RaffleMarket {
  // There are exactly two platform raffles today; read each by address so the
  // number of hook calls is stable no matter how many are actually pinned.
  const firstView = useRaffle(RAFFLES[0]?.address ?? null);
  const secondView = useRaffle(RAFFLES[1]?.address ?? null);
  const { raffles, configured: communityConfigured, isLoading: communityLoading } = useHubRaffles();

  const standalone = useMemo<StandaloneRaffle[]>(() => {
    return [
      RAFFLES[0] ? { config: RAFFLES[0], view: firstView } : null,
      RAFFLES[1] ? { config: RAFFLES[1], view: secondView } : null,
    ].filter((x): x is StandaloneRaffle => x !== null && x.view.configured);
  }, [firstView, secondView]);

  const stats = useMemo<RaffleMarketStats>(() => {
    const selfLive = standalone.reduce((n, s) => n + (s.view.state === RaffleState.Open ? 1 : 0), 0);
    const selfSold = standalone.reduce((n, s) => n + (s.view.ticketsSold ?? 0), 0);
    const selfAwarded = standalone.reduce((n, s) => n + (s.view.winner ? 1 : 0), 0);

    const communityLive = raffles.filter((r) => r.state === HubRaffleState.Open).length;
    const communitySold = raffles.reduce((sum, r) => sum + r.ticketsSold, 0);
    const communityAwarded = raffles.filter((r) => r.state === HubRaffleState.Complete).length;

    return {
      liveRaffles: selfLive + communityLive,
      ticketsSold: selfSold + communitySold,
      nftsAwarded: selfAwarded + communityAwarded,
      totalRaffles: standalone.length + raffles.length,
    };
  }, [standalone, raffles]);

  return {
    standalone,
    community: raffles,
    communityConfigured,
    stats,
    isLoading: firstView.isLoading || secondView.isLoading || communityLoading,
  };
}
