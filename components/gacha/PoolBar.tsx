"use client";

import { ArrowUpRight, Timer } from "lucide-react";
import Link from "next/link";
import { RarityChip } from "@/components/shared/RarityChip";
import { formatRoundClock, useLiveRound } from "@/lib/use-live-round";
import { cn } from "@/lib/utils";
import type { ActivePool } from "@/lib/use-pool";

/**
 * Pool identity, published odds, and how long the current round has left.
 *
 * The countdown is the round's, not the pool's. It used to be the pool
 * version's `endTime` — the date the machine retires — which is unset for an
 * open-ended pool and so never rendered. "How long until this batch settles?"
 * is the question people have with a wallet open, so that is what it answers.
 */
export function PoolBar({
  pool,
  className,
}: {
  pool: ActivePool;
  className?: string;
}) {
  const round = useLiveRound();

  return (
    <div
      className={cn(
        "glass-card flex flex-col gap-3 rounded-[20px] px-4 py-3 lg:flex-row lg:items-center lg:gap-5",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <div>
          <p className="micro">Live pool</p>
          <p className="mt-0.5 text-[14px] font-semibold tracking-[-0.02em]">
            {pool.name || `Pool #${pool.poolId}`}
          </p>
        </div>
        <span className="hidden h-8 w-px bg-[rgb(var(--line-rgb)_/_0.08)] lg:block" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="micro mb-1.5 lg:hidden">Your odds</p>
        <ul className="flex flex-wrap items-center gap-1.5">
          {pool.tiers.map((tier) => (
            <li key={tier.index} data-rarity={tier.rarity}>
              <RarityChip
                rarity={tier.rarity}
                size="sm"
                suffix={`${tier.probabilityPercent}%`}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* The current batch's clock, not the pool's retirement date. Silent
            when there is no round rather than showing a zero that would read
            as "you missed it". */}
        {round.status === "open" && round.msLeft !== null ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
            <Timer className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            Round closes in{" "}
            <span className="num text-ink">{formatRoundClock(round.msLeft)}</span>
          </span>
        ) : round.status === "closing" ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
            <Timer className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            Round closing now
          </span>
        ) : round.status === "none" ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            Your spin starts the next round
          </span>
        ) : null}
        <Link
          href="/app"
          className="glass-chip inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-ink"
        >
          View Pool
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
