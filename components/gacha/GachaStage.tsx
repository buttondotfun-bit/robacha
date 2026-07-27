"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { RarityChip } from "@/components/shared/RarityChip";
import { formatAmount, formatOdds, formatRange } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ActivePool } from "@/lib/use-pool";
import { RewardCarousel } from "./RewardCarousel";

/**
 * The stage. Renders the active pool's reward slots and a readout of whichever
 * one is focused — all of it contract state.
 */
export function GachaStage({
  pool,
  className,
}: {
  pool: ActivePool;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const entries = pool.entries;
  const len = entries.length;
  const focused = len ? entries[((activeIndex % len) + len) % len] : null;

  const readout = useMemo(() => {
    if (!focused) return [];
    return [
      {
        label: "Reward range",
        value:
          focused.minDisplay !== null && focused.maxDisplay !== null
            ? formatRange(focused.minDisplay, focused.maxDisplay)
            : "Unavailable",
      },
      { label: "Pull odds", value: formatOdds(focused.oddsPercent) },
      {
        label: "Inventory",
        value:
          focused.availableDisplay !== null
            ? formatAmount(focused.availableDisplay)
            : "Unavailable",
      },
    ];
  }, [focused]);

  return (
    <div
      data-rarity={focused?.rarity ?? "common"}
      className={cn(
        "glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[28px]",
        className,
      )}
    >
      <span className="noise-overlay" aria-hidden="true" />
      <div className="cross-grid absolute inset-0" aria-hidden="true" />
      <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background] duration-700"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--rarity-glow) / 0.10) 0%, transparent 66%)",
        }}
      />

      <div className="relative px-3 pb-5 pt-9 sm:px-6 sm:pt-12">
        <RewardCarousel
          entries={entries}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
        />

        {focused ? (
          <div className="mx-auto mt-9 flex max-w-[520px] items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveIndex((activeIndex - 1 + len) % len)}
              aria-label="Previous reward"
              className="glass-chip grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <div
              data-rarity={focused.rarity}
              className="glass-card min-w-0 flex-1 rounded-[16px] px-3.5 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-[13px] font-semibold tracking-[-0.02em]">
                    {focused.name ?? "Unknown token"}
                  </p>
                  <span className="num shrink-0 text-[11px] text-ink-3">
                    {focused.symbol ? `$${focused.symbol}` : ""}
                  </span>
                </div>
                <RarityChip rarity={focused.rarity} size="xs" />
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-[rgba(20,24,18,0.08)] pt-2">
                {readout.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[10px] uppercase tracking-[0.06em] text-ink-3">
                      {item.label}
                    </dt>
                    <dd className="num mt-0.5 text-[12px] font-medium text-ink">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <button
              type="button"
              onClick={() => setActiveIndex((activeIndex + 1) % len)}
              aria-label="Next reward"
              className="glass-chip grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
