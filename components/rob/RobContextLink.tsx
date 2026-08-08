"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { ROB_TOKEN } from "@/data/rob-token";
import { useRobMarketData } from "@/lib/use-rob";
import { cn } from "@/lib/utils";

/**
 * A quiet $ROB discovery link for surfaces that take native ETH — Mint, Raffle,
 * Launchpad, NFT Spins.
 *
 * Deliberately a *link*, not a payment option: none of these can be paid in
 * $ROB, so this only says "there's a token behind all this, here's its page."
 * Making it look like a currency toggle would be a lie the contracts don't
 * back. Kept small so it reads as a footnote, never a call to buy.
 */
export function RobContextLink({
  className,
  label = "the token behind Robacha",
}: {
  className?: string;
  label?: string;
}) {
  const market = useRobMarketData();

  return (
    <Link
      href={ROB_TOKEN.route}
      className={cn(
        "glass-chip group inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-[11.5px] text-ink-2 transition-colors hover:text-ink",
        className,
      )}
    >
      <span className="h-4 w-4 shrink-0 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
        <TokenAvatar
          address={ROB_TOKEN.address}
          symbol={ROB_TOKEN.symbol}
          logoUrl={market.logoUrl}
          size={16}
          rounded="none"
        />
      </span>
      <span className="num font-medium">${ROB_TOKEN.symbol}</span>
      <span className="text-ink-3">· {label}</span>
      <ArrowUpRight
        className="h-3 w-3 text-ink-3 transition-colors group-hover:text-ink-2"
        aria-hidden="true"
      />
    </Link>
  );
}
