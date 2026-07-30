"use client";

import { Loader2 } from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RobachaCapsuleRing } from "@/components/brand/RobachaLogo";
import { RarityChip } from "@/components/shared/RarityChip";
import { chainConfig } from "@/lib/config";
import { formatOdds } from "@/lib/formatters";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";

/**
 * The hero's product visual: a capsule machine that shows the live pool.
 *
 * When a pool is active it lists that pool's real reward slots, real logos and
 * real published odds. When there is no active pool it still renders the
 * machine — the brand needs an anchor in the hero — but it states plainly that
 * no pool is open rather than displaying an example one.
 */
export function HeroConsole() {
  const { pool, unavailableReason, isLoading } = usePool();
  const market = useTokenMarket(pool?.entries.map((e) => e.token) ?? []);

  const slots = pool?.entries.slice(0, 3) ?? [];

  return (
    <div className="relative">
      {/* Ambient glow behind the machine */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.22),transparent_68%)]"
      />

      <div className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[30px] p-5">
        <span className="noise-overlay" aria-hidden="true" />

        {/* Machine head */}
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <RobachaCapsuleRing style={{ height: 30, width: 30 }} />
            <div>
              <p className="text-[13.5px] font-semibold leading-none tracking-[-0.02em]">
                {pool ? pool.name : "Reward machine"}
              </p>
              {/* The name is already the line above, and the version number
                  was dropped from marketing — so this identifies the pool
                  without repeating either. */}
              <p className="num mt-1 text-[11px] leading-none text-ink-3">
                {pool ? `Pool #${pool.poolId}` : chainConfig.name}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium ${
              pool
                ? "bg-[rgba(204,255,0,0.35)] text-accent-ink"
                : "bg-[rgb(var(--ink-rgb)_/_0.06)] text-ink-3"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <span
                className={`h-1.5 w-1.5 rounded-full ${pool ? "pulse-dot bg-[#8ec500]" : "bg-ink-3"}`}
                aria-hidden="true"
              />
            )}
            {pool ? "Live" : isLoading ? "Loading" : "No pool open"}
          </span>
        </div>

        {/* Capsule chamber */}
        <div className="relative mt-4 overflow-hidden rounded-[22px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[linear-gradient(165deg,rgb(var(--edge-rgb)_/_0.85),rgba(247,248,243,0.5))] p-4">
          {pool && slots.length ? (
            <ul className="space-y-2">
              {slots.map((entry) => (
                <li
                  key={`${entry.token}-${entry.tierIndex}`}
                  data-rarity={entry.rarity}
                  className="glass-card flex items-center gap-3 rounded-2xl p-2.5"
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.85)] [container-type:inline-size]">
                    <TokenAvatar
                      address={entry.token}
                      symbol={entry.symbol}
                      logoUrl={market.get(entry.token)?.logoUrl}
                      size={40}
                      rounded="none"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-snug">
                      {entry.name ?? "Unknown token"}
                    </p>
                    <p className="num mt-0.5 text-[11px] text-ink-3">
                      {entry.symbol ? `$${entry.symbol}` : "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <RarityChip rarity={entry.rarity} size="xs" />
                    <p className="num mt-1 text-[10.5px] text-ink-3">
                      {formatOdds(entry.oddsPercent)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyChamber
              reason={
                isLoading
                  ? "Loading the pool…"
                  : unavailableReason === "not-configured"
                    ? "No pool is connected to this site yet."
                    : unavailableReason === "rpc-unavailable"
                      ? `Couldn’t reach ${chainConfig.name}.`
                      : "No pool is open right now. Rewards and odds show up here the second one starts."
              }
            />
          )}
        </div>

        {/* Published odds strip */}
        {pool ? (
          <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
            {pool.tiers.map((tier) => (
              <span key={tier.index} data-rarity={tier.rarity}>
                <RarityChip
                  rarity={tier.rarity}
                  size="xs"
                  suffix={`${tier.probabilityPercent}%`}
                />
              </span>
            ))}
          </div>
        ) : (
          <p className="relative mt-4 text-[11.5px] leading-relaxed text-ink-3">
            Everything here comes straight from the pool itself — the rewards,
            the odds and how much is left. Nothing is made up.
          </p>
        )}
      </div>
    </div>
  );
}

/** The machine with nothing loaded — drawn, never filled with an example. */
function EmptyChamber({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div aria-hidden="true" className="relative h-24 w-24">
        <span className="absolute inset-0 rounded-full border border-dashed border-[rgb(var(--ink-rgb)_/_0.12)]" />
        <span className="absolute inset-[18%] rounded-full border border-[rgb(var(--ink-rgb)_/_0.08)]" />
        <span className="absolute inset-[36%] rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.28),transparent_70%)]" />
      </div>
      <p className="mt-4 max-w-[34ch] text-[12.5px] leading-relaxed text-ink-2">
        {reason}
      </p>
    </div>
  );
}
