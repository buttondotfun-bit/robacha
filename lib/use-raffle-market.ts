"use client";

import { useMemo } from "react";
import { HubRaffleState } from "./abi/robacha-raffle-hub";
import { RaffleState, useRaffle, type RaffleView } from "./use-raffle";
import { useHubRaffles, type HubRaffle } from "./use-raffle-hub";

/**
 * One read of the whole raffle market: the platform's featured raffle (its own
 * `RobachaRaffle` contract — currently the Chimpers #2272 draw) and every
 * community raffle on the hub, plus a few headline figures derived from them.
 *
 * Nothing here is invented. Each stat is a straight aggregate of contract
 * state — counts of raffles in a given state, a sum of tickets sold — so the
 * page can show a market summary without a single fabricated number. Metrics
 * that would need off-chain indexing to compute honestly (e.g. unique
 * participants across every raffle) are deliberately absent rather than faked.
 */

export interface RaffleMarketStats {
  /** Raffles currently taking tickets (featured + community). */
  liveRaffles: number;
  /** Tickets sold across every raffle, ever. */
  ticketsSold: number;
  /** Raffles that have drawn a winner. */
  nftsAwarded: number;
  /** Every raffle the market knows about. */
  totalRaffles: number;
}

export interface RaffleMarket {
  /** The platform's own featured raffle (its standalone `RobachaRaffle`). */
  featured: RaffleView;
  community: HubRaffle[];
  communityConfigured: boolean;
  stats: RaffleMarketStats;
  isLoading: boolean;
}

export function useRaffleMarket(): RaffleMarket {
  const featured = useRaffle();
  const { raffles, configured: communityConfigured, isLoading: communityLoading } = useHubRaffles();

  const stats = useMemo<RaffleMarketStats>(() => {
    const featuredLive = featured.configured && featured.state === RaffleState.Open ? 1 : 0;
    const featuredSold = featured.ticketsSold ?? 0;
    const featuredAwarded = featured.winner ? 1 : 0;
    const featuredExists = featured.configured ? 1 : 0;

    const communityLive = raffles.filter((r) => r.state === HubRaffleState.Open).length;
    const communitySold = raffles.reduce((sum, r) => sum + r.ticketsSold, 0);
    const communityAwarded = raffles.filter((r) => r.state === HubRaffleState.Complete).length;

    return {
      liveRaffles: featuredLive + communityLive,
      ticketsSold: featuredSold + communitySold,
      nftsAwarded: featuredAwarded + communityAwarded,
      totalRaffles: featuredExists + raffles.length,
    };
  }, [featured.configured, featured.state, featured.ticketsSold, featured.winner, raffles]);

  return {
    featured,
    community: raffles,
    communityConfigured,
    stats,
    isLoading: featured.isLoading || communityLoading,
  };
}
