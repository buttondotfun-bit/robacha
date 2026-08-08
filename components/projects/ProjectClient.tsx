"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Info,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatUnits } from "viem";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { FollowButton } from "@/components/discover/FollowButton";
import { machineBySlug } from "@/data/machines";
import { projectByAddress, projectHref } from "@/data/projects";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import {
  formatAge,
  formatAmount,
  formatOdds,
  formatRange,
  formatUsd,
  shortAddress,
} from "@/lib/formatters";
import { useActivity } from "@/lib/use-activity";
import { useDiscovery } from "@/lib/use-discovery";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { cn } from "@/lib/utils";

/**
 * A project's complete Robacha identity page.
 *
 * The story leads with the project's relationship to Robacha (machine → pool →
 * rewards → discoverers → activity); market data is kept secondary. Everything
 * is derived from real sources — registry, live pool, discovery logs, wallet
 * history — with honest empty states. This one component serves every project;
 * nothing is hardcoded per token. "Reward asset" never implies partnership.
 */
export function ProjectClient({ address }: { address: string }) {
  const project = projectByAddress(address);
  const market = useTokenMarket([address]);
  const discovery = useDiscovery();
  const { pool } = usePool();
  const wallet = useWallet();
  const history = useWalletHistory();
  const activity = useActivity({ kinds: ["reward-assigned"], limit: 40 });

  const m = market.get(address);
  const entry = pool?.entries.find((e) => e.token.toLowerCase() === address.toLowerCase());
  const stat = discovery.stat(address);
  const machine = machineBySlug(project?.machine ?? "genesis");
  const inMachine = Boolean(entry);

  const name = project?.name ?? m?.name ?? m?.symbol ?? "Project";
  const ticker = project?.ticker ?? m?.symbol ?? null;
  const decimals = entry?.decimals ?? 18;
  const contractLink = explorerUrl("token", address);

  // This project's reward pulls, from the activity feed.
  const pulls = activity.events.filter(
    (e) => e.token?.toLowerCase() === address.toLowerCase(),
  );
  const firstAt = pulls.length ? Math.min(...pulls.map((e) => e.at)) : null;
  const lastAt = pulls.length ? Math.max(...pulls.map((e) => e.at)) : null;
  const roundsWith = new Set(pulls.map((e) => e.roundId).filter(Boolean)).size;

  // The connected wallet's own history with this token.
  const mine = history.history?.rewards.find(
    (r) => r.token.toLowerCase() === address.toLowerCase(),
  );
  const discoveredByMe = Boolean(mine);

  // Related projects — others in the live pool.
  const related = (pool?.entries ?? [])
    .filter((e) => e.token.toLowerCase() !== address.toLowerCase())
    .slice(0, 4);

  const dash = "—";
  const relationship = project?.official ? "Robacha" : "Reward asset";

  return (
    <>
      <PageContainer width="wide" className="pt-8">
        {/* Breadcrumb */}
        <nav className="text-[12px] text-ink-3" aria-label="Breadcrumb">
          <Link href="/discover" className="hover:text-ink-2">Discover</Link>
          <span className="mx-1.5" aria-hidden="true">/</span>
          <span className="text-ink-2">{name}</span>
        </nav>

        {/* Hero */}
        <div className="relative mt-4 overflow-hidden rounded-[24px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.6)] p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,119,172,0.12),transparent_70%)]" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start gap-4">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[rgb(var(--edge-rgb)_/_0.8)] shadow-[0_8px_24px_-12px_rgb(var(--ink-rgb)_/_0.3)] [container-type:inline-size]">
              <TokenAvatar address={address} symbol={ticker} logoUrl={m?.logoUrl} size={64} rounded="none" priority />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-page-title">{name}</h1>
                {ticker ? <span className="num text-[15px] text-ink-3">${ticker}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {inMachine ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,197,0,0.16)] px-2 py-0.5 text-[10.5px] font-medium text-[#3f7d17]">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
                    In the machine
                  </span>
                ) : (
                  <span className="rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-2 py-0.5 text-[10.5px] font-medium text-ink-3">
                    Not currently loaded
                  </span>
                )}
                <RelationshipBadge label={relationship} official={project?.official} />
              </div>

              <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
                {project?.blurb ??
                  (inMachine
                    ? `A reward token currently loaded into the Robacha ${machine?.name ?? "Genesis"} pool on Robinhood Chain.`
                    : "A reward token in the Robacha ecosystem on Robinhood Chain.")}
              </p>

              {/* Identity links */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
                {project?.website ? <Ext href={project.website}>Website</Ext> : null}
                {project?.x ? <Ext href={project.x}>X</Ext> : null}
                {contractLink ? <Ext href={contractLink}>Explorer</Ext> : null}
                <CopyContract address={address} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              {inMachine ? (
                <ButtonLink href="/app" variant="primary" size="md">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Spin to discover
                </ButtonLink>
              ) : (
                <ButtonLink href="/discover" variant="secondary" size="md">
                  Discover more
                </ButtonLink>
              )}
              <div className="flex justify-end">
                <FollowButton address={address} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Robacha status strip */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatusCell label="Machine" value={machine?.name ?? dash} href={machine ? `/machines/${machine.slug}` : undefined} />
          <StatusCell label="Pool" value={inMachine ? "Genesis Pool" : dash} href={inMachine ? "/pools/genesis" : undefined} />
          <StatusCell label="Status" value={inMachine ? "Live" : "Not loaded"} tone={inMachine ? "accent" : undefined} />
          <StatusCell label="Tier" value={entry ? <RarityChip rarity={entry.rarity} size="xs" /> : dash} />
          <StatusCell label="Current chance" value={entry ? formatOdds(entry.oddsPercent) : dash} />
        </div>
      </PageContainer>

      {/* Reward module — the hero of the product story */}
      {inMachine && entry ? (
        <Section eyebrow="Inside the machine" title={`Pull $${ticker ?? "this token"}.`}>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div data-rarity={entry.rarity} className="rarity-glass glass-highlight relative overflow-hidden rounded-[22px] p-6">
              <span className="noise-overlay" aria-hidden="true" />
              <div className="relative flex items-center gap-4">
                <span className="h-14 w-14 overflow-hidden rounded-[14px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                  <TokenAvatar address={address} symbol={ticker} logoUrl={m?.logoUrl} size={56} rounded="none" />
                </span>
                <div>
                  <p className="text-[16px] font-semibold">{name}</p>
                  <div className="mt-1"><RarityChip rarity={entry.rarity} size="sm" /></div>
                </div>
              </div>
              <dl className="relative mt-5 grid grid-cols-3 gap-4">
                <Field label="You could get" value={entry.minDisplay !== null && entry.maxDisplay !== null ? formatRange(entry.minDisplay, entry.maxDisplay) : dash} />
                <Field label="Chance" value={formatOdds(entry.oddsPercent)} />
                <Field label="Available" value={entry.availableDisplay !== null ? `${formatAmount(entry.availableDisplay)}` : dash} />
              </dl>
              <div className="relative mt-5">
                <ButtonLink href="/app" variant="primary" size="md">
                  Spin for {ticker ?? "it"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              </div>
            </div>

            {/* Discovered by */}
            <div className="rounded-[22px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-6">
              <p className="micro flex items-center gap-1 text-ink-3">
                Discovered by Robacha
                <span title="A project is discovered when a wallet is assigned that project's reward through a settled Robacha round." className="cursor-help"><Info className="h-3 w-3" aria-hidden="true" /></span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="num text-[26px] font-semibold leading-none">{stat ? stat.uniqueDiscoverers.toLocaleString("en-US") : discovery.isLoading ? "…" : "0"}</p>
                  <p className="micro mt-1 text-ink-3">unique explorers</p>
                </div>
                <div>
                  <p className="num text-[26px] font-semibold leading-none">{stat ? stat.pullsDistributed.toLocaleString("en-US") : discovery.isLoading ? "…" : "0"}</p>
                  <p className="micro mt-1 text-ink-3">rewards distributed</p>
                </div>
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
                Counted from settled Robacha rounds — a wallet that receives{" "}
                {ticker ? `$${ticker}` : "this token"} as a reward. Inclusion in a
                pool doesn&rsquo;t imply partnership or endorsement.
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {/* Your history / undiscovered */}
      {wallet.isConnected ? (
        <Section eyebrow="Your history" title={discoveredByMe ? `You've discovered ${name}.` : `You haven't found ${name} yet.`}>
          {discoveredByMe && mine ? (
            <div className="flex flex-wrap items-center gap-6 rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-5">
              <div>
                <p className="num text-[20px] font-semibold">{formatAmount(Number(formatUnits(BigInt(mine.amountRaw), decimals)))}</p>
                <p className="micro text-ink-3">total pulled</p>
              </div>
              <div>
                <p className="num text-[20px] font-semibold">{mine.count}</p>
                <p className="micro text-ink-3">{mine.count === 1 ? "pull" : "pulls"}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,197,0,0.14)] px-2.5 py-1 text-[11.5px] font-medium text-[#3f7d17]">
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> Discovered
              </span>
              <Link href="/bag" className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
                View in My Bag <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-5">
              <p className="text-[13.5px] text-ink-2">
                {inMachine ? `It's live in the Genesis Pool right now.` : `It isn't loaded right now — follow it to catch the next drop.`}
              </p>
              {inMachine ? (
                <ButtonLink href="/app" variant="primary" size="md">Spin to discover</ButtonLink>
              ) : (
                <FollowButton address={address} size="sm" />
              )}
            </div>
          )}
        </Section>
      ) : null}

      {/* Recent discoveries */}
      <Section
        eyebrow="Recent discoveries"
        title={`Who's pulling ${ticker ? `$${ticker}` : "it"}.`}
        action={<Link href="/activity" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">View all activity <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
      >
        {activity.isLoading ? (
          <div className="h-24 animate-pulse rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />
        ) : pulls.length === 0 ? (
          <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-5 py-8 text-center text-[13px] text-ink-3">
            No recent {ticker ? `$${ticker}` : ""} pulls to show yet.
          </div>
        ) : (
          <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-4">
            {pulls.slice(0, 6).map((e) => {
              const amount = e.amountRaw && e.tokenDecimals != null ? formatAmount(Number(formatUnits(BigInt(e.amountRaw), e.tokenDecimals))) : null;
              const txLink = explorerUrl("tx", e.txHash);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5 text-[12.5px]">
                  <span className="num text-ink-3">{e.wallet ? shortAddress(e.wallet) : "Someone"}</span>
                  <span className="text-ink-2">pulled</span>
                  <span className="num font-medium text-ink">{amount ?? ""} {ticker ?? ""}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="num text-[11px] text-ink-3">{formatAge((Date.now() - e.at) / 60000)}</span>
                    {txLink ? <a href={txLink} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink" aria-label="View transaction"><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Pool + Machine connection */}
      <Section eyebrow="Where it lives" title="Project → pool → machine.">
        <div className="grid gap-4 sm:grid-cols-2">
          <ConnectionCard
            label="Currently loaded in"
            title={inMachine ? "Genesis Pool" : "Not in a pool"}
            body={inMachine && pool ? `${new Set(pool.entries.map((e) => e.token.toLowerCase())).size} reward assets · ${pool.tiers.map((t) => `${t.probabilityPercent}%`).join(" / ")}` : "This token isn't in a live pool right now."}
            href={inMachine ? "/pools/genesis" : undefined}
            cta="View Genesis Pool"
          />
          <ConnectionCard
            label="Running inside"
            title={machine?.name ?? "Genesis Machine"}
            body={machine?.tagline ?? "The original Robacha token discovery machine."}
            href={machine ? `/machines/${machine.slug}` : undefined}
            cta="View machine"
          />
        </div>
      </Section>

      {/* Distribution */}
      <Section eyebrow="Distribution" title="What's happened with it in Robacha.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Rewards distributed" value={stat ? stat.pullsDistributed.toLocaleString("en-US") : dash} />
          <Metric label="Unique explorers" value={stat ? stat.uniqueDiscoverers.toLocaleString("en-US") : dash} />
          <Metric label="Current inventory" value={entry?.availableDisplay != null ? formatAmount(entry.availableDisplay) : dash} />
          <Metric label="Rounds seen" value={roundsWith > 0 ? String(roundsWith) : dash} />
          <Metric label="First pull" value={firstAt ? new Date(firstAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : dash} />
          <Metric label="Last pull" value={lastAt ? formatAge((Date.now() - lastAt) / 60000) : dash} />
        </div>
        <p className="mt-3 text-[11px] text-ink-3">
          Recent-pull figures come from the activity feed and reflect the window it covers; totals are read from settled reward logs.
        </p>
      </Section>

      {/* Market — demoted */}
      <Section eyebrow="Market" title="External market data." description="Robacha is a discovery platform, not a market. These figures are external and move constantly.">
        {m?.price != null ? (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4 sm:grid-cols-4">
              <Metric label="Price" value={formatUsd(m.price)} />
              <Metric label="Liquidity" value={m.liquidityUsd != null ? formatUsd(m.liquidityUsd, { compact: true }) : dash} />
              <Metric label="24h volume" value={m.volume24h != null ? formatUsd(m.volume24h, { compact: true }) : dash} />
              <Metric label="24h change" value={m.change24h != null ? `${m.change24h > 0 ? "+" : ""}${m.change24h.toFixed(2)}%` : dash} />
            </div>
            <p className="mt-3 max-w-[76ch] text-[11px] leading-relaxed text-ink-3">
              Market data is external and may change rapidly; Robacha does not determine token prices. Always verify the official token contract before trading.
            </p>
          </>
        ) : (
          <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-5 py-6 text-[13px] text-ink-3">
            No sufficiently liquid market is quoting {ticker ? `$${ticker}` : "this token"} right now.
          </div>
        )}
      </Section>

      {/* Transparency */}
      <Section eyebrow="Transparency" title="Check it yourself.">
        <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-5 text-[12.5px]">
          {contractLink ? <Ext href={contractLink}>Token contract</Ext> : null}
          {contracts.rewardVault ? <Ext href={explorerUrl("address", contracts.rewardVault)!}>Prize vault</Ext> : null}
          {inMachine ? <Link href="/pools/genesis" className="inline-flex items-center gap-1 text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">Pool odds</Link> : null}
          <Link href="/verify" className="inline-flex items-center gap-1 text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">Verify a round</Link>
        </div>
      </Section>

      {/* Related */}
      {related.length > 0 ? (
        <Section eyebrow="Keep discovering" title="Also inside the machine." action={<Link href="/discover" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">View all projects <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((e) => {
              const rp = projectByAddress(e.token);
              const href = rp ? projectHref(rp) : `/projects/${e.token}`;
              return (
                <Link key={e.token} href={href} className="glass-card group flex items-center gap-2.5 rounded-[16px] p-3 transition-transform hover:-translate-y-0.5">
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-[10px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                    <TokenAvatar address={e.token} symbol={e.symbol} logoUrl={market.get(e.token)?.logoUrl} size={36} rounded="none" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold">{rp?.name ?? e.name ?? "Token"}</p>
                    <p className="num text-[10.5px] text-ink-3">{e.symbol ? `$${e.symbol}` : ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* Final CTA */}
      <section className="relative py-10">
        <PageContainer width="wide">
          <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-10">
            <span className="noise-overlay" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-section-title mx-auto max-w-[22ch]">
                {inMachine ? (
                  <>{name} is in the machine. <span className="text-gradient-accent">Pull it before the pool changes.</span></>
                ) : (
                  <>{name} isn&rsquo;t loaded right now.</>
                )}
              </h2>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                {inMachine ? (
                  <>
                    <ButtonLink href="/app" variant="primary" size="lg">Spin to discover <ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink>
                    <span className="inline-flex"><FollowButton address={address} size="sm" /></span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex"><FollowButton address={address} size="sm" /></span>
                    <ButtonLink href="/discover" variant="secondary" size="lg">Discover more projects</ButtonLink>
                  </>
                )}
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

// ------------------------------------------------------------------ sub-parts

function Section({ eyebrow, title, description, action, children }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="relative py-5">
      <PageContainer width="wide">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} className="mb-4" />
        {children}
      </PageContainer>
    </section>
  );
}

function RelationshipBadge({ label, official }: { label: string; official?: boolean }) {
  return (
    <span
      title={official ? "Official Robacha utility token." : "This token is currently available in a Robacha reward pool. Inclusion does not imply partnership or endorsement."}
      className={cn(
        "inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
        official ? "bg-accent-soft text-accent-ink" : "bg-[rgba(120,160,220,0.14)] text-[#3f6ea8]",
      )}
    >
      {label}
      <Info className="h-2.5 w-2.5 opacity-70" aria-hidden="true" />
    </span>
  );
}

function StatusCell({ label, value, href, tone }: { label: string; value: React.ReactNode; href?: string; tone?: "accent" }) {
  const inner = (
    <div className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3 transition-colors hover:border-[rgb(var(--line-rgb)_/_0.16)]">
      <p className="micro text-ink-3">{label}</p>
      <p className={cn("num mt-1.5 text-[14px] font-semibold leading-none tracking-[-0.02em]", tone === "accent" ? "text-accent-ink" : "text-ink")}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="micro text-ink-3">{label}</dt>
      <dd className="num mt-1 text-[15px] font-semibold tracking-[-0.02em]">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3">
      <p className="micro text-ink-3">{label}</p>
      <p className="num mt-1.5 text-[15px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function ConnectionCard({ label, title, body, href, cta }: { label: string; title: string; body: string; href?: string; cta: string }) {
  return (
    <div className="glass-card rounded-[18px] p-5">
      <p className="micro text-ink-3">{label}</p>
      <p className="mt-1 text-[16px] font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
      {href ? (
        <Link href={href} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
          {cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
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

function CopyContract({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="num inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.04)] px-2.5 py-1 text-[11px] text-ink-2 transition-colors hover:text-ink"
    >
      {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      {shortAddress(address, 5)}
    </button>
  );
}
