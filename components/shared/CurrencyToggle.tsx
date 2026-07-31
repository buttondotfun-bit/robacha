"use client";

import { chainConfig } from "@/lib/config";
import { useMoney } from "@/lib/use-money";
import { cn } from "@/lib/utils";

/**
 * Switches displayed amounts between the native token and dollars.
 *
 * Hidden entirely when no exchange rate is available — an inert toggle that
 * silently does nothing is worse than no toggle, and the ETH figures are
 * complete on their own.
 */
export function CurrencyToggle({ className }: { className?: string }) {
  const money = useMoney();
  if (!money.hasPrice) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] p-0.5",
        className,
      )}
      role="group"
      aria-label="Show amounts in"
    >
      {(
        [
          ["native", chainConfig.nativeSymbol],
          ["usd", "USD"],
        ] as const
      ).map(([value, label]) => {
        const active = money.preference === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => money.setPreference(value)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-colors",
              active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
