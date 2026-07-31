"use client";

import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Segmented tab strip. Roving arrow-key navigation, one tab in the tab order.
 * Used by the activity rail, the activity page and the bag filters.
 */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
  label,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  size?: "sm" | "md";
  label: string;
}) {
  const index = options.findIndex((option) => option.value === value);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "hide-scrollbar flex items-center gap-1 overflow-x-auto rounded-[12px] glass-quiet p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-[9px] font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
              active
                ? "bg-surface/85 text-ink shadow-[0_1px_0_rgb(var(--edge-rgb)_/_0.9)_inset,0_2px_6px_-2px_rgb(var(--ink-rgb)_/_0.12)]"
                : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "num text-[11px]",
                  active ? "text-ink-3" : "text-ink-3",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
