"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatUnits } from "viem";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellRing,
  Boxes,
  Check,
  Coins,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { PageContainer } from "@/components/shared/primitives";
import { MACHINES, machineBySlug, type Machine } from "@/data/machines";
import { projectByAddress, projectHref } from "@/data/projects";
import { RARITY_LABEL } from "@/lib/constants";
import { formatAge, formatCompact, shortAddress } from "@/lib/formatters";
import { useActivity, useNow } from "@/lib/use-activity";
import { useAnalytics } from "@/lib/use-analytics";
import { useLiveRound } from "@/lib/use-live-round";
import { useMounted } from "@/lib/use-mounted";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { useWatchlist } from "@/lib/use-watchlist";
import { cn } from "@/lib/utils";

/**
 * The Machines directory — Robacha's central product page.
 *
 * Machines are the first-class objects; each draws from a transparent pool. The
 * Genesis Machine is live and dominates with real pool/round/activity state read
 * from chain; the NFT and Stock machines are honestly coming-soon (status from
 * config, never a claim) with follow controls and no fabricated activity. Round
 * capacity is the contract's fixed five-entry round.
 */

const ROUND_CAPACITY = 5;

const ARCH = [
  { reward: "Token rewards", slug: "genesis" },
  { reward: "NFT rewards", slug: "nft" },
  { reward: "Tokenized stocks", slug: "tokenized-stocks" },
] as const;

export function MachinesClient() {
  const live = MACHINES.filter((m) => m.status === "live").length;
  const soon = MACHINES.length - live;

  return (
    <PageContainer width="wide" className="pb-16 pt-8">
      {/* ---- Hero ---- */}
      <p className="micro">Machines</p>
      <h1 className="text-page-title mt-2.5 max-w-[18ch] leading-[0.98]">
        Different machines.
        <br />
        Different discoveries.
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
        Robacha machines turn transparent reward pools into discoverable onchain
        experiences. Genesis is live now. More machines are loading.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {MACHINES.map((m) => (
          <StatusChip key={m.slug} machine={m} />
        ))}
        <span className="ml-1 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.04)] px-3 py-1.5 text-[11px] text-ink-3">
          <span className="num font-semibold text-ink">{MACHINES.length}</span> machines
          <span aria-hidden="true">·</span>
          <span className="num font-semibold text-[#3f7d17]">{live}</span> live
          <span aria-hidden="true">·</span>
          <span className="num font-semibold text-ink-2">{soon}</span> coming soon
        </span>
      </div>

      {/* ---- Product architecture strip ---- */}
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {ARCH.map((a) => {
          const m = machineBySlug(a.slug);
          if (!m) return null;
          const isLive = m.status === "live";
          return (
            <li key={a.slug}>
              <Link
                href={m.href}
                className="glass-card group flex items-center justify-between gap-3 rounded-[16px] px-4 py-3.5 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <p className="micro text-ink-3">{a.reward}</p>
                  <p className="mt-1 text-[13.5px] font-semibold tracking-[-0.01em]">{m.name}</p>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", isLive ? "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]" : "bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3")}>
                  {isLive ? <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> : null}
                  {isLive ? "Live" : "Soon"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ---- Genesis flagship ---- */}
      <GenesisFeature />

      {/* ---- Up next ---- */}
      <section className="mt-14">
        <p className="micro text-ink-3">Up next</p>
        <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">One more machine is loading.</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <UpcomingMachine slug="nft" />
        </div>
      </section>

      {/* ---- How machines work ---- */}
      <HowMachinesWork />

      {/* ---- Final CTA ---- */}
      <FinalCta />
    </PageContainer>
  );
}

/* ------------------------------------------------------------ hero bits --- */

function StatusChip({ machine }: { machine: Machine }) {
  const live = machine.status === "live";
  const label = machine.slug === "tokenized-stocks" ? "Stock" : machine.slug === "genesis" ? "Genesis" : "NFT";
  return (
    <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium text-ink-2">
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "pulse-dot bg-[#8ec500]" : "bg-ink-3/50")} aria-hidden="true" />
      {label} — {live ? "Live" : "Coming soon"}
    </span>
  );
}

/* ---------------------------------------------------------- genesis ------- */

function GenesisFeature() {
  const machine = machineBySlug("genesis");
  const { pool } = usePool();
  const round = useLiveRound();
  const { analytics } = useAnalytics();

  const tokens = useMemo(
    () => (pool ? [...new Set(pool.entries.map((e) => e.token.toLowerCase()))] : []),
    [pool],
  );
  const market = useTokenMarket(tokens);
  const assetCount = tokens.length;

  if (!machine) return null;

  return (
    <section className="mt-12">
      <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        <span className="noise-overlay" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.14),transparent_70%)]" aria-hidden="true" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          {/* left — identity + pool + CTAs */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,197,0,0.16)] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#3f7d17]">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Live now
            </span>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">Genesis Machine</h2>
            <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-2">
              The original Robacha discovery machine. Spin transparent reward
              pools of projects from across Robinhood Chain.
            </p>

            {/* current pool */}
            <div className="mt-5 rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="micro text-ink-3">Currently drawing from</p>
                  <p className="mt-0.5 text-[14px] font-semibold">{pool?.name || "Genesis Pool"}</p>
                </div>
                <div className="text-right">
                  <p className="num text-[20px] font-semibold leading-none">{pool ? assetCount : "—"}</p>
                  <p className="micro text-ink-3">assets</p>
                </div>
              </div>
              {pool && pool.tiers.length ? (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[rgb(var(--line-rgb)_/_0.07)] pt-3 text-[11.5px] text-ink-2">
                  {pool.tiers.map((t) => (
                    <span key={t.index} className="num">
                      {RARITY_LABEL[t.rarity]} <span className="text-ink">{Math.round(t.probabilityPercent)}%</span>
                    </span>
                  ))}
                </div>
              ) : null}
              {round.status === "open" && round.roundId ? (
                <p className="num mt-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,197,0,0.12)] px-2.5 py-1 text-[11px] text-[#3f7d17]">
                  Round #{round.roundId} · {round.entryCount ?? 0}/{ROUND_CAPACITY}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/app" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(204,255,0,0.98),rgba(186,232,0,0.98))] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5">
                Spin Genesis <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/pools/genesis" className="glass-chip inline-flex h-11 items-center rounded-full px-5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5">
                View Genesis Pool
              </Link>
            </div>

            {analytics ? (
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-ink-3">
                <span><span className="num font-semibold text-ink">{formatCompact(analytics.totals.rounds)}</span> rounds settled</span>
                <span><span className="num font-semibold text-ink">{formatCompact(analytics.totals.prizes)}</span> rewards distributed</span>
                <span><span className="num font-semibold text-ink">{formatCompact(analytics.totals.participants)}</span> wallets</span>
              </div>
            ) : null}
          </div>

          {/* right — machine art + reward rail */}
          <div>
            <GenesisArt tokens={tokens.slice(0, 5)} market={market} />
            <RewardRail tokens={tokens} market={market} />
          </div>
        </div>

        {/* live activity + your history */}
        <div className="relative mt-6 grid gap-4 lg:grid-cols-2">
          <GenesisActivity />
          <GenesisUserHistory />
        </div>
      </div>
    </section>
  );
}

function GenesisArt({ tokens, market }: { tokens: string[]; market: ReturnType<typeof useTokenMarket> }) {
  return (
    <div className="relative mx-auto w-full max-w-[380px]" aria-hidden={tokens.length === 0}>
      <div className="relative rounded-[26px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[linear-gradient(176deg,#ffffff,#fdeef4_60%,#f6f9ec)] p-5 shadow-[0_30px_60px_-32px_rgba(43,58,85,0.4)]">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ff77ac]/70" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-3">Genesis</span>
          <span className="h-2 w-2 rounded-full bg-[#b6e800]" />
        </div>
        <div className="grid grid-cols-3 gap-2.5 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.03)] p-3">
          {tokens.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="aspect-square rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.05)]" />
              ))
            : tokens.slice(0, 6).map((addr, i) => (
                <span
                  key={addr}
                  className={cn(
                    "grid aspect-square place-items-center rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-surface [container-type:inline-size]",
                    i === 0 && "capsule-drift-a",
                    i === 3 && "capsule-drift-b",
                  )}
                >
                  <TokenAvatar address={addr} symbol={market.get(addr)?.symbol ?? null} logoUrl={market.get(addr)?.logoUrl} size={48} rounded="none" />
                </span>
              ))}
        </div>
        {/* dispenser */}
        <div className="mt-4 flex items-center justify-center">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[radial-gradient(circle_at_36%_30%,#d6f75f,#a9dc00)] shadow-[0_6px_14px_-4px_rgba(150,200,0,0.7)]" />
        </div>
      </div>
    </div>
  );
}

function RewardRail({ tokens, market }: { tokens: string[]; market: ReturnType<typeof useTokenMarket> }) {
  if (tokens.length === 0) return null;
  const shown = tokens.slice(0, 5);
  const extra = tokens.length - shown.length;
  return (
    <div className="mt-5">
      <p className="micro mb-2 text-ink-3">Inside the machine</p>
      <div className="flex flex-wrap items-center gap-2">
        {shown.map((addr) => {
          const project = projectByAddress(addr);
          const symbol = market.get(addr)?.symbol ?? project?.ticker ?? null;
          const href = project ? projectHref(project) : `/projects/${addr}`;
          return (
            <Link key={addr} href={href} className="glass-chip inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 transition-transform hover:-translate-y-0.5">
              <span className="h-6 w-6 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.7)] [container-type:inline-size]">
                <TokenAvatar address={addr} symbol={symbol} logoUrl={market.get(addr)?.logoUrl} size={24} rounded="none" />
              </span>
              <span className="num text-[11.5px] font-medium text-ink">{symbol ?? shortAddress(addr)}</span>
            </Link>
          );
        })}
        {extra > 0 ? (
          <Link href="/pools/genesis" className="num inline-flex items-center rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] px-3 py-1.5 text-[11.5px] font-medium text-ink-2 hover:text-ink">
            +{extra} more
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function GenesisActivity() {
  const { events, isLoading } = useActivity({ kinds: ["reward-assigned"], limit: 6 });
  const now = useNow();
  return (
    <div className="rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4">
      <div className="flex items-center justify-between">
        <p className="micro inline-flex items-center gap-1.5 text-ink-3">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Live from Genesis
        </p>
        <Link href="/activity" className="text-[11.5px] font-medium text-ink-2 hover:text-ink">View activity →</Link>
      </div>
      {isLoading && events.length === 0 ? (
        <div className="mt-3 h-20 animate-pulse rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />
      ) : events.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-3">No recent pulls to show yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[rgb(var(--line-rgb)_/_0.06)]">
          {events.slice(0, 4).map((e) => {
            const project = e.token ? projectByAddress(e.token) : undefined;
            const label = project?.ticker ?? e.tokenSymbol ?? (e.token ? shortAddress(e.token) : "a token");
            const amount = e.amountRaw && e.tokenDecimals != null ? formatCompact(Number(formatUnits(BigInt(e.amountRaw), e.tokenDecimals))) : null;
            // Drop the amount when it rounds to nothing, so a tiny pull reads
            // "pulled SUSHI" rather than the odd "pulled 0 SUSHI".
            const amountLabel = amount && amount !== "0" ? `${amount} ` : "";
            return (
              <li key={e.id} className="flex items-center gap-2 py-2 text-[12px]">
                <span className="num text-ink-3">{e.wallet ? shortAddress(e.wallet) : "Someone"}</span>
                <span className="text-ink-2">pulled</span>
                <span className="num font-medium text-ink">{amountLabel}{label}</span>
                <span className="ml-auto num text-[10.5px] text-ink-3">{formatAge((now - e.at) / 60000)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GenesisUserHistory() {
  const wallet = useWallet();
  const mounted = useMounted();
  const { history } = useWalletHistory();

  if (!mounted || !wallet.isConnected || !history || history.spins === 0) return null;

  return (
    <div className="rounded-[18px] border border-[rgba(142,197,0,0.3)] bg-[rgba(142,197,0,0.05)] p-4">
      <p className="micro text-ink-3">Your Genesis history</p>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        <span><span className="num text-[18px] font-semibold">{history.spins}</span> <span className="text-ink-3">spins</span></span>
        <span><span className="num text-[18px] font-semibold">{history.rewards.length}</span> <span className="text-ink-3">discovered</span></span>
        <span><span className="num text-[18px] font-semibold">{history.rewardCount}</span> <span className="text-ink-3">pulled</span></span>
      </div>
      <Link href="/bag" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink hover:underline">
        View my bag <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/* ---------------------------------------------------------- upcoming ------ */

function UpcomingMachine({ slug }: { slug: "nft" | "tokenized-stocks" }) {
  const machine = machineBySlug(slug);
  const isStock = slug === "tokenized-stocks";
  if (!machine) return null;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[24px] border p-6",
        isStock
          ? "border-[#cfe0f0] bg-[linear-gradient(160deg,#f4f9ff,#eef6f1)]"
          : "border-[#f0d9e6] bg-[linear-gradient(160deg,#fdf1f7,#f3eefb)]",
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn("micro", isStock ? "text-[#2f5aa8]" : "text-[#c0447a]")}>{isStock ? "Upcoming" : "Next machine"}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-3">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3/60" aria-hidden="true" /> Coming soon
        </span>
      </div>

      {/* art — unrevealed cards, no fabricated assets */}
      <div className="relative mt-4 h-[128px] overflow-hidden rounded-[16px] border border-white/60 bg-white/40">
        <div className="absolute inset-0 grid grid-cols-3 place-items-center gap-3 p-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "grid aspect-[3/4] w-full place-items-center rounded-[12px] border blur-[1.5px]",
                isStock ? "border-[#d7e3f6] bg-white/70" : "border-[#eed7e6] bg-white/70",
                i === 1 && (isStock ? "capsule-drift-b" : "capsule-drift-a"),
              )}
            >
              {isStock ? <TrendingUp className="h-5 w-5 text-[#a9bcd8]" /> : <Boxes className="h-5 w-5 text-[#d5a9c4]" />}
            </span>
          ))}
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-ink-2 shadow-sm">
            <Lock className="h-3 w-3" aria-hidden="true" /> Unrevealed
          </span>
        </div>
      </div>

      <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em]">{machine.name}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
        {isStock ? "Tokenized stocks enter the machine." : "Collectibles enter the machine."}{" "}
        {machine.rewardType} on Robinhood Chain.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
        <StatusRow label="Reward assets" value="Not published" />
        <StatusRow label="Pool" value="Not published" />
        <StatusRow label="Odds" value="Not published" />
        <StatusRow label="Status" value="Coming soon" />
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={machine.href} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-semibold text-surface transition-transform hover:-translate-y-0.5">
          Explore {machine.name} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <MachineFollow slug={slug} />
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-white/50 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-[0.06em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[12px] font-medium text-ink-2">{value}</dd>
    </div>
  );
}

function MachineFollow({ slug }: { slug: string }) {
  const watch = useWatchlist();
  const mounted = useMounted();
  const key = `machine:${slug}`;
  const following = mounted && watch.canFollow && watch.isFollowing(key);

  if (mounted && !watch.canFollow) {
    return (
      <span className="inline-flex h-10 items-center rounded-full border border-[rgb(var(--line-rgb)_/_0.15)] px-4 text-[12.5px] text-ink-3">
        Connect to follow
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => watch.toggle(key)}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors",
        following ? "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]" : "border border-[rgb(var(--line-rgb)_/_0.15)] text-ink-2 hover:text-ink",
      )}
    >
      {following ? <><BellRing className="h-3.5 w-3.5" /> Following <Check className="h-3.5 w-3.5" /></> : <><Bell className="h-3.5 w-3.5" /> Follow</>}
    </button>
  );
}

/* ------------------------------------------------------ how it works ------ */

function HowMachinesWork() {
  const steps = [
    { icon: Layers, n: "01", title: "Pool", body: "Rewards and probabilities are published." },
    { icon: Coins, n: "02", title: "Machine", body: "You enter a round." },
    { icon: Sparkles, n: "03", title: "Draw", body: "The machine resolves from Robacha's randomness." },
    { icon: ShieldCheck, n: "04", title: "Reward", body: "The result settles to your wallet." },
  ];
  return (
    <section className="mt-16">
      <p className="micro text-ink-3">How Robacha works</p>
      <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">A machine doesn&rsquo;t decide what you win.</h2>
      <p className="mt-2 max-w-[56ch] text-[13.5px] leading-relaxed text-ink-2">
        Each machine is an interface over a transparent pool. The <span className="font-medium text-ink">pool</span> is the published set of rewards; the <span className="font-medium text-ink">machine</span> performs the draw.
      </p>
      <ol className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-3">
              <div className="glass-card h-full flex-1 rounded-[18px] p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-accent-soft text-accent-ink"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="num text-[11px] text-ink-3">{s.n}</span>
                </div>
                <h3 className="mt-3 text-[14.5px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
              {i < steps.length - 1 ? <ArrowRight className="hidden h-4 w-4 shrink-0 text-ink-3 lg:block" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* --------------------------------------------------------- final cta ------ */

function FinalCta() {
  return (
    <section className="mt-16">
      <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] px-6 py-14 text-center sm:px-10">
        <span className="noise-overlay" aria-hidden="true" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.16),transparent_66%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[40ch]">
          <h2 className="text-[clamp(1.9rem,3.6vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            One machine is live. <span className="text-gradient-accent">Two more are loading.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-[38ch] text-[14px] leading-relaxed text-ink-2">Discover what Robacha pulls next.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/app" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(204,255,0,0.98),rgba(186,232,0,0.98))] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5">
              Spin Genesis <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/machines/tokenized-stocks" className="glass-chip inline-flex h-11 items-center rounded-full px-5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5">
              Follow upcoming machines
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
