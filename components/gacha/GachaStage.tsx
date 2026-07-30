"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { RarityChip } from "@/components/shared/RarityChip";
import { formatAmount, formatOdds, formatRange } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useSpin } from "@/lib/spin-store";
import type { SpinPhase } from "@/types/reward";
import type { ActivePool } from "@/lib/use-pool";
import { RewardCarousel } from "./RewardCarousel";
import { RoundFill } from "./RoundFill";


/**
 * The stage. Renders the active pool's reward slots and a readout of whichever
 * one is focused — all of it contract state.
 */
/** Phases where a signature or a block confirmation is genuinely outstanding. */
const SPINNING_PHASES = new Set<SpinPhase>(["simulating", "confirming", "broadcast"]);

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

  // Only while the transaction itself is in flight.
  //
  // `busy` stays true all the way through `randomness-pending`, which can be
  // hours — a reel turning that long would drain a phone and, worse, imply a
  // result is seconds away when it is waiting on another chain. Once the entry
  // is safely in a round, PendingSpins is what reports the wait.
  const spin = useSpin();
  const spinning = SPINNING_PHASES.has(spin.phase);

  const readout = useMemo(() => {
    if (!focused) return [];
    return [
      {
        label: "You could get",
        value:
          focused.minDisplay !== null && focused.maxDisplay !== null
            ? formatRange(focused.minDisplay, focused.maxDisplay)
            : "Unavailable",
      },
      { label: "Chance", value: formatOdds(focused.oddsPercent) },
      {
        label: "Left in stock",
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

      {/* Machine casing.
          The one element on the page that should feel like a physical object
          was the flattest thing on it — a glass rectangle indistinguishable
          from every other panel. These are the cues that say "machine": a
          brushed top rail, a coin slot, and a dispensing chute below. All
          decorative, none of it load-bearing, and none of it claims anything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-11 rounded-t-[28px] border-b border-[rgb(var(--line-rgb)_/_0.07)] bg-[linear-gradient(180deg,rgb(var(--edge-rgb)_/_0.85),rgb(var(--edge-rgb)_/_0.25))]"
      >
        <span className="absolute left-1/2 top-[18px] h-[5px] w-16 -translate-x-1/2 rounded-full bg-[rgb(var(--line-rgb)_/_0.14)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]" />
        <span className="absolute left-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
        <span className="absolute right-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background] duration-700"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--rarity-glow) / 0.10) 0%, transparent 66%)",
        }}
      />

      <div className="relative px-3 pb-5 pt-14 sm:px-6 sm:pt-16">
        <RewardCarousel
          entries={entries}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          spinning={spinning}
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
              <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-2">
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

        {/* The one honest source of urgency this product has: a real count
            toward a real threshold. */}
        <RoundFill pool={pool} className="mx-auto mt-3 max-w-[520px]" />

        {/* The chute prizes would fall out of. Purely a cue that this is a
            machine with an inside and an outside. */}
        <div
          aria-hidden="true"
          className="mx-auto mt-4 h-6 max-w-[220px] rounded-b-[14px] rounded-t-[4px] border border-t-0 border-[rgb(var(--line-rgb)_/_0.09)] bg-[linear-gradient(180deg,rgb(var(--ink-rgb)_/_0.07),rgb(var(--ink-rgb)_/_0.02))] shadow-[inset_0_3px_8px_rgb(var(--ink-rgb)_/_0.12)]"
        />
      </div>
    </div>
  );
}
