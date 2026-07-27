import { RARITY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/token";

/**
 * Rarity is never communicated by colour alone — the chip always carries the
 * written label, and the dot is decorative.
 */
export function RarityChip({
  rarity,
  size = "md",
  className,
  showDot = true,
  suffix,
}: {
  rarity: Rarity;
  size?: "xs" | "sm" | "md";
  className?: string;
  showDot?: boolean;
  suffix?: string;
}) {
  return (
    <span
      data-rarity={rarity}
      className={cn(
        "rarity-chip inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "xs" && "h-5 px-1.5 text-[10px]",
        size === "sm" && "h-6 px-2 text-[11px]",
        size === "md" && "h-7 px-2.5 text-[12px]",
        className,
      )}
    >
      {showDot ? (
        <span
          className="rarity-dot h-1.5 w-1.5 shrink-0 rounded-full"
          aria-hidden="true"
        />
      ) : null}
      {RARITY_LABEL[rarity]}
      {suffix ? <span className="num opacity-70">{suffix}</span> : null}
    </span>
  );
}
