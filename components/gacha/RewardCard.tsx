import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { formatOdds, formatRange } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { PoolRewardEntry } from "@/lib/use-pool";

/**
 * A reward slot in the live pool. Every value shown — token, range, odds,
 * inventory — comes from the gacha contract via usePool(); nothing here is
 * authored in the app.
 */
export function RewardCard({
  entry,
  position,
  active,
  logoUrl,
  className,
}: {
  entry: PoolRewardEntry;
  /** Real token logo, resolved by contract address. */
  logoUrl?: string | null;
  /** 1-based slot number in the active pool. */
  position: number;
  active?: boolean;
  className?: string;
}) {
  const soldOut = entry.available !== null && entry.available === 0n;

  return (
    <article
      data-rarity={entry.rarity}
      className={cn(
        "glass-reflection relative flex h-full w-full flex-col overflow-hidden rounded-[18px] transition-[box-shadow] duration-300",
        active
          ? "rarity-glass shadow-[0_1px_1px_rgb(var(--edge-rgb)_/_0.7)_inset,0_0_0_3px_rgba(204,255,0,0.3),0_24px_48px_-24px_rgb(var(--ink-rgb)_/_0.5)]"
          : "glass-card",
        className,
      )}
    >
      <div className="relative flex items-center justify-between px-2.5 pt-2.5">
        <span className="micro text-[9px] tracking-[0.1em] text-ink-3">
          ROBACHA POOL
        </span>
        <span className="num text-[9px] text-ink-3">
          #{String(position).padStart(2, "0")}
        </span>
      </div>

      <div className="relative px-2.5 pt-2">
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.8)] shadow-[0_4px_12px_-6px_rgb(var(--ink-rgb)_/_0.32)] [container-type:inline-size]">
          <span className="block aspect-square w-full">
            <TokenAvatar
              logoUrl={logoUrl}
              size={220}
              address={entry.token}
              symbol={entry.symbol}
              rounded="none"
            />
          </span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
        <p className="shrink-0 truncate text-[13px] font-semibold leading-snug tracking-[-0.02em]">
          {entry.name ?? "Unknown token"}
        </p>
        <p className="num mt-0.5 shrink-0 truncate text-[10.5px] leading-snug text-ink-3">
          {entry.symbol ? `$${entry.symbol}` : "metadata unavailable"}
        </p>

        <div className="mt-auto shrink-0 pt-2">
          <div className="flex items-center justify-between gap-1">
            <RarityChip rarity={entry.rarity} size="xs" />
            <span className="num text-[10px] text-ink-2">
              {formatOdds(entry.oddsPercent)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-1.5">
            <span className="num text-[10.5px] font-medium text-ink">
              {entry.minDisplay !== null && entry.maxDisplay !== null
                ? formatRange(entry.minDisplay, entry.maxDisplay)
                : "—"}
            </span>
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                soldOut ? "bg-[rgb(var(--ink-rgb)_/_0.2)]" : "bg-[#8ec500]",
              )}
              aria-hidden="true"
              title={soldOut ? "Out of stock" : "In stock"}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
