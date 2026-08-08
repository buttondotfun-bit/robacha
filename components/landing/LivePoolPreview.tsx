"use client";

import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { LightField } from "@/components/shared/AmbientBackground";
import { RarityChip } from "@/components/shared/RarityChip";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { PageContainer } from "@/components/shared/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/Glass";
import { chainConfig } from "@/lib/config";
import { formatOdds, formatRange } from "@/lib/formatters";
import { formatRoundClock, useLiveRound } from "@/lib/use-live-round";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";

/**
 * The live pool, read from the gacha contract.
 *
 * Pre-launch there is no pool to show, and this renders the reason rather than
 * an illustrative one. Nothing in this section is authored.
 */
export function LivePoolPreview() {
  const { pool, unavailableReason, isLoading, refetch } = usePool();
  const market = useTokenMarket(pool?.entries.map((e) => e.token) ?? []);

  const round = useLiveRound();

  /**
   * The rarest prizes first, then as many of the rest as fit.
   *
   * This used to take the first six slots in contract order. Slots are stored
   * grouped by tier, common first, so once the pool grew past six the preview
   * filled up entirely with commons — while the tier chips directly beneath it
   * advertised a rare and a legendary tier that nothing on screen showed. The
   * two best prizes in the machine were the ones being hidden.
   *
   * Sorting by tier descending puts the legendary slot at the top, which is
   * both the honest thing to show next to those odds and the thing anyone
   * looking at a gacha wants to see first.
   */
  const preview = [...(pool?.entries ?? [])]
    .sort((a, b) => b.tierIndex - a.tierIndex)
    .slice(0, 8);
  const hidden = (pool?.entries.length ?? 0) - preview.length;

  return (
    <section className="relative py-16 sm:py-20">
      <LightField tone="green" size={800} className="right-[2%] top-[10%] opacity-70" />

      <PageContainer width="wide" className="relative">
        <div className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-3 sm:p-4">
          <span className="noise-overlay" aria-hidden="true" />

          {!pool ? (
            <UnavailableState
              kind={unavailableReason ?? "no-active-pool"}
              action={
                <Button
                  variant="secondary"
                  size="md"
                  onClick={refetch}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  Retry
                </Button>
              }
            />
          ) : (
            <div className="relative grid gap-3 lg:grid-cols-[1fr_1.1fr]">
              <div className="glass-quiet rounded-[24px] p-6 sm:p-7">
                <div className="flex items-center gap-2">
                  <span
                    className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]"
                    aria-hidden="true"
                  />
                  <p className="micro">Live reward pool</p>
                </div>

                <h2 className="text-section-title mt-3">
                  {pool.name || `Pool #${pool.poolId}`}
                </h2>
                <p className="mt-3 max-w-[40ch] text-[13.5px] leading-relaxed text-ink-2">
                  Everything below is live from the pool itself — what’s inside,
                  your odds, and how much is left.
                </p>

                <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5">
                  <Fact label="Prizes inside" value={String(pool.entries.length)} />
                  <Fact
                    label="Spin price"
                    value={`${pool.spinPriceDisplay} ${chainConfig.nativeSymbol}`}
                  />
                  {/* The current round's clock. This used to read the pool
                      version's end date under a "Closes in" label, which for an
                      open-ended pool printed "Open-ended" — a value that
                      contradicted its own label. */}
                  <Fact
                    label="Round closes in"
                    value={
                      round.status === "open" && round.msLeft !== null
                        ? formatRoundClock(round.msLeft)
                        : round.status === "closing"
                          ? "Closing now"
                          : round.status === "none"
                            ? "Next spin starts one"
                            : "—"
                    }
                    accent={round.status === "open"}
                  />
                  <Fact
                    label="Spins per round"
                    value={String(pool.maxEntriesPerRound)}
                  />
                </dl>

                <div className="mt-7 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-5">
                  <p className="micro mb-3">Your odds</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {pool.tiers.map((tier) => (
                      <li key={tier.index} data-rarity={tier.rarity}>
                        <RarityChip
                          rarity={tier.rarity}
                          size="sm"
                          suffix={`${tier.probabilityPercent}%`}
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <ButtonLink
                  href="/app"
                  variant="secondary"
                  size="md"
                  className="mt-7"
                >
                  See the whole pool
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              </div>

              <div className="glass-card rounded-[22px] p-5">
                <div className="flex items-center justify-between">
                  <p className="micro">What’s inside</p>
                  <GlassChip dot className="h-6 text-[10px]">
                    Live
                  </GlassChip>
                </div>
                <ul className="mt-4 space-y-2">
                  {preview.map((entry) => (
                    <li
                      key={`${entry.token}-${entry.tierIndex}`}
                      data-rarity={entry.rarity}
                      className="glass-quiet flex items-center gap-3 rounded-2xl p-2.5"
                    >
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                        <TokenAvatar
                          address={entry.token}
                          symbol={entry.symbol}
                          logoUrl={market.get(entry.token)?.logoUrl}
                          size={40}
                          rounded="none"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">
                          {entry.name ?? "Unknown token"}
                        </p>
                        <p className="num mt-0.5 text-[11px] text-ink-3">
                          {entry.minDisplay !== null && entry.maxDisplay !== null
                            ? formatRange(entry.minDisplay, entry.maxDisplay)
                            : "—"}
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
                {hidden > 0 ? (
                  <p className="num mt-3 text-[11px] text-ink-3">
                    +{hidden} more {hidden === 1 ? "prize" : "prizes"} in the
                    machine — <Link href="/app" className="underline decoration-dotted underline-offset-2 hover:text-ink-2">see the full pool</Link>
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </section>
  );
}

function Fact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="micro">{label}</dt>
      <dd
        className={`num mt-2 text-[20px] font-semibold leading-none tracking-[-0.03em] ${
          accent ? "text-accent-ink" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
