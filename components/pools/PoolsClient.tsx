"use client";

import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { machineBySlug } from "@/data/machines";
import { projectByAddress, projectHref } from "@/data/projects";
import { contracts, explorerUrl, isStockMachineLive } from "@/lib/config";
import { StockPoolCard } from "./StockPoolCard";
import { formatOdds } from "@/lib/formatters";
import { useLiveRound } from "@/lib/use-live-round";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";

/**
 * The pools directory — the canonical list of Robacha reward pools.
 *
 * There is one live pool today (Genesis); the page is built so that reads as an
 * intentional, premium feature rather than an empty directory, while the
 * components are generic enough for more pools to appear when configured.
 * A Robacha "pool" is a published prize inventory a machine draws from — not an
 * AMM liquidity pool, and the copy says so. No pool, odds or inventory is
 * fabricated; live state is read from chain.
 */
export function PoolsClient() {
  const { pool, unavailableReason } = usePool();
  const round = useLiveRound();
  const wallet = useWallet();
  const history = useWalletHistory();
  const market = useTokenMarket(pool?.entries.map((e) => e.token) ?? []);
  const machine = machineBySlug("genesis");

  const entries = pool
    ? Array.from(new Map(pool.entries.map((e) => [e.token.toLowerCase(), e])).values()).sort(
        (a, b) => b.tierIndex - a.tierIndex,
      )
    : [];
  const assetCount = entries.length;
  const preview = entries.slice(0, 6);
  const moreCount = Math.max(0, assetCount - preview.length);
  const vaultLink = contracts.rewardVault ? explorerUrl("address", contracts.rewardVault) : null;
  const poolLink = contracts.gacha ? explorerUrl("address", contracts.gacha) : null;

  return (
    <>
      {/* Hero */}
      <section className="relative pb-2 pt-8 sm:pt-10">
        <PageContainer width="wide">
          <p className="micro">Pools</p>
          <h1 className="text-page-title mt-2.5">Reward pools.</h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
            Every Robacha machine draws from a published reward pool. See
            what&rsquo;s loaded, inspect the odds and check every pool before you
            spin.
          </p>
          <p className="num mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
            <span>{isStockMachineLive ? "2 live pools" : "1 live pool"}</span>
            {assetCount > 0 ? <span>· {assetCount} Genesis assets</span> : null}
            <span>· {isStockMachineLive ? "Genesis & Stock machines live" : "Genesis Machine live"}</span>
          </p>

          {/* Concept diagram */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11.5px] font-medium">
            {["Projects", "Pool", "Machine", "Your pull"].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-[rgb(var(--line-rgb)_/_0.12)] bg-[rgb(var(--surface-rgb)_/_0.6)] px-3 py-1.5 text-ink-2">
                  {step}
                </span>
                {i < arr.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" /> : null}
              </span>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Live now — Genesis feature */}
      <section className="relative py-6">
        <PageContainer width="wide">
          <SectionHeader eyebrow="Live now" title="The Genesis Pool." className="mb-5" />
          {!pool ? (
            <div className="rounded-[22px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] p-8">
              <p className="text-[14px] font-medium">Genesis Pool</p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                {unavailableReason ? "Live pool data is temporarily unavailable." : "Loading live pool state…"}
              </p>
              <Link href="/pools/genesis" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
                Open Genesis Pool <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              {/* Left: info */}
              <div className="glass-panel glass-reflection relative overflow-hidden rounded-[24px] p-6">
                <span className="noise-overlay" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
                    <span className="micro text-accent-ink">Live · drawn by {machine?.name ?? "Genesis Machine"}</span>
                  </div>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">{pool.name || `Pool #${pool.poolId}`}</h3>
                  <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-ink-2">
                    The original Robacha reward pool. {assetCount} projects, published odds, drawn onchain.
                  </p>

                  {/* Odds */}
                  <div className="mt-5">
                    <p className="micro mb-2" title="Pool odds are published before a round begins and apply to the active pool configuration.">Current odds</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {pool.tiers.map((t) => (
                        <li key={t.index} data-rarity={t.rarity}>
                          <RarityChip rarity={t.rarity} size="sm" suffix={`${t.probabilityPercent}%`} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Round */}
                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.03)] p-3.5">
                    <div>
                      <p className="micro text-ink-3">Current round</p>
                      <p className="num mt-1 text-[15px] font-semibold">
                        {round.status === "open" ? "Open" : round.status === "closing" ? "Closing" : round.status === "none" ? "Next spin opens one" : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="micro text-ink-3">Inventory</p>
                      <p className="num mt-1 text-[15px] font-semibold">{assetCount} assets loaded</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <ButtonLink href="/pools/genesis" variant="secondary" size="md">Open Genesis Pool <ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink>
                    <ButtonLink href="/app" variant="primary" size="md">Spin the machine</ButtonLink>
                  </div>
                </div>
              </div>

              {/* Right: capsule composition */}
              <div className="relative overflow-hidden rounded-[24px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[radial-gradient(120%_120%_at_100%_0%,rgba(204,255,0,0.08),transparent_60%),radial-gradient(120%_120%_at_0%_100%,rgba(255,119,172,0.08),transparent_60%)] p-6">
                <p className="micro text-ink-3">Inside the pool</p>
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-3">
                  {preview.map((e) => {
                    const project = projectByAddress(e.token);
                    const href = project ? projectHref(project) : `/projects/${e.token}`;
                    return (
                      <Link key={e.token} href={href} data-rarity={e.rarity} className="rarity-glass glass-highlight group flex flex-col items-center rounded-[16px] p-3 text-center transition-transform hover:-translate-y-0.5">
                        <span className="h-11 w-11 overflow-hidden rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                          <TokenAvatar address={e.token} symbol={e.symbol} logoUrl={market.get(e.token)?.logoUrl} size={44} rounded="none" />
                        </span>
                        <span className="num mt-2 truncate text-[11px] font-medium">{e.symbol ? `$${e.symbol}` : "?"}</span>
                        <span className="mt-1"><RarityChip rarity={e.rarity} size="xs" /></span>
                      </Link>
                    );
                  })}
                </div>
                {moreCount > 0 ? (
                  <Link href="/pools/genesis" className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-ink-2 hover:text-ink">
                    +{moreCount} more · view all assets <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </PageContainer>
      </section>

      {/* Live now — Stock Pool (renders only when the stock machine is live) */}
      <StockPoolCard />

      {/* Inside genesis — asset rail */}
      {entries.length > 0 ? (
        <section className="relative py-6">
          <PageContainer width="wide">
            <SectionHeader eyebrow="Inside Genesis" title="Every reward asset." className="mb-4" />
            <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
              {entries.map((e) => {
                const project = projectByAddress(e.token);
                const href = project ? projectHref(project) : `/projects/${e.token}`;
                return (
                  <Link key={e.token} href={href} data-rarity={e.rarity} className="glass-card group flex w-[160px] shrink-0 flex-col rounded-[16px] p-4 transition-transform hover:-translate-y-0.5">
                    <span className="h-10 w-10 overflow-hidden rounded-[11px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                      <TokenAvatar address={e.token} symbol={e.symbol} logoUrl={market.get(e.token)?.logoUrl} size={40} rounded="none" />
                    </span>
                    <p className="mt-2.5 truncate text-[13px] font-semibold">{project?.name ?? e.name ?? "Token"}</p>
                    <p className="num text-[11px] text-ink-3">{e.symbol ? `$${e.symbol}` : ""}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <RarityChip rarity={e.rarity} size="xs" />
                      <span className="num text-[10.5px] text-ink-3">{formatOdds(e.oddsPercent)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </PageContainer>
        </section>
      ) : null}

      {/* Your genesis history */}
      {wallet.isConnected && history.history && history.history.rewards.length > 0 ? (
        <section className="relative py-3">
          <PageContainer width="wide">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-5">
              <p className="micro text-ink-3">Your Genesis history</p>
              <HistoryStat label="Rounds joined" value={history.history.rounds} />
              <HistoryStat label="Projects discovered" value={history.history.rewards.length} />
              <HistoryStat label="Rewards pulled" value={history.history.rewards.reduce((s, r) => s + r.count, 0)} />
              <Link href="/bag" className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
                View My Bag <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </PageContainer>
        </section>
      ) : null}

      {/* What is a pool */}
      <section className="relative py-6">
        <PageContainer width="wide">
          <SectionHeader eyebrow="What is a pool?" title="A published prize inventory." description="A Robacha pool is the set of assets a machine can pull from. Every active pool exposes its inventory, ranges and probabilities before the draw. It is not an AMM liquidity pool." className="mb-5" />
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Assets are loaded", "Projects are funded into the vault as reward inventory."],
              ["02", "Odds are published", "Every tier's probability is set before a round sells."],
              ["03", "The machine draws", "A round settles using verifiable onchain randomness."],
              ["04", "The result is settled", "Your reward is assigned and claimable from your wallet."],
            ].map(([n, t, b]) => (
              <li key={n} className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4">
                <span className="num text-[12px] font-semibold text-accent-ink">{n}</span>
                <p className="mt-1.5 text-[13.5px] font-semibold tracking-[-0.02em]">{t}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{b}</p>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      {/* Transparency */}
      <section className="relative py-6">
        <PageContainer width="wide">
          <SectionHeader eyebrow="Transparency" title="Everything in the pool is checkable." className="mb-4" />
          <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-5 text-[12.5px]">
            {poolLink ? <Ext href={poolLink}>Pool contract</Ext> : null}
            {vaultLink ? <Ext href={vaultLink}>Prize vault</Ext> : null}
            <Link href="/pools/genesis" className="inline-flex items-center gap-1 text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">Published odds</Link>
            <Link href="/verify" className="inline-flex items-center gap-1 text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">Verify a round</Link>
            <Link href="/docs" className="inline-flex items-center gap-1 text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">Contracts &amp; docs</Link>
          </div>
        </PageContainer>
      </section>

      {/* Machines & pools */}
      <section className="relative py-6">
        <PageContainer width="wide">
          <SectionHeader eyebrow="Machines & pools" title="Pools live inside machines." className="mb-4" />
          <Link href="/machines/genesis" className="glass-card group flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-accent-soft text-accent-ink"><Check className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.02em]">{machine?.name ?? "Genesis Machine"}</p>
                <p className="num text-[12px] text-ink-3">Genesis Pool · {assetCount} assets</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 group-hover:text-ink">View machine <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
          </Link>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <section className="relative py-10">
        <PageContainer width="wide">
          <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-10">
            <span className="noise-overlay" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-section-title mx-auto max-w-[22ch]">
                The Genesis Pool is live. <span className="text-gradient-accent">{assetCount > 0 ? `${assetCount} projects inside.` : "Projects inside."}</span>
              </h2>
              <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-relaxed text-ink-2">
                One machine pulling from all of them.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <ButtonLink href="/pools/genesis" variant="secondary" size="lg">Open the pool</ButtonLink>
                <ButtonLink href="/app" variant="primary" size="lg">Spin now <ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

function HistoryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="num text-[18px] font-semibold leading-none">{value.toLocaleString("en-US")}</p>
      <p className="micro mt-1 text-ink-3">{label}</p>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">
      {children}
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}
