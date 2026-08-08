"use client";

import { cn } from "@/lib/utils";

/**
 * The shared raffle progress bar: a pale neutral track, a lime fill with a soft
 * pink-lime glow riding the leading edge, and a smooth width transition when the
 * count changes. The fill width is the only thing that ever moves, and it only
 * moves because the contract's sold count did.
 */
export function RaffleProgress({
  value,
  max,
  className,
  height = "h-2.5",
}: {
  value: number;
  max: number;
  className?: string;
  height?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const showGlow = pct > 1 && pct < 100;

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)]", height, className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="relative h-full rounded-full bg-[linear-gradient(90deg,#e6ff8c_0%,#bff23f_55%,#a6d900_100%)] transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      >
        {showGlow ? (
          <span
            aria-hidden="true"
            className="raffle-progress-glow absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#d6ff5e]"
          />
        ) : null}
      </div>
    </div>
  );
}
