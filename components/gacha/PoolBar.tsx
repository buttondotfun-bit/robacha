"use client";

import { RarityChip } from "@/components/shared/RarityChip";
import { formatRoundClock, useLiveRound } from "@/lib/use-live-round";
import { cn } from "@/lib/utils";
import type { ActivePool } from "@/lib/use-pool";

/**
 * The machine's status header: which pool is live, the published odds, and
 * exactly where the current round stands — all read from chain.
 *
 * The round rail is deliberately literal about state. `useLiveRound` reports
 * only what the contract exposes — no round, a round open with time on its
 * clock, or a round closing — so this shows those and nothing invented. The
 * countdown is the batch's, not the pool's retirement date, because "how long
 * until this settles?" is the question someone has with a wallet open.
 */
export function PoolBar({ pool, className }: { pool: ActivePool; className?: string }) {
  const round = useLiveRound();
  const status = roundStatus(round);

  return (
    <div
      className={cn(
        "glass-card flex flex-col gap-3 rounded-[20px] px-4 py-3 lg:flex-row lg:items-center lg:gap-5",
        className,
      )}
    >
      {/* Identity — live-dotted so the machine reads as active at a glance. */}
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-[#8ec500]" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8ec500]" />
        </span>
        <div>
          <p className="micro">Live pool</p>
          <p className="mt-0.5 text-[14px] font-semibold tracking-[-0.02em]">
            {pool.name || `Pool #${pool.poolId}`}
          </p>
        </div>
        <span className="hidden h-8 w-px bg-[rgb(var(--line-rgb)_/_0.08)] lg:block" />
      </div>

      {/* Published odds. */}
      <div className="min-w-0 flex-1">
        <p className="micro mb-1.5 lg:hidden">Your odds</p>
        <ul className="flex flex-wrap items-center gap-1.5">
          {pool.tiers.map((tier) => (
            <li key={tier.index} data-rarity={tier.rarity}>
              <RarityChip rarity={tier.rarity} size="sm" suffix={`${tier.probabilityPercent}%`} />
            </li>
          ))}
        </ul>
      </div>

      {/* Round status rail. On mobile it stacks as a full-width row under a
          hairline; on desktop it tucks inline at the right edge. */}
      <div className="w-full border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3 lg:w-auto lg:shrink-0 lg:border-t-0 lg:pt-0 lg:text-right">
        <p className="micro">Round{round.roundId !== null ? ` #${round.roundId}` : ""}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-medium lg:justify-end">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)} aria-hidden="true" />
          <span className={cn("truncate", status.live ? "text-ink" : "text-ink-2")}>{status.label}</span>
          {status.clock ? <span className="num shrink-0 text-ink-3">· {status.clock}</span> : null}
        </p>
      </div>
    </div>
  );
}

function roundStatus(round: ReturnType<typeof useLiveRound>): {
  label: string;
  clock: string | null;
  dot: string;
  live: boolean;
} {
  if (round.status === "open" && round.msLeft !== null) {
    return { label: "Live", clock: formatRoundClock(round.msLeft), dot: "bg-[#8ec500]", live: true };
  }
  if (round.status === "closing") {
    return { label: "Closing now", clock: null, dot: "bg-[#e6a100]", live: true };
  }
  if (round.status === "none") {
    return { label: "Your spin starts it", clock: null, dot: "bg-[rgb(var(--ink-rgb)_/_0.25)]", live: false };
  }
  return { label: "—", clock: null, dot: "bg-[rgb(var(--ink-rgb)_/_0.18)]", live: false };
}
