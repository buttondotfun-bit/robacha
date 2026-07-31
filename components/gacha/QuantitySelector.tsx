"use client";

import { Minus, Plus } from "lucide-react";
import { SPIN_MAX, SPIN_MIN, SPIN_SHORTCUTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function QuantitySelector({
  value,
  onChange,
  disabled,
  max,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** Ceiling from the pool contract's per-transaction cap, when it is known. */
  max?: number;
  className?: string;
}) {
  // The contract's own cap always wins over the interface's default, so the
  // selector can never offer a quantity the contract would reject.
  const ceiling = Math.max(SPIN_MIN, Math.min(max ?? SPIN_MAX, SPIN_MAX));

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center justify-between glass-card rounded-[14px] px-1">
          <button
            type="button"
            onClick={() => onChange(value - 1)}
            disabled={disabled || value <= SPIN_MIN}
            aria-label="Decrease spin quantity"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-35"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>

          <label className="sr-only" htmlFor="spin-quantity">
            Number of spins
          </label>
          <input
            id="spin-quantity"
            type="number"
            inputMode="numeric"
            min={SPIN_MIN}
            max={ceiling}
            value={value}
            disabled={disabled}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(next)) onChange(next);
            }}
            className="num w-14 [appearance:textfield] bg-transparent text-center text-[17px] font-semibold text-ink outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />

          <button
            type="button"
            onClick={() => onChange(value + 1)}
            disabled={disabled || value >= ceiling}
            aria-label="Increase spin quantity"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-35"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex h-11 items-center gap-1 rounded-[12px] glass-quiet p-1">
          {SPIN_SHORTCUTS.filter((shortcut) => shortcut <= ceiling).map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              disabled={disabled}
              onClick={() => onChange(shortcut)}
              aria-pressed={value === shortcut}
              className={cn(
                "num h-9 w-9 rounded-[9px] text-[13px] font-semibold transition-colors disabled:opacity-40",
                value === shortcut
                  ? "bg-surface/85 text-ink shadow-[0_1px_0_rgb(var(--edge-rgb)_/_0.9)_inset,0_2px_6px_-2px_rgb(var(--ink-rgb)_/_0.12)]"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              {shortcut}
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        min={SPIN_MIN}
        max={ceiling}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Spin quantity slider"
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[rgb(var(--line-rgb)_/_0.08)] accent-[#ccff00] disabled:opacity-40 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#bfe800] [&::-webkit-slider-thumb]:bg-accent"
      />
      <div className="mt-1.5 flex justify-between">
        <span className="num text-[10.5px] text-ink-3">{SPIN_MIN}</span>
        <span className="num text-[10.5px] text-ink-3">{ceiling} max</span>
      </div>
    </div>
  );
}
