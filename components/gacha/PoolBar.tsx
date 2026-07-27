"use client";

import { ArrowUpRight, Timer } from "lucide-react";
import Link from "next/link";
import { RarityChip } from "@/components/shared/RarityChip";
import { formatCountdown } from "@/lib/formatters";
import { useNow } from "@/lib/use-activity";
import { cn } from "@/lib/utils";
import type { ActivePool } from "@/lib/use-pool";

/**
 * Pool identity and published odds. Every figure is contract state: the name,
 * the version, the tier probabilities and the rotation close time.
 */
export function PoolBar({
  pool,
  className,
}: {
  pool: ActivePool;
  className?: string;
}) {
  const now = useNow();
  const minutesToClose =
    pool.closesAt !== null
      ? Math.max(0, (pool.closesAt - now) / 60_000)
      : null;

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
        <span className="hidden h-8 w-px bg-[rgba(20,24,18,0.08)] lg:block" />
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
        {minutesToClose !== null ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
            <Timer className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            Closes in{" "}
            <span className="num text-ink">{formatCountdown(minutesToClose)}</span>
          </span>
        ) : null}
        <Link
          href="/rewards"
          className="glass-chip inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-ink"
        >
          View Pool
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
