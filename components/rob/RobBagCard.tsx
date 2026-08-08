"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { ROB_TOKEN } from "@/data/rob-token";
import { formatUsd } from "@/lib/formatters";
import { useRobBalance, useRobMarketData } from "@/lib/use-rob";
import { RobOfficialPill } from "./RobContract";

/**
 * $ROB in My Bag: the wallet's own holding of Robacha's utility token, pinned
 * as a first-class asset rather than buried among reward tokens (it isn't a
 * reward token, so `useHoldings` never surfaces it). Shows the real balance —
 * zero included, honestly — with a USD value only when a reliable price backs
 * it, and routes to spending or reading about it. No price target, no "buy".
 *
 * Rendered only inside the connected, right-network Bag, so balance is always
 * a real read here.
 */
export function RobBagCard() {
  const balance = useRobBalance();
  const market = useRobMarketData();

  const usd =
    balance.amount !== null && market.price !== null
      ? balance.amount * market.price
      : null;

  return (
    <section className="glass-card rounded-[18px] p-4 sm:p-5" aria-label="$ROB holding">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
          <TokenAvatar
            address={ROB_TOKEN.address}
            symbol={ROB_TOKEN.symbol}
            logoUrl={market.logoUrl}
            size={44}
            rounded="none"
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-semibold tracking-[-0.02em]">
              ${ROB_TOKEN.symbol}
            </p>
            <RobOfficialPill />
          </div>
          <p className="num text-[11.5px] text-ink-3">
            {ROB_TOKEN.name} · utility token
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="num text-[18px] font-semibold leading-none tracking-[-0.02em]">
            {balance.formatted ?? "…"}
            <span className="ml-1 text-[12px] font-medium text-ink-3">
              ${ROB_TOKEN.symbol}
            </span>
          </p>
          <p className="num mt-1 text-[11px] text-ink-3">
            {usd !== null ? formatUsd(usd) : "in your wallet"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3.5">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[12.5px] font-medium text-accent-ink transition-colors hover:brightness-95"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Spend it to spin
        </Link>
        <Link
          href={ROB_TOKEN.route}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          About $ROB
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
