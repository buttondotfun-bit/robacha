"use client";

import Link from "next/link";
import { Clock, Ticket } from "lucide-react";
import { HubRaffleState } from "@/lib/abi/robacha-raffle-hub";
import type { HubRaffle } from "@/lib/use-raffle-hub";
import { useMoney } from "@/lib/use-money";
import { useSecondsTick } from "@/lib/use-tick";
import { shortAddress } from "@/lib/formatters";
import { NftThumb } from "./NftThumb";
import { countdown, stateLabel } from "./raffle-state";

/**
 * One raffle in the launchpad grid. Every figure — the sold count, the price,
 * the clock, the state — is read from the hub, so a card can never claim
 * progress the chain doesn't show.
 */
export function RaffleCard({ raffle }: { raffle: HubRaffle }) {
  const money = useMoney();
  const now = useSecondsTick();

  const pct = raffle.ticketCap > 0 ? Math.min(100, (raffle.ticketsSold / raffle.ticketCap) * 100) : 0;
  const msLeft = raffle.closesAt * 1000 - now;
  const live = raffle.state === HubRaffleState.Open && msLeft > 0;

  return (
    <Link
      href={`/launchpad/${raffle.id}`}
      className="glass-card group relative flex flex-col overflow-hidden rounded-[20px] transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-square w-full">
        <NftThumb nft={raffle.nft} tokenId={raffle.tokenId} rounded="rounded-none" className="h-full w-full" />
        <span
          className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur-sm ${
            live
              ? "bg-[rgba(20,20,20,0.55)] text-white"
              : "bg-[rgba(20,20,20,0.5)] text-white/90"
          }`}
        >
          {live ? <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#a6e22e]" aria-hidden="true" /> : null}
          {stateLabel(raffle.state)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">
            {shortAddress(raffle.nft)} #{raffle.tokenId.toString()}
          </p>
          <span className="num shrink-0 text-[12px] text-ink-2">{money.native(raffle.ticketPriceWei)}</span>
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)]">
          <div className="h-full rounded-full bg-[#8ec500] transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Ticket className="h-3 w-3" aria-hidden="true" />
            {raffle.ticketsSold}/{raffle.ticketCap}
          </span>
          {live ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {countdown(msLeft)} left
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
