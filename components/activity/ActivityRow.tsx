"use client";

import { Coins, RefreshCw, Sparkles, Trophy, Undo2 } from "lucide-react";
import { formatUnits } from "viem";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { explorerUrl } from "@/lib/config";
import {
  formatAge,
  formatAmount,
  shortAddress,
  shortHash,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useTokenMarket } from "@/lib/use-token-market";
import type { ActivityEvent } from "@/types/activity";

const KIND_VERB: Record<ActivityEvent["kind"], string> = {
  spin: "spun",
  "round-settled": "Round settled",
  "reward-assigned": "won",
  claim: "claimed",
  refund: "refunded",
  "pool-update": "Pool update",
};

const KIND_ICON: Record<ActivityEvent["kind"], typeof Coins> = {
  spin: Sparkles,
  "round-settled": RefreshCw,
  "reward-assigned": Trophy,
  claim: Coins,
  refund: Undo2,
  "pool-update": RefreshCw,
};

/** Human-readable amount, or null when the indexer has no decimals for it. */
function amountOf(event: ActivityEvent): string | null {
  if (!event.amountRaw || event.tokenDecimals == null) return null;
  return formatAmount(Number(formatUnits(BigInt(event.amountRaw), event.tokenDecimals)));
}

/**
 * One indexed event. Everything rendered here comes from the log — there is no
 * fallback copy that would make a sparse event look richer than it is.
 */
export function ActivityRow({
  event,
  now,
  variant = "rail",
  className,
}: {
  event: ActivityEvent;
  /** Reference time, from `useNow()`. */
  now: number;
  variant?: "rail" | "table";
  className?: string;
}) {
  const market = useTokenMarket(event.token ? [event.token] : []);
  const age = formatAge((now - event.at) / 60_000);
  const amount = amountOf(event);
  const Icon = KIND_ICON[event.kind];
  const txUrl = explorerUrl("tx", event.txHash);

  const isSystem =
    event.kind === "pool-update" || event.kind === "round-settled";

  if (isSystem) {
    return (
      <div
        className={cn(
          "glass-quiet flex items-center gap-2.5 rounded-2xl px-3 py-2.5",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">
          {KIND_VERB[event.kind]}
          {event.roundId != null ? ` · round #${event.roundId}` : ""}
          {event.note ? ` · ${event.note}` : ""}
        </p>
        <span className="num shrink-0 text-[11px] text-ink-3">{age}</span>
      </div>
    );
  }

  return (
    <div
      data-rarity={event.rarity}
      className={cn(
        "flex items-center gap-3",
        variant === "rail"
          ? "glass-quiet rounded-2xl px-3 py-2.5"
          : "px-1 py-3",
        className,
      )}
    >
      {event.token ? (
        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
          <TokenAvatar
            address={event.token}
            symbol={event.tokenSymbol ?? null}
            logoUrl={event.token ? market.get(event.token)?.logoUrl : null}
            size={36}
            rounded="none"
          />
        </span>
      ) : (
        <span className="glass-quiet flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-4 w-4 text-ink-3" aria-hidden="true" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] leading-snug">
          <span className="num text-ink-2">
            {event.wallet ? shortAddress(event.wallet) : "—"}
          </span>{" "}
          <span className="text-ink-3">{KIND_VERB[event.kind]}</span>{" "}
          <span className="font-semibold text-ink">
            {amount ?? "—"}
            {event.tokenSymbol ? ` ${event.tokenSymbol}` : ""}
          </span>
        </p>
        <p className="num mt-0.5 truncate text-[11px] text-ink-3">
          {age}
          {txUrl ? (
            <>
              {" · "}
              <a
                href={txUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-ink-2"
              >
                {shortHash(event.txHash)}
              </a>
            </>
          ) : (
            ` · ${shortHash(event.txHash)}`
          )}
        </p>
      </div>

      {event.status === "pending" ? (
        <span className="num shrink-0 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-2 py-0.5 text-[10px] text-ink-3">
          pending
        </span>
      ) : null}
    </div>
  );
}
