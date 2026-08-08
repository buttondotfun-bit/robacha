"use client";

import { createContext, useContext } from "react";
import { FEATURED_RAFFLE, type RaffleConfig } from "@/data/raffle";

/**
 * Which raffle the surface is about.
 *
 * The raffle components (ticket panel, prize panel, timeline, activity, contract
 * details) are written once and pointed at a raffle through this context, so the
 * same UI drives every standalone RobachaRaffle — the featured Chimpers draw and
 * the winding-down Meebit — without a bespoke copy of each. `useRaffle()` reads
 * the address from here by default, so a component only has to sit inside a
 * `RaffleProvider` to follow the right contract.
 *
 * The default is the featured raffle, so anything rendered outside a provider
 * (e.g. the cross-site promo) behaves exactly as before.
 */
const RaffleConfigContext = createContext<RaffleConfig>(FEATURED_RAFFLE);

export function RaffleProvider({
  raffle,
  children,
}: {
  raffle: RaffleConfig;
  children: React.ReactNode;
}) {
  return <RaffleConfigContext.Provider value={raffle}>{children}</RaffleConfigContext.Provider>;
}

export function useRaffleConfig(): RaffleConfig {
  return useContext(RaffleConfigContext);
}
