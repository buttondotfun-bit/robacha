"use client";

import { Ticket } from "lucide-react";
import { useRaffle, RaffleState } from "@/lib/use-raffle";
import { useRaffleConfig } from "@/lib/raffle-context";
import { useSecondsTick } from "@/lib/use-tick";
import { cn } from "@/lib/utils";

/**
 * The hero status chip, told by the contract rather than hardcoded.
 *
 * The page used to say "opening soon" in fixed text, which stayed put after
 * the raffle went live — the tell that a status is decoration, not a reading.
 * This reports what the chain says: live with time left, sold out, drawn, or
 * refunding, and only falls back to "opening soon" when no raffle is deployed.
 */
export function RaffleStatusChip({ className }: { className?: string }) {
  const raffle = useRaffle();
  const now = useSecondsTick();

  let label = "Raffle · opening soon";
  let live = false;

  if (raffle.configured && raffle.state !== null) {
    const msLeft = raffle.closesAt !== null ? raffle.closesAt * 1000 - now : 0;
    if (raffle.state === RaffleState.Open && msLeft > 0) {
      const h = Math.floor(msLeft / 3_600_000);
      const m = Math.floor((msLeft % 3_600_000) / 60_000);
      label = h > 0 ? `Live · ${h}h ${m}m left` : `Live · ${m}m left`;
      live = true;
    } else if (raffle.state === RaffleState.AwaitingDraw) {
      label = "Sold out · drawing the winner";
    } else if (raffle.state === RaffleState.Complete) {
      label = "Winner drawn";
    } else if (raffle.state === RaffleState.Refundable) {
      label = "Refunds open";
    } else {
      label = "Raffle closed";
    }
  }

  return (
    <span
      className={cn(
        "glass-chip inline-flex h-8 w-fit items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2",
        className,
      )}
    >
      {live ? (
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
      ) : (
        <Ticket className="h-3 w-3" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

/**
 * A compact live-status line for the detail hero: a gently pulsing dot, the
 * state, and the time left — all from the contract's own timestamps, never a
 * frontend-only clock started on page load.
 */
export function RaffleStatusLine({ className }: { className?: string }) {
  const raffle = useRaffle();
  const now = useSecondsTick();

  let dot = false;
  let label = "Opening soon";
  let time: string | null = null;

  if (raffle.configured && raffle.state !== null) {
    const msLeft = raffle.closesAt !== null ? raffle.closesAt * 1000 - now : 0;
    if (raffle.state === RaffleState.Open && msLeft > 0) {
      dot = true;
      label = "Live";
      const h = Math.floor(msLeft / 3_600_000);
      const m = Math.floor((msLeft % 3_600_000) / 60_000);
      time = `${h}h ${String(m).padStart(2, "0")}m remaining`;
    } else if (raffle.state === RaffleState.AwaitingDraw) {
      label = "Sold out · drawing";
    } else if (raffle.state === RaffleState.Complete) {
      label = "Winner drawn";
    } else if (raffle.state === RaffleState.Refundable) {
      label = "Refunds open";
    } else {
      label = "Closed";
    }
  }

  return (
    <div className={cn("flex items-center gap-2 text-[12px]", className)}>
      <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-ink-2">
        {dot ? (
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
        ) : (
          <Ticket className="h-3 w-3 text-ink-3" aria-hidden="true" />
        )}
        {label}
      </span>
      {time ? (
        <>
          <span className="text-ink-3" aria-hidden="true">·</span>
          <span className="num tabular-nums text-ink-3">{time}</span>
        </>
      ) : null}
    </div>
  );
}

/**
 * The cross-chain / trust note under the outcomes, swapped for the live state.
 *
 * Before a raffle exists it says tickets aren't on sale yet; once one is
 * deployed it says the contract holds the money — the honest line changes when
 * the fact does, rather than the page still telling live buyers to wait.
 */
export function RaffleDisclosure({ className }: { className?: string }) {
  const raffle = useRaffle();
  const { prizePhrase } = useRaffleConfig();
  const prizeCap = prizePhrase.charAt(0).toUpperCase() + prizePhrase.slice(1);

  return (
    <p className={className}>
      {prizeCap} is an Ethereum NFT and ROBACHA runs on Robinhood Chain, so
      the prize is sent to the winner by hand across chains.{" "}
      {raffle.configured
        ? "Everything else — the money, the caps, the draw and the refund — is held and enforced by the contract, not by us."
        : "Tickets are not on sale yet; how they are bought, drawn and refunded is published before the raffle opens."}
    </p>
  );
}
