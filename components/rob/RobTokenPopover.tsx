"use client";

import { ArrowUpRight, LineChart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { ROB_MARKET_URL, ROB_TOKEN } from "@/data/rob-token";
import { formatUsd } from "@/lib/formatters";
import { useRobBalance, useRobMarketData } from "@/lib/use-rob";
import { cn } from "@/lib/utils";
import { RobContractBadge, RobOfficialPill } from "./RobContract";

/**
 * The $ROB indicator that lives in both headers: a small chip that opens a
 * popover (a bottom sheet on phones) summarising the token — live price when a
 * market backs it, the connected wallet's balance, the verifiable contract, and
 * the few things you can actually do with it. Deliberately not a buy widget:
 * the actions are "use it to spin", "read its page", "see its market", never
 * "BUY NOW".
 *
 * Mechanics mirror WalletButton — open state, outside-click and Escape to
 * close — so the two header popovers behave identically.
 */
export function RobTokenPopover({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const market = useRobMarketData();
  const balance = useRobBalance();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="$ROB token"
        className="glass-chip inline-flex h-9 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-sm font-medium text-ink"
      >
        <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
          <TokenAvatar
            address={ROB_TOKEN.address}
            symbol={ROB_TOKEN.symbol}
            logoUrl={market.logoUrl}
            size={24}
            rounded="none"
          />
        </span>
        <span className="num text-[12.5px]">${ROB_TOKEN.symbol}</span>
        {market.price !== null ? (
          <span className="num hidden text-[12px] text-ink-3 lg:inline">
            {formatUsd(market.price)}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          {/* Backdrop only on phones, where the panel is a bottom sheet. */}
          <span
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-[rgb(var(--ink-rgb)_/_0.28)] sm:hidden"
          />
          <div
            role="menu"
            className={cn(
              "glass-nav glass-reflection z-50 rounded-[22px] p-3",
              "max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3",
              "sm:absolute sm:right-0 sm:top-[calc(100%+10px)] sm:w-[300px]",
            )}
          >
            <div className="flex items-center gap-2.5 px-1 pt-0.5">
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                <TokenAvatar
                  address={ROB_TOKEN.address}
                  symbol={ROB_TOKEN.symbol}
                  logoUrl={market.logoUrl}
                  size={36}
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
            </div>

            <div className="mt-3 flex items-end justify-between gap-2 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.04)] px-3 py-2.5">
              <div>
                <p className="micro">Price</p>
                <p className="num mt-1 text-[18px] font-semibold leading-none tracking-[-0.02em]">
                  {market.price !== null ? formatUsd(market.price) : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="micro">Your balance</p>
                <p className="num mt-1 text-[14px] font-semibold leading-none">
                  {!balance.isConnected
                    ? "—"
                    : balance.formatted !== null
                      ? `${balance.formatted}`
                      : "…"}
                </p>
              </div>
            </div>

            <RobContractBadge className="mt-2.5" />

            <div className="mt-3 space-y-1">
              <Link
                role="menuitem"
                href="/app"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl bg-accent-soft px-2.5 py-2 text-left text-[13px] font-medium text-accent-ink transition-colors hover:brightness-95"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Spend $ROB to spin
              </Link>
              <Link
                role="menuitem"
                href={ROB_TOKEN.route}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
              >
                <LineChart className="h-3.5 w-3.5" aria-hidden="true" />
                About $ROB
              </Link>
              <a
                role="menuitem"
                href={ROB_MARKET_URL}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
              >
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                View market &amp; trade
              </a>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
