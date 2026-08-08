"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { formatOdds } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/token";
import { FollowButton } from "./FollowButton";

/**
 * A project card for Discover. Every field traces to a real source (curated
 * registry + live market + pool state + derived discovery stats); a card never
 * invents followers or popularity. Uses the stretched-link pattern so the whole
 * card navigates to the project while Follow and the pool link stay separately
 * clickable and keyboard-accessible.
 */
export interface DiscoverItem {
  address: string;
  name: string;
  ticker: string | null;
  logoUrl?: string | null;
  href: string;
  category?: string;
  machineName?: string;
  poolName?: string;
  poolHref?: string;
  /** Present when the token is in a live pool right now. */
  inMachine?: { rarity: Rarity; oddsPercent: number };
  /** Unique wallets that have discovered it, when known. */
  discoverers?: number | null;
  /** An honest status pill, e.g. "Official" / "Watching" / "Candidate". */
  status?: string;
  /** Metadata couldn't be resolved — show honestly, don't invent a name. */
  unknown?: boolean;
  showFollow?: boolean;
}

function tint(item: DiscoverItem): string {
  if (item.status === "Official")
    return "border-[rgba(163,204,0,0.4)] bg-[rgba(204,255,0,0.05)]";
  const r = item.inMachine?.rarity;
  if (r === "legendary")
    return "border-[rgba(224,180,60,0.32)] bg-[rgba(224,180,60,0.05)]";
  if (r === "rare" || r === "epic")
    return "border-[rgba(120,160,220,0.3)] bg-[rgba(120,160,220,0.045)]";
  return "border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.55)]";
}

export function ProjectCard({ item }: { item: DiscoverItem }) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-[18px] border p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        tint(item),
      )}
    >
      <div className="flex items-start gap-3">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[13px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
          <TokenAvatar address={item.address} symbol={item.ticker} logoUrl={item.logoUrl} size={48} rounded="none" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={item.href}
            className="truncate text-[14.5px] font-semibold tracking-[-0.02em] text-ink after:absolute after:inset-0 hover:underline"
          >
            {item.unknown ? "Unknown token" : item.name}
          </Link>
          <p className="num truncate text-[12px] text-ink-3">
            {item.unknown
              ? item.address.slice(0, 8) + "…"
              : item.ticker
                ? `$${item.ticker}`
                : item.category ?? "Token"}
          </p>
        </div>
        {item.showFollow ? (
          <FollowButton address={item.address} size="xs" />
        ) : item.status ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              item.status === "Official"
                ? "bg-accent-soft text-accent-ink"
                : "bg-[rgb(var(--ink-rgb)_/_0.06)] text-ink-3",
            )}
          >
            {item.status}
          </span>
        ) : null}
      </div>

      {/* Machine + tier + chance */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3">
        {item.machineName ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--ink-rgb)_/_0.04)] px-2 py-0.5 text-[10.5px] font-medium text-ink-2">
            {item.machineName}
          </span>
        ) : null}
        {item.inMachine ? (
          <>
            <span data-rarity={item.inMachine.rarity}>
              <RarityChip rarity={item.inMachine.rarity} size="xs" />
            </span>
            <span className="num text-[11px] text-ink-3">
              {formatOdds(item.inMachine.oddsPercent)} chance
            </span>
          </>
        ) : item.discoverers != null ? (
          <span className="num text-[11.5px] text-ink-2">
            {item.discoverers.toLocaleString("en-US")}{" "}
            <span className="text-ink-3">
              {item.discoverers === 1 ? "explorer" : "explorers"}
            </span>
          </span>
        ) : (
          <span className="text-[11.5px] text-ink-3">Not in a machine yet</span>
        )}
      </div>

      {/* Pool link (separate, clickable above the stretched card link) */}
      <div className="mt-2.5 flex items-center justify-between">
        {item.poolHref && item.poolName ? (
          <Link
            href={item.poolHref}
            className="num relative z-10 inline-flex items-center gap-1 text-[11px] text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            {item.poolName}
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-3 group-hover:text-ink">
          View
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
