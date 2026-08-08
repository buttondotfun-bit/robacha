"use client";

import { ArrowUpRight, LineChart } from "lucide-react";
import { ROB_MARKET_URL, ROB_TOKEN } from "@/data/rob-token";
import { explorerUrl } from "@/lib/config";
import { formatUsd } from "@/lib/formatters";
import { useRobMarketData } from "@/lib/use-rob";
import { cn } from "@/lib/utils";

/**
 * The live $ROB market, read from the same liquidity-gated source every reward
 * token uses. Every figure is shown only when a sufficiently liquid pair backs
 * it and the upstream reported it — otherwise "—". Nothing here is authored,
 * padded, or projected: no target price, no "undervalued", no supply-percent
 * math. It is a reading of a public market with a link to go check it.
 */

function pctColor(change: number): string {
  if (change > 0) return "text-[#3f9142]";
  if (change < 0) return "text-[#d8642f]";
  return "text-ink-2";
}

function formatPct(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-3.5 py-3">
      <p className="micro">{label}</p>
      <p
        className={cn(
          "num mt-1.5 text-[16px] font-semibold leading-none tracking-[-0.02em]",
          valueClass ?? "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function RobMarketStats({ className }: { className?: string }) {
  const market = useRobMarketData();
  const contractLink = explorerUrl("token", ROB_TOKEN.address);
  const pairLink = market.pairAddress
    ? explorerUrl("address", market.pairAddress)
    : null;

  const price = market.price;
  const dash = "—";

  return (
    <div className={cn("glass-card rounded-[22px] p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft">
            <LineChart className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
          </span>
          <p className="text-[13px] font-semibold tracking-[-0.02em]">
            ${ROB_TOKEN.symbol} market
          </p>
        </div>
        <p className="num text-[11px] text-ink-3">
          ROB/WETH{market.dex ? ` · ${market.dex}` : ""} · Robinhood Chain
        </p>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <p className="num text-[30px] font-semibold leading-none tracking-[-0.03em]">
          {price !== null ? formatUsd(price) : dash}
        </p>
        {market.change24h !== null ? (
          <p
            className={cn(
              "num pb-0.5 text-[13px] font-semibold",
              pctColor(market.change24h),
            )}
          >
            {formatPct(market.change24h)}
            <span className="ml-1 text-[10.5px] font-medium text-ink-3">24h</span>
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Market cap"
          value={
            market.marketCap !== null
              ? formatUsd(market.marketCap, { compact: true })
              : market.fdv !== null
                ? formatUsd(market.fdv, { compact: true })
                : dash
          }
        />
        <Stat
          label="Liquidity"
          value={
            market.liquidityUsd !== null
              ? formatUsd(market.liquidityUsd, { compact: true })
              : dash
          }
        />
        <Stat
          label="24h volume"
          value={
            market.volume24h !== null
              ? formatUsd(market.volume24h, { compact: true })
              : dash
          }
        />
        <Stat
          label="24h change"
          value={market.change24h !== null ? formatPct(market.change24h) : dash}
          valueClass={
            market.change24h !== null ? pctColor(market.change24h) : "text-ink"
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3.5 text-[11.5px]">
        <a
          href={ROB_MARKET_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          View chart &amp; trade
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        {contractLink ? (
          <a
            href={contractLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            $ROB contract
          </a>
        ) : null}
        {pairLink ? (
          <a
            href={pairLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            Pool contract
          </a>
        ) : null}
      </div>

      <p className="mt-3 max-w-[70ch] text-[11px] leading-relaxed text-ink-3">
        {price !== null
          ? "Live market data from the ROB/WETH pool — it moves constantly and can go down as well as up. Always check the contract address above before you trade."
          : "No sufficiently liquid market is quoting $ROB right now, so no price is shown rather than an unreliable one. The contract is still verifiable above."}
      </p>
    </div>
  );
}
