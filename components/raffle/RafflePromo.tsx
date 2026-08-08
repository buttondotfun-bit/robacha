"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Ticket } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { RAFFLE_PRIZE } from "@/data/raffle";
import { useRaffle, RaffleState } from "@/lib/use-raffle";
import { useSecondsTick } from "@/lib/use-tick";
import { cn } from "@/lib/utils";

/** "23h 54m", or "48m" under an hour, or "2m" in the final stretch. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

/**
 * A cross-site promo for the live Meebit raffle.
 *
 * One component, told entirely by the contract, dropped onto every page that
 * can carry it — the spin page, the home page, the NFT teaser, the rest of the
 * product. It renders nothing unless the raffle is genuinely open, still has
 * time on the clock and still has tickets left: the moment it sells out, the
 * draw starts, or no raffle is deployed, it disappears on its own. That is the
 * point — it markets a real, buyable thing while that thing exists, and never
 * a countdown or a "sold" bar that nothing behind it can move.
 *
 * Two shapes: a `banner` for the top of a page, and a slim `bar` for chrome
 * that repeats across a section. Both link to /raffle, where the actual
 * ticket-buying and the full rules live.
 */
export function RafflePromo({
  variant = "banner",
  className,
  hideOnPaths,
}: {
  variant?: "banner" | "bar";
  className?: string;
  /** Routes where a richer promo already lives, so this one steps aside. */
  hideOnPaths?: string[];
}) {
  const raffle = useRaffle();
  const now = useSecondsTick();
  const pathname = usePathname();

  if (hideOnPaths && pathname && hideOnPaths.includes(pathname)) return null;
  if (!raffle.configured || raffle.state !== RaffleState.Open) return null;

  const cap = raffle.cap ?? 0;
  const sold = raffle.ticketsSold ?? 0;
  const msLeft = raffle.closesAt !== null ? raffle.closesAt * 1000 - now : 0;

  // Nothing left to sell, or the window is up — let the page's live state take
  // over rather than pitch a raffle no one can still enter.
  if (msLeft <= 0 || (cap > 0 && sold >= cap)) return null;

  const left = countdown(msLeft);
  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
  const remaining = cap > 0 ? cap - sold : null;

  if (variant === "bar") {
    return (
      <div className={cn("flex justify-center", className)}>
      <Link
        href="/raffle"
        className="group glass-chip flex max-w-full items-center gap-3 rounded-full py-1.5 pl-2 pr-2.5 text-[12.5px] transition-colors hover:text-ink"
      >
        <span className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-[rgb(var(--edge-rgb)_/_0.8)]">
          <Image src={RAFFLE_PRIZE.image} alt="" fill sizes="24px" className="object-cover" />
        </span>
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink-2">
          <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#8ec500]" aria-hidden="true" />
          <span className="truncate">
            <span className="text-ink">Win a Meebit</span>
            <span className="hidden text-ink-3 sm:inline"> · {sold}/{cap} sold · {left} left</span>
          </span>
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-accent-ink">
          Tickets
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
      </div>
    );
  }

  return (
    <div
      data-rarity="grail"
      className={cn(
        "glass-panel glass-reflection relative overflow-hidden rounded-[24px] p-4 sm:p-5",
        className,
      )}
    >
      <span className="noise-overlay" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center gap-4 sm:flex-nowrap">
        {/* Prize thumb */}
        <Link
          href="/raffle"
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px] ring-1 ring-[rgb(var(--edge-rgb)_/_0.8)]"
          aria-label="Meebit raffle"
        >
          <Image src={RAFFLE_PRIZE.image} alt="Meebit" fill sizes="64px" className="object-cover" />
        </Link>

        {/* Pitch */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
            <span className="micro text-accent-ink">Live raffle · {left} left</span>
          </div>
          <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em]">
            Win a Meebit — $10 a ticket
          </h2>
          <p className="mt-0.5 truncate text-[12px] leading-relaxed text-ink-2">
            {remaining !== null && remaining <= 50
              ? `Only ${remaining} of ${cap} tickets left. Sell out and one wallet wins.`
              : "200 tickets, 24 hours. Every ticket refunded in full if it doesn't sell out."}
          </p>

          {/* Sold progress — a bar that only ever moves because the chain did. */}
          {cap > 0 ? (
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)]">
                <div
                  className="h-full rounded-full bg-[#8ec500] transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="num shrink-0 text-[11.5px] font-medium text-ink-2">
                {sold}/{cap}
              </span>
            </div>
          ) : null}
        </div>

        {/* CTA */}
        <ButtonLink href="/raffle" variant="primary" size="md" className="shrink-0">
          <Ticket className="h-4 w-4" aria-hidden="true" />
          Get tickets
        </ButtonLink>
      </div>
    </div>
  );
}
