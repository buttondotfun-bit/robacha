"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/Glass";
import { projectByAddress, projectHref } from "@/data/projects";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import { formatOdds, formatRange } from "@/lib/formatters";
import { useAnalytics } from "@/lib/use-analytics";
import { useLineup } from "@/lib/use-lineup";
import { formatRoundClock, useLiveRound } from "@/lib/use-live-round";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";

/**
 * The Genesis Pool page. Everything is read live from the pool/registry/vault
 * contracts and the analytics indexer; when the pool can't be read it says so
 * rather than drawing an empty shell.
 */
export function GenesisPoolClient() {
  const { pool, unavailableReason } = usePool();
  const round = useLiveRound();
  const { tokens: lineup } = useLineup();
  const { analytics } = useAnalytics();
  const market = useTokenMarket(pool?.entries.map((e) => e.token) ?? []);

  if (!pool) {
    return (
      <PageContainer width="wide" className="py-16">
        <div className="glass-panel overflow-hidden rounded-[24px]">
          <UnavailableState kind={unavailableReason ?? "no-active-pool"} />
        </div>
      </PageContainer>
    );
  }

  // Rarest first.
  const entries = [...pool.entries].sort((a, b) => b.tierIndex - a.tierIndex);
  const assets = new Set(pool.entries.map((e) => e.token.toLowerCase())).size;
  const vaultLink = contracts.rewardVault ? explorerUrl("address", contracts.rewardVault) : null;
  const liveAddrs = new Set(pool.entries.map((e) => e.token.toLowerCase()));
  const upcoming = lineup.filter((t) => !liveAddrs.has(t.address.toLowerCase()));

  return (
    <PageContainer width="wide" className="pb-16 pt-8">
      <nav className="mb-4 text-[12px] text-ink-3" aria-label="Breadcrumb">
        <Link href="/pools" className="hover:text-ink-2">Pools</Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <span className="text-ink-2">{pool.name || "Genesis Pool"}</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
            <p className="micro text-accent-ink">Live reward pool</p>
          </div>
          <h1 className="text-page-title mt-2">{pool.name || `Pool #${pool.poolId}`}</h1>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-2">
            The original Robacha reward pool, drawn by the{" "}
            <Link href="/machines/genesis" className="underline decoration-dotted underline-offset-2 hover:text-ink">Genesis Machine</Link>.
            Everything below is read live from the contract.
          </p>
        </div>
        <ButtonLink href="/app" variant="primary" size="lg">
          Spin this pool <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>

      {/* Stat row */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Assets" value={String(assets)} />
        <Stat label="Spin price" value={`${pool.spinPriceDisplay} ${chainConfig.nativeSymbol}`} />
        <Stat
          label="Current round"
          value={
            round.status === "open" && round.msLeft !== null
              ? formatRoundClock(round.msLeft)
              : round.status === "closing"
                ? "Closing"
                : round.status === "none"
                  ? "Next spin opens one"
                  : "—"
          }
          tone={round.status === "open" ? "accent" : undefined}
        />
        <Stat label="Spins per round" value={String(pool.maxEntriesPerRound)} />
      </div>

      {/* Odds */}
      <section className="mt-8">
        <SectionHeader eyebrow="Odds" title="Published tier probabilities." className="mb-4" />
        <ul className="flex flex-wrap gap-1.5">
          {pool.tiers.map((t) => (
            <li key={t.index} data-rarity={t.rarity}>
              <RarityChip rarity={t.rarity} size="sm" suffix={`${t.probabilityPercent}%`} />
            </li>
          ))}
        </ul>
      </section>

      {/* Inside the pool */}
      <section className="mt-8">
        <SectionHeader eyebrow="Inside the pool" title="Every reward asset." className="mb-4" />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {entries.map((e) => {
            const project = projectByAddress(e.token);
            const href = project ? projectHref(project) : `/projects/${e.token}`;
            return (
              <li key={`${e.token}-${e.tierIndex}`} data-rarity={e.rarity} className="glass-quiet flex items-center gap-3 rounded-[14px] p-3">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                  <TokenAvatar address={e.token} symbol={e.symbol} logoUrl={market.get(e.token)?.logoUrl} size={40} rounded="none" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={href} className="truncate text-[13px] font-semibold hover:underline">
                    {project?.name ?? e.name ?? "Unknown token"}
                  </Link>
                  <p className="num mt-0.5 text-[11px] text-ink-3">
                    {e.minDisplay !== null && e.maxDisplay !== null ? formatRange(e.minDisplay, e.maxDisplay) : "—"}
                    {e.availableDisplay !== null ? ` · ${e.availableDisplay.toLocaleString("en-US", { maximumFractionDigits: 0 })} left` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <RarityChip rarity={e.rarity} size="xs" />
                  <p className="num mt-1 text-[10.5px] text-ink-3">{formatOdds(e.oddsPercent)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Prize vault + history */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-[18px] p-5">
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">Prize vault</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            Rewards are custodied by the vault contract and paid out on settle.
            Each asset&rsquo;s available inventory is shown above.
          </p>
          {vaultLink ? (
            <a href={vaultLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">
              View the vault on the explorer <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        <div className="glass-card rounded-[18px] p-5">
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">Pool history</h2>
          {analytics ? (
            <dl className="mt-3 grid grid-cols-3 gap-3">
              <HistoryStat label="Spins" value={analytics.totals.spins} />
              <HistoryStat label="Rounds" value={analytics.totals.rounds} />
              <HistoryStat label="Rewards" value={analytics.totals.prizes} />
            </dl>
          ) : (
            <p className="mt-3 text-[12.5px] text-ink-3">Reading round history…</p>
          )}
          <Link href="/verify" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-ink-2 hover:text-ink">
            Verify a round <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 ? (
        <section className="mt-8">
          <SectionHeader eyebrow="Entering the machine" title="Lined up next." className="mb-4" />
          <ul className="flex flex-wrap gap-2">
            {upcoming.map((t) => (
              <li key={t.address}>
                <GlassChip as="span" className="h-8 text-[12px]">
                  ${t.symbol}
                  <span className="text-ink-3">· {!t.onThisChain ? "Watching" : t.allowlisted ? "Approved" : "Lined up"}</span>
                </GlassChip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageContainer>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3">
      <p className="micro text-ink-3">{label}</p>
      <p className={`num mt-1.5 text-[15px] font-semibold leading-none tracking-[-0.02em] ${tone === "accent" ? "text-accent-ink" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function HistoryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="micro text-ink-3">{label}</dt>
      <dd className="num mt-1 text-[18px] font-semibold">{value.toLocaleString("en-US")}</dd>
    </div>
  );
}
