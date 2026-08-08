"use client";

import {
  ArrowRight,
  Boxes,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { NFT_SPIN_CANDIDATES } from "@/data/nft-spins";
import { MACHINES } from "@/data/machines";
import { projectByAddress, projectHref } from "@/data/projects";
import { formatAge, shortAddress } from "@/lib/formatters";
import { explorerUrl } from "@/lib/config";
import { useActivity } from "@/lib/use-activity";
import { TRENDING_EXPLAINER, useDiscovery } from "@/lib/use-discovery";
import { useLineup } from "@/lib/use-lineup";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { useWatchlist } from "@/lib/use-watchlist";
import { cn } from "@/lib/utils";
import { type DiscoverItem, ProjectCard } from "./ProjectCard";
import { FollowButton } from "./FollowButton";

type Filter = "all" | "live" | "trending" | "new" | "following" | "nfts";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "trending", label: "Trending" },
  { key: "new", label: "New" },
  { key: "following", label: "Following" },
  { key: "nfts", label: "NFTs" },
];

interface Row extends DiscoverItem {
  discoverers: number | null;
  lastRoundId: number;
  live: boolean;
}

export function DiscoverClient() {
  const { pool } = usePool();
  const discovery = useDiscovery();
  const { tokens: lineup } = useLineup();
  const wallet = useWallet();
  const watch = useWatchlist();

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // URL filter state, no useSearchParams Suspense requirement.
  useEffect(() => {
    const f = new URL(window.location.href).searchParams.get("filter");
    if (f && FILTERS.some((x) => x.key === f)) setFilter(f as Filter);
  }, []);
  const setFilterUrl = useCallback((f: Filter) => {
    setFilter(f);
    const url = new URL(window.location.href);
    if (f === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", f);
    window.history.replaceState(null, "", url.toString());
  }, []);

  // ⌘K focuses search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const live = useMemo(
    () =>
      Array.from(
        new Map((pool?.entries ?? []).map((e) => [e.token.toLowerCase(), e])).values(),
      ),
    [pool],
  );
  const liveAddrs = new Set(live.map((e) => e.token.toLowerCase()));
  const upcoming = lineup.filter((t) => !liveAddrs.has(t.address.toLowerCase()));

  const market = useTokenMarket([
    ...live.map((e) => e.token),
    ...discovery.projects.slice(0, 16).map((p) => p.token),
    ...upcoming.map((t) => t.address),
    ...watch.following,
  ]);

  // ---- master project list (merge live pool + discovered) ----
  const rows: Row[] = useMemo(() => {
    const map = new Map<string, Row>();
    const put = (address: string, base: Partial<Row>) => {
      const key = address.toLowerCase();
      const project = projectByAddress(address);
      const m = market.get(address);
      const ticker = project?.ticker ?? m?.symbol ?? null;
      const known = Boolean(project || m?.symbol);
      const existing = map.get(key);
      map.set(key, {
        address,
        name: project?.name ?? m?.name ?? (ticker ?? shortAddress(address)),
        ticker,
        logoUrl: m?.logoUrl,
        href: project ? projectHref(project) : `/projects/${address}`,
        category: project?.category,
        machineName: "Genesis Machine",
        poolName: existing?.live || base.live ? "Genesis Pool" : undefined,
        poolHref: existing?.live || base.live ? "/pools/genesis" : undefined,
        inMachine: existing?.inMachine,
        discoverers: existing?.discoverers ?? null,
        lastRoundId: existing?.lastRoundId ?? 0,
        live: existing?.live ?? false,
        status: project?.official ? "Official" : undefined,
        unknown: !known,
        showFollow: true,
        ...base,
      });
    };
    for (const e of live) {
      put(e.token, {
        inMachine: { rarity: e.rarity, oddsPercent: e.oddsPercent },
        live: true,
        poolName: "Genesis Pool",
        poolHref: "/pools/genesis",
      });
    }
    for (const p of discovery.projects) {
      const stat = { discoverers: p.uniqueDiscoverers, lastRoundId: p.lastRoundId };
      const key = p.token.toLowerCase();
      if (map.has(key)) {
        const r = map.get(key)!;
        r.discoverers = p.uniqueDiscoverers;
        r.lastRoundId = p.lastRoundId;
      } else {
        put(p.token, stat);
      }
    }
    return [...map.values()];
  }, [live, discovery.projects, market, watch.following]);

  const query = q.trim().toLowerCase();
  const filtered = rows
    .filter((r) => {
      if (query) {
        const hay = `${r.name} ${r.ticker ?? ""} ${r.address}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (filter === "live") return r.live;
      if (filter === "following") return watch.isFollowing(r.address);
      if (filter === "trending" || filter === "new")
        return r.discoverers != null && !r.unknown;
      return true;
    })
    .sort((a, b) => {
      if (filter === "new") return b.lastRoundId - a.lastRoundId;
      if (filter === "trending") return (b.discoverers ?? 0) - (a.discoverers ?? 0);
      // default: live first, then by discoverers.
      if (a.live !== b.live) return a.live ? -1 : 1;
      return (b.discoverers ?? 0) - (a.discoverers ?? 0);
    });

  const liveCount = live.length;
  const showNftGrid = filter === "nfts";

  return (
    <>
      {/* Hero + search */}
      <section className="relative pb-2 pt-8 sm:pt-10">
        <PageContainer width="wide">
          <p className="micro">Discover</p>
          <h1 className="text-page-title mt-2.5 max-w-[16ch] leading-[1.02]">
            Projects inside<br className="hidden sm:block" /> the machine.
          </h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
            Explore tokens, communities and collections moving through Robacha.
            Follow projects, inspect live pools and catch them when they enter
            the machine.
          </p>

          <div className="mt-6 flex max-w-[520px] items-center gap-2 rounded-full border border-[rgb(var(--line-rgb)_/_0.14)] bg-[rgb(var(--surface-rgb))] px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects, tokens, machines…"
              aria-label="Search Discover"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
            />
            <kbd className="hidden shrink-0 rounded-md border border-[rgb(var(--line-rgb)_/_0.14)] px-1.5 py-0.5 text-[10px] font-medium text-ink-3 sm:block">
              ⌘K
            </kbd>
          </div>

          <p className="num mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-3">
            {discovery.totalProjects != null ? <span>{discovery.totalProjects} projects discovered</span> : null}
            {liveCount > 0 ? <span>· {liveCount} live in the pool</span> : null}
            <span>· {MACHINES.length} machines</span>
          </p>

          {/* Filters */}
          <div className="hide-scrollbar mt-5 flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const disabled = f.key === "following" && (!wallet.isConnected || watch.count === 0);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterUrl(f.key)}
                  disabled={disabled}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-40",
                    active
                      ? "border-transparent bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]"
                      : "border-[rgb(var(--line-rgb)_/_0.14)] text-ink-2 hover:text-ink",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </PageContainer>
      </section>

      {/* Your discovery / watchlist (connected) */}
      {wallet.isConnected ? <YouStrip watch={watch} market={market} /> : null}

      {/* Main grid: filtered projects (or NFT collections) */}
      <Section
        eyebrow={filter === "live" ? "In the machine" : filter === "nfts" ? "NFT machine" : "Projects"}
        title={
          filter === "live"
            ? "Live right now."
            : filter === "trending"
              ? "Moving through Robacha."
              : filter === "new"
                ? "New to the machine."
                : filter === "following"
                  ? "Projects you follow."
                  : filter === "nfts"
                    ? "Collections we're watching."
                    : "Everything in Robacha."
        }
        description={
          filter === "trending"
            ? TRENDING_EXPLAINER
            : filter === "live"
              ? "Assets currently loaded into active Robacha pools."
              : filter === "nfts"
                ? "Real collections on Robinhood Chain being considered for the NFT machine. Candidates, not confirmed prizes."
                : undefined
        }
      >
        {showNftGrid ? (
          <NftGrid />
        ) : discovery.isLoading && filtered.length === 0 && live.length === 0 ? (
          <GridSkeleton />
        ) : filtered.length === 0 ? (
          <Empty
            label={
              filter === "following"
                ? "You're not following any projects yet. Tap Follow on a project to save it here."
                : query
                  ? `Nothing in Robacha matches “${q.trim()}”.`
                  : "No projects to show yet."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 18).map((r) => (
              <ProjectCard key={r.address} item={r} />
            ))}
          </div>
        )}
      </Section>

      {/* Most discovered — ranked, visually distinct */}
      {filter === "all" && discovery.projects.length > 0 ? <MostDiscovered market={market} /> : null}

      {/* Happening now — live activity */}
      {filter === "all" ? <HappeningNow /> : null}

      {/* On the radar */}
      {filter === "all" && upcoming.length > 0 ? (
        <Section
          eyebrow="On the radar"
          title="Being prepared or watched."
          description="Tokens intended for a future Robacha pool. Candidates — not confirmed partnerships or endorsements. Nothing here can be pulled until it shows as loaded above."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 9).map((t) => {
              const status = !t.onThisChain ? "Watching" : t.allowlisted ? "Approved" : "Candidate";
              const project = projectByAddress(t.address);
              return (
                <div key={t.address} className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-3.5 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--edge-rgb)_/_0.8)] opacity-90 [container-type:inline-size]">
                      <TokenAvatar address={t.address} symbol={t.symbol} logoUrl={t.logo ?? market.get(t.address)?.logoUrl} size={32} rounded="none" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium">{project?.name ?? t.name}</p>
                      <p className="num text-[10.5px] text-ink-3">${t.symbol}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-2 py-0.5 text-[10px] font-medium text-ink-3">
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* NFT machine (unless already showing NFT grid) */}
      {filter === "all" ? (
        <Section
          eyebrow="NFT machine"
          title="Collections we're watching."
          description="Real collections on Robinhood Chain being considered for the NFT machine. Candidates — not confirmed prizes. NFT Spins isn't live yet."
          action={
            <Link href="/nft-spins" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
              Explore NFT Spins <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        >
          <NftGrid />
        </Section>
      ) : null}

      {/* Machines — big product cards */}
      {filter === "all" ? (
        <Section
          eyebrow="Machines"
          title="One machine, more ways to discover."
          action={
            <Link href="/machines" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
              View all machines <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {MACHINES.map((m) => (
              <MachineCard key={m.slug} slug={m.slug} name={m.name} tagline={m.tagline} type={m.type} status={m.status} href={m.href} liveAssets={m.status === "live" ? liveCount : null} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Final CTA */}
      <section className="relative py-10">
        <PageContainer width="wide">
          <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-10">
            <span className="noise-overlay" aria-hidden="true" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.16),transparent_66%)]" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-section-title mx-auto max-w-[18ch]">
                See something you like? <span className="text-gradient-accent">Pull it from the machine.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-relaxed text-ink-2">
                The Genesis Pool is live with projects from across Robinhood Chain.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <Link href="/app" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96)_0%,rgba(204,255,0,0.98)_46%,rgba(186,232,0,0.98)_100%)] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5">
                  Spin now <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/pools/genesis" className="glass-chip inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5">
                  View Genesis Pool
                </Link>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- sub-parts

function Section({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="relative py-6">
      <PageContainer width="wide">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} className="mb-5" />
        {children}
      </PageContainer>
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[132px] animate-pulse rounded-[18px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-5 py-10 text-center text-[13px] text-ink-3">
      {label}
    </div>
  );
}

type MarketMap = ReturnType<typeof useTokenMarket>;

function YouStrip({ watch, market }: { watch: ReturnType<typeof useWatchlist>; market: MarketMap }) {
  const history = useWalletHistory();
  const discovered = history.history?.rewards.length ?? null;
  const followed = watch.following.slice(0, 5);

  return (
    <section className="relative py-3">
      <PageContainer width="wide">
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4">
            <div className="flex items-center justify-between">
              <p className="micro text-ink-3">Your discovery</p>
              <Link href="/bag" className="text-[11.5px] font-medium text-ink-2 hover:text-ink">View bag →</Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="num text-[20px] font-semibold">{discovered ?? "—"}</p>
                <p className="micro text-ink-3">Projects discovered</p>
              </div>
              <div>
                <p className="num text-[20px] font-semibold">{watch.count}</p>
                <p className="micro text-ink-3">Following</p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4">
            <p className="micro text-ink-3">Your watchlist</p>
            {followed.length === 0 ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                Follow projects and Robacha will keep them here. Saved on this device.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {followed.map((addr) => {
                  const project = projectByAddress(addr);
                  const m = market.get(addr);
                  const name = project?.name ?? m?.symbol ?? shortAddress(addr);
                  return (
                    <li key={addr}>
                      <Link
                        href={project ? projectHref(project) : `/projects/${addr}`}
                        className="glass-chip inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-[12px]"
                      >
                        <span className="h-5 w-5 overflow-hidden rounded-full [container-type:inline-size]">
                          <TokenAvatar address={addr} symbol={m?.symbol ?? null} logoUrl={m?.logoUrl} size={20} rounded="none" />
                        </span>
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

function MostDiscovered({ market }: { market: MarketMap }) {
  const discovery = useDiscovery();
  const ranked = discovery.projects.filter((p) => p.symbol || projectByAddress(p.token)).slice(0, 8);
  if (ranked.length === 0) return null;
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const resolve = (token: string, symbol: string | null) => {
    const project = projectByAddress(token);
    const m = market.get(token);
    return {
      name: project?.name ?? m?.name ?? symbol ?? shortAddress(token),
      ticker: project?.ticker ?? symbol ?? m?.symbol ?? null,
      href: project ? projectHref(project) : `/projects/${token}`,
      logoUrl: m?.logoUrl,
      official: project?.official,
    };
  };

  return (
    <Section
      eyebrow="Most discovered"
      title="Found by the most explorers."
      description={TRENDING_EXPLAINER}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {top.map((p, i) => {
          const r = resolve(p.token, p.symbol);
          return (
            <Link key={p.token} href={r.href} className="glass-card group relative flex flex-col rounded-[18px] p-4 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="num text-[13px] font-bold text-accent-ink">#{String(i + 1).padStart(2, "0")}</span>
                {r.official ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-ink">Official</span> : null}
              </div>
              <span className="mt-3 h-12 w-12 overflow-hidden rounded-[13px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                <TokenAvatar address={p.token} symbol={r.ticker} logoUrl={r.logoUrl} size={48} rounded="none" />
              </span>
              <p className="mt-2.5 truncate text-[14px] font-semibold">{r.name}</p>
              <p className="num text-[12px] text-ink-3">{r.ticker ? `$${r.ticker}` : ""}</p>
              <p className="num mt-2 text-[12.5px] font-medium text-ink-2">
                {p.uniqueDiscoverers.toLocaleString("en-US")} explorers
              </p>
            </Link>
          );
        })}
      </div>
      {rest.length > 0 ? (
        <ul className="mt-3 divide-y divide-[rgb(var(--line-rgb)_/_0.06)] rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-4">
          {rest.map((p, i) => {
            const r = resolve(p.token, p.symbol);
            return (
              <li key={p.token} className="flex items-center gap-3 py-2.5">
                <span className="num w-6 shrink-0 text-[11px] font-semibold text-ink-3">#{i + 4}</span>
                <span className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                  <TokenAvatar address={p.token} symbol={r.ticker} logoUrl={r.logoUrl} size={28} rounded="none" />
                </span>
                <Link href={r.href} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:underline">
                  {r.name} <span className="num text-ink-3">{r.ticker ? `$${r.ticker}` : ""}</span>
                </Link>
                <span className="num shrink-0 text-[12px] text-ink-2">{p.uniqueDiscoverers.toLocaleString("en-US")} explorers</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}

function HappeningNow() {
  const { events, isLoading } = useActivity({ kinds: ["reward-assigned"], limit: 8 });
  const now = Date.now();
  return (
    <Section
      eyebrow="Happening now"
      title="Live from the machine."
      action={
        <Link href="/activity" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
          View activity <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />
      ) : events.length === 0 ? (
        <Empty label="No recent discovery activity to show yet." />
      ) : (
        <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-4" aria-live="polite">
          {events.slice(0, 6).map((e) => {
            const project = e.token ? projectByAddress(e.token) : undefined;
            const label = project?.name ?? e.tokenSymbol ?? (e.token ? shortAddress(e.token) : "a token");
            const link = e.token ? (project ? projectHref(project) : `/projects/${e.token}`) : null;
            return (
              <li key={e.id} className="flex items-center gap-3 py-2.5 text-[12.5px]">
                <span className="num text-ink-3">{e.wallet ? shortAddress(e.wallet) : "Someone"}</span>
                <span className="text-ink-2">discovered</span>
                {link ? (
                  <Link href={link} className="font-medium text-ink hover:underline">{label}</Link>
                ) : (
                  <span className="font-medium text-ink">{label}</span>
                )}
                <span className="ml-auto num text-[11px] text-ink-3">{formatAge((now - e.at) / 60000)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function NftGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {NFT_SPIN_CANDIDATES.map((c) => (
        <article key={c.address} className="group relative flex flex-col rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.55)] p-4">
          <span className="aspect-square w-full overflow-hidden rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
            <TokenAvatar address={c.address} symbol={c.symbol} logoUrl={c.image} size={200} rounded="none" />
          </span>
          <p className="mt-3 truncate text-[13.5px] font-semibold">{c.name}</p>
          <p className="text-[11px] text-ink-3">Robinhood Chain</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-2 py-0.5 text-[10px] font-medium text-ink-3">Candidate</span>
            <a href={c.opensea} target="_blank" rel="noreferrer" className="relative z-10 inline-flex items-center gap-1 text-[11px] text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2">
              View
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function MachineCard({
  slug,
  name,
  tagline,
  type,
  status,
  href,
  liveAssets,
}: {
  slug: string;
  name: string;
  tagline: string;
  type: "token" | "nft" | "stock";
  status: "live" | "coming-soon";
  href: string;
  liveAssets: number | null;
}) {
  const live = status === "live";
  return (
    <article className="glass-panel glass-reflection relative overflow-hidden rounded-[24px] p-6">
      <span className="noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,119,172,0.14),transparent_70%)]" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-accent-soft text-accent-ink">
            {type === "nft" ? <Boxes className="h-5 w-5" aria-hidden="true" /> : type === "stock" ? <TrendingUp className="h-5 w-5" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium", live ? "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]" : "bg-[rgb(var(--ink-rgb)_/_0.06)] text-ink-3")}>
            {live ? <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> : null}
            {live ? "Live" : "Coming soon"}
          </span>
        </div>
        <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em]">{name}</h3>
        <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-ink-2">{tagline}</p>
        {live && liveAssets != null ? (
          <p className="num mt-3 text-[12px] text-ink-3">{liveAssets} assets · Genesis Pool</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={href} className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold transition-transform hover:-translate-y-0.5", live ? "bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(186,232,0,0.98))] text-[var(--on-accent)] shadow-[var(--shadow-neon)]" : "glass-chip text-ink")}>
            {live ? "Enter machine" : "Explore"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href={`/machines/${slug}`} className="inline-flex h-10 items-center rounded-full px-3 text-[12.5px] font-medium text-ink-2 hover:text-ink">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
