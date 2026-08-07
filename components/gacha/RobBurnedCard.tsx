"use client";

import { ExternalLink, Flame } from "lucide-react";
import { formatAmount } from "@/lib/formatters";
import { explorerUrl } from "@/lib/config";
import { ROB_TOKEN } from "@/lib/rob-payment";
import { ROB_BURN_ADDRESS, useRobBurned } from "@/lib/use-rob-burned";
import { cn } from "@/lib/utils";

/**
 * The running total of ROB the platform has bought back and burned.
 *
 * The whole card is written to survive being zero, which is where it starts:
 * the buyback only fires once protocol margin builds past its threshold, so
 * for a while the honest number is nothing, and saying so plainly is better
 * than hiding the mechanism until it looks impressive. When it is zero the
 * card explains what will happen; once it is not, it shows the figure.
 *
 * Every number is the dead address's own ROB balance, and the link goes to
 * that address on the explorer — the card is a reading of a public fact, not
 * an assertion, so there is a way to check it without taking our word.
 *
 * No price, no projection, no "supply reduced by X%". It removes supply; what
 * that is worth is the market's business, not this card's.
 */
export function RobBurnedCard({ className }: { className?: string }) {
  const { burned, isLoading } = useRobBurned();
  const burnLink = explorerUrl("address", ROB_BURN_ADDRESS);
  const tokenLink = explorerUrl("token", ROB_TOKEN);

  const amount = burned !== null ? Number(burned) / 1e18 : null;
  const hasBurned = amount !== null && amount > 0;

  return (
    <section
      className={cn("glass-card rounded-[18px] p-4", className)}
      aria-label="ROB burned"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(255,119,80,0.14)]">
          <Flame className="h-3.5 w-3.5 text-[#d8642f]" aria-hidden="true" />
        </span>
        <p className="text-[13px] font-semibold tracking-[-0.02em]">$ROB burned</p>
      </div>

      <p className="num mt-3 text-[26px] font-semibold leading-none tracking-[-0.03em]">
        {isLoading && burned === null ? (
          <span className="text-ink-3">…</span>
        ) : hasBurned ? (
          <>
            {formatAmount(amount)}{" "}
            <span className="text-[15px] font-medium text-ink-3">ROB</span>
          </>
        ) : (
          <span className="text-[18px] font-medium text-ink-2">None burned yet</span>
        )}
      </p>

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
        {hasBurned
          ? "Bought back from the platform’s own fees and sent to a dead address, permanently out of supply."
          : "The platform buys back $ROB from its own fees and burns it. Buybacks begin once protocol margin builds up — nothing has been burned yet."}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-2.5 text-[11px]">
        {burnLink ? (
          <a
            href={burnLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            Verify the burn address
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
        {tokenLink ? (
          <a
            href={tokenLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            $ROB contract
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
