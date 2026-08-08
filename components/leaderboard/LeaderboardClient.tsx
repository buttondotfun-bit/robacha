"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Info } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import type { LeaderboardResponse } from "@/app/api/leaderboard/route";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { projectByAddress, projectHref } from "@/data/projects";
import { explorerUrl } from "@/lib/config";
import { formatAge, formatAmount, shortAddress } from "@/lib/formatters";
import { useActivity } from "@/lib/use-activity";
import { useAnalytics } from "@/lib/use-analytics";
import { TRENDING_EXPLAINER, useDiscovery } from "@/lib/use-discovery";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { cn } from "@/lib/utils";

/**
 * Leaderboard — marketing hierarchy over real Robacha data.
 *
 * Selective, never fabricated: strong cumulative activity leads (spins, rewards,
 * rounds, legendary pulls, record amounts, live pulls), and small early-stage
 * counts (unique explorers, project count, exact low ranks) are demoted, not
 * inflated. Milestone numbers floor-round DOWN so a displayed figure can never
 * exceed the real one.
 */

const RANK_EXPLAINER =
  "All leaderboard records are derived from settled Robacha rounds on Robinhood Chain. External token prices do not affect any ranking.";

/** Conservative milestone formatting — always floors, never rounds up. */
function milestone(n: number): string {
  if (n < 100) return n.toLocaleString("en-US");
  if (n < 1000) return `${Math.floor(n / 50) * 50}+`;
  const k = Math.floor(n / 100) / 10;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K+`;
}

type Category = "explorers" | "legendary" | "rare";

export function LeaderboardClient() {
  const wallet = useWallet();
  const { pool } = usePool();
  const discovery = useDiscovery();
  const history = useWalletHistory();
  const analytics = useAnalytics();

  const lb = useQuery({
    queryKey: ["robacha", "leaderboard"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const r = await fetch("/api/leaderboard", { signal, cache: "no-store" });
      if (!r.ok) throw new Error("leaderboard unavailable");
      return (await r.json()) as LeaderboardResponse;
    },
  });
  const board = lb.data;
  const me = wallet.address?.toLowerCase() ?? null;
  // Logos for the record tokens (so the cards show real coin artwork).
  const recordMarket = useTokenMarket(board?.biggestPulls.map((b) => b.token) ?? []);

  const rarityTiers = useMemo(() => {
    const legendary: number[] = [];
    const rare: number[] = [];
    for (const t of pool?.tiers ?? []) {
      if (t.rarity === "legendary") legendary.push(t.index);
      if (t.rarity === "rare" || t.rarity === "epic") rare.push(t.index);
    }
    return { legendary, rare };
  }, [pool]);

  const tierRank = (which: "legendary" | "rare") => {
    const idx = which === "legendary" ? rarityTiers.legendary : rarityTiers.rare;
    return (board?.tierCountsByUser ?? [])
      .map((u) => ({ user: u.user, count: idx.reduce((s, i) => s + (u.tiers[i] ?? 0), 0) }))
      .filter((u) => u.count > 0)
      .sort((a, b) => b.count - a.count);
  };
  const legendaryTotal = board ? tierRank("legendary").reduce((s, u) => s + u.count, 0) : null;

  const explorers = discovery.topDiscoverers;
  const myRank = me ? explorers.findIndex((e) => e.user.toLowerCase() === me) : -1;
  const myProjects = history.history?.rewards.length ?? null;
  const myLegendary = me
    ? tierRank("legendary").find((u) => u.user.toLowerCase() === me)?.count ?? 0
    : 0;

  const [category, setCategory] = useState<Category>("explorers");
  const totals = analytics.analytics?.totals;

  // No full-page error gate: each section degrades on its own (milestones fall
  // back to "—", records/explorers/activity show their own empty states) so a
  // single flaky data source never collapses the whole page.

  // Strongest single pulls across tokens (for the record cards). Requires
  // decimals so the amount is real; unresolved tokens (flaky metadata reads)
  // are dropped rather than shown as "—".
  const records = (board?.biggestPulls ?? [])
    .map((b) => ({ ...b, top: b.entries[0] }))
    .filter((b) => b.top && b.decimals !== null)
    .sort((a, b) => {
      const av = a.decimals !== null ? Number(formatUnits(BigInt(a.top!.amountRaw), a.decimals)) : 0;
      const bv = b.decimals !== null ? Number(formatUnits(BigInt(b.top!.amountRaw), b.decimals)) : 0;
      return bv - av;
    })
    .slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative pb-2 pt-8 sm:pt-10">
        <PageContainer width="wide">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,197,0,0.14)] px-2.5 py-1 text-[10.5px] font-semibold text-[#3f7d17]">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Live onchain activity
            </span>
          </div>
          <h1 className="text-page-title mt-3 max-w-[14ch] leading-[1.03]">
            Records from inside the machine.
          </h1>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-ink-2">
            Real pulls. Real explorers. Every result comes from settled Robacha
            activity on Robinhood Chain.
          </p>
          <button type="button" title={RANK_EXPLAINER} className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-3 hover:text-ink-2">
            <Info className="h-3.5 w-3.5" aria-hidden="true" /> How leaderboard data works
          </button>

          {/* Milestone strip — strong cumulative metrics only */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Milestone label="Spins" value={totals ? milestone(totals.spins) : null} />
            <Milestone label="Rewards distributed" value={totals ? milestone(totals.prizes) : null} />
            <Milestone label="Rounds settled" value={totals ? milestone(totals.rounds) : null} />
            <Milestone label="Legendary pulls" value={legendaryTotal != null ? legendaryTotal.toLocaleString("en-US") : null} />
          </div>
        </PageContainer>
      </section>

      {/* Live reward tape */}
      <LiveTape />

      {/* Records from the machine */}
      {records.length > 0 ? (
        <Section eyebrow="Records" title="Records from the machine." description="The biggest verified pulls across Robacha.">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {records.map((r) => {
              const amount = r.decimals !== null ? formatAmount(Number(formatUnits(BigInt(r.top!.amountRaw), r.decimals))) : "—";
              const rarity = pool?.tiers[r.top!.tierIndex]?.rarity ?? null;
              const url = explorerUrl("address", r.top!.user);
              return (
                <div key={r.token} data-rarity={rarity ?? undefined} className="rarity-glass glass-highlight relative overflow-hidden rounded-[18px] p-4">
                  <span className="noise-overlay" aria-hidden="true" />
                  <div className="relative">
                    <span className="block h-9 w-9 overflow-hidden rounded-[10px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                      <TokenAvatar address={r.token} symbol={r.symbol} logoUrl={recordMarket.get(r.token)?.logoUrl} size={36} rounded="none" />
                    </span>
                    <p className="num mt-2.5 text-[18px] font-semibold leading-none tracking-[-0.02em]">{amount}</p>
                    <p className="num text-[11px] text-ink-3">{r.symbol ?? recordMarket.get(r.token)?.symbol ?? "token"}</p>
                    {rarity ? <div className="mt-2"><RarityChip rarity={rarity} size="xs" /></div> : null}
                    <div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-3">
                      {url ? <a href={url} target="_blank" rel="noreferrer" className="num hover:text-ink-2">{shortAddress(r.top!.user)}</a> : <span className="num">{shortAddress(r.top!.user)}</span>}
                      <Link href="/verify" className="inline-flex items-center gap-0.5 hover:text-ink-2">#{r.top!.roundId} <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" /></Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* Top explorers — compact top 10 */}
      <Section eyebrow="Explorers" title="Top explorers." description={TRENDING_EXPLAINER}>
        <TopExplorers explorers={explorers} me={me} loading={discovery.isLoading} />
        <div className="mt-4 flex gap-1.5">
          {([
            { key: "explorers", label: "Discovery" },
            { key: "legendary", label: "Legendary" },
            { key: "rare", label: "Rare" },
          ] as { key: Category; label: string }[]).map((t) => (
            <button key={t.key} type="button" onClick={() => setCategory(t.key)}
              className={cn("rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors", category === t.key ? "border-transparent bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]" : "border-[rgb(var(--line-rgb)_/_0.14)] text-ink-2 hover:text-ink")}>
              {t.label}
            </button>
          ))}
        </div>
        {category !== "explorers" ? (
          <div className="mt-3">
            <SimpleBoard rows={tierRank(category).slice(0, 10).map((r) => ({ user: r.user, value: r.count, unit: category === "legendary" ? "Legendary" : "Rare" }))} me={me} empty={`No ${category} pulls recorded yet.`} />
          </div>
        ) : null}
      </Section>

      {/* Biggest pulls explorer */}
      {board && board.biggestPulls.length > 0 ? <BiggestPulls board={board} pool={pool} me={me} /> : null}

      {/* Just pulled */}
      <JustPulled />

      {/* Most discovered — logos as social proof */}
      {discovery.projects.length > 0 ? (
        <Section eyebrow="Most discovered" title="Projects explorers keep finding.">
          <MostDiscoveredList projects={discovery.projects.slice(0, 6)} />
          <p className="mt-3 text-[11.5px] text-ink-3">Rewards from projects across Robinhood Chain — inclusion isn&rsquo;t partnership.</p>
        </Section>
      ) : null}

      {/* Your Robacha (secondary, reframed) */}
      {wallet.isConnected && myProjects != null && myProjects > 0 ? (
        <section className="relative py-4">
          <PageContainer width="wide">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[18px] border border-[rgba(142,197,0,0.3)] bg-[rgba(142,197,0,0.05)] p-5">
              <p className="text-[13.5px] font-semibold">
                {myRank >= 0 && myRank < 10 ? `You're a top explorer.` : myRank >= 0 && myRank < 25 ? `You're in the top 25.` : "Your discovery journey"}
              </p>
              <Sep />
              <Mini label="Projects found" value={myProjects} />
              {myLegendary > 0 ? <Mini label="Legendary pulls" value={myLegendary} /> : null}
              <Link href="/bag" className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">View My Bag <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
          </PageContainer>
        </section>
      ) : null}

      {/* CTA */}
      <section className="relative py-10">
        <PageContainer width="wide">
          <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-10">
            <span className="noise-overlay" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-section-title mx-auto max-w-[20ch]">
                {myRank >= 0 && myRank < 10 ? <>Top explorer. <span className="text-gradient-accent">Keep going.</span></> : <>The machine keeps moving. <span className="text-gradient-accent">See what you pull next.</span></>}
              </h2>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <ButtonLink href="/app" variant="primary" size="lg">Spin the machine <ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink>
                <ButtonLink href="/discover" variant="secondary" size="lg">Discover projects</ButtonLink>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

// ------------------------------------------------------------------ sub-parts

function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="relative py-5">
      <PageContainer width="wide">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} className="mb-5" />
        {children}
      </PageContainer>
    </section>
  );
}

function Milestone({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-4 py-3.5">
      <p className="num text-[24px] font-semibold leading-none tracking-[-0.03em]">{value ?? "—"}</p>
      <p className="micro mt-1.5 text-ink-3">{label}</p>
    </div>
  );
}

function Sep() {
  return <span className="hidden h-8 w-px bg-[rgb(var(--line-rgb)_/_0.12)] sm:block" aria-hidden="true" />;
}
function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="num text-[18px] font-semibold leading-none">{value.toLocaleString("en-US")}</p>
      <p className="micro mt-1 text-ink-3">{label}</p>
    </div>
  );
}

function Avatar({ address, size = 28 }: { address: string; size?: number }) {
  return (
    <span className="shrink-0 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]" style={{ width: size, height: size }}>
      <TokenAvatar address={address} symbol={null} size={size} rounded="none" />
    </span>
  );
}

function Who({ address, isMe }: { address: string; isMe: boolean }) {
  const url = explorerUrl("address", address);
  const inner = <span className="num truncate text-[13px] font-medium text-ink">{shortAddress(address)}</span>;
  return (
    <span className="min-w-0 flex-1">
      {url ? <a href={url} target="_blank" rel="noreferrer" className="hover:underline">{inner}</a> : inner}
      {isMe ? <span className="ml-2 text-[11px] text-accent-ink">you</span> : null}
    </span>
  );
}

function LiveTape() {
  const { events } = useActivity({ kinds: ["reward-assigned"], limit: 14 });
  const items = events
    .filter((e) => e.tokenSymbol && e.amountRaw && e.tokenDecimals != null)
    .slice(0, 10)
    .map((e) => ({ id: e.id, symbol: e.tokenSymbol!, amount: formatAmount(Number(formatUnits(BigInt(e.amountRaw!), e.tokenDecimals!))) }));
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div
      className="marquee-host relative overflow-hidden border-y border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--surface-rgb)_/_0.4)] py-2.5"
      style={{ "--marquee-duration": "40s" } as React.CSSProperties}
      aria-label="Live reward tape"
    >
      <div className="marquee-track flex w-max gap-6 pr-6">
        {loop.map((it, i) => (
          <span key={`${it.id}-${i}`} className="num flex shrink-0 items-center gap-1.5 text-[12px] text-ink-2">
            <span className="font-semibold text-ink">{it.symbol}</span>
            <span className="text-[#3f7d17]">+{it.amount}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TopExplorers({ explorers, me, loading }: { explorers: { user: string; projects: number }[]; me: string | null; loading: boolean }) {
  const [shown, setShown] = useState(10);
  if (loading && explorers.length === 0) return <div className="h-40 animate-pulse rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />;
  if (explorers.length === 0) {
    return <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-5 py-10 text-center text-[13px] text-ink-3">The first pull puts someone at the top.</div>;
  }
  return (
    <div>
      <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-4">
        {explorers.slice(0, shown).map((r, i) => (
          <li key={r.user} className={cn("flex items-center gap-3 py-2.5", r.user.toLowerCase() === me && "-mx-4 bg-accent-soft px-4")}>
            <span className={cn("num w-6 shrink-0 text-[12px] font-semibold", i === 0 ? "text-accent-ink" : "text-ink-3")}>#{i + 1}</span>
            <Avatar address={r.user} />
            <Who address={r.user} isMe={r.user.toLowerCase() === me} />
            <span className="num shrink-0 text-[13px] font-semibold">{r.projects} <span className="text-ink-3">projects</span></span>
          </li>
        ))}
      </ul>
      {explorers.length > shown ? (
        <button type="button" onClick={() => setShown((s) => s + 10)} className="mt-3 rounded-full border border-[rgb(var(--line-rgb)_/_0.14)] px-4 py-1.5 text-[12.5px] font-medium text-ink-2 hover:text-ink">View more</button>
      ) : null}
    </div>
  );
}

function SimpleBoard({ rows, me, empty }: { rows: { user: string; value: number; unit: string }[]; me: string | null; empty: string }) {
  if (rows.length === 0) return <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-5 py-8 text-center text-[13px] text-ink-3">{empty}</div>;
  return (
    <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-4">
      {rows.map((r, i) => (
        <li key={r.user} className={cn("flex items-center gap-3 py-2.5", r.user.toLowerCase() === me && "-mx-4 bg-accent-soft px-4")}>
          <span className="num w-6 shrink-0 text-[11px] font-semibold text-ink-3">#{i + 1}</span>
          <Avatar address={r.user} />
          <Who address={r.user} isMe={r.user.toLowerCase() === me} />
          <span className="num shrink-0 text-[13px] font-semibold">{r.value.toLocaleString("en-US")} <span className="text-ink-3">{r.unit}</span></span>
        </li>
      ))}
    </ul>
  );
}

function BiggestPulls({ board, pool, me }: { board: LeaderboardResponse; pool: ReturnType<typeof usePool>["pool"]; me: string | null }) {
  const market = useTokenMarket(board.biggestPulls.map((b) => b.token));
  const [token, setToken] = useState<string>("all");
  const [shown, setShown] = useState(10);

  // "All records" = the single biggest pull from each token, largest first.
  const allRecords = useMemo(
    () =>
      board.biggestPulls
        .map((b) => (b.entries[0] ? { ...b.entries[0], token: b.token, symbol: b.symbol, decimals: b.decimals } : null))
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => {
          const av = a.decimals !== null ? Number(formatUnits(BigInt(a.amountRaw), a.decimals)) : 0;
          const bv = b.decimals !== null ? Number(formatUnits(BigInt(b.amountRaw), b.decimals)) : 0;
          return bv - av;
        }),
    [board.biggestPulls],
  );

  const active = board.biggestPulls.find((b) => b.token === token);
  const rows = token === "all"
    ? allRecords
    : (active?.entries ?? []).map((e) => ({ ...e, token: active!.token, symbol: active!.symbol, decimals: active!.decimals }));

  return (
    <Section eyebrow="Biggest pulls" title="Every record, by token.">
      <div className="hide-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        <Pill active={token === "all"} onClick={() => { setToken("all"); setShown(10); }}>All records</Pill>
        {board.biggestPulls.map((b) => (
          <Pill key={b.token} active={b.token === token} onClick={() => { setToken(b.token); setShown(10); }}>
            <span className="h-4 w-4 overflow-hidden rounded-full [container-type:inline-size]"><TokenAvatar address={b.token} symbol={b.symbol} logoUrl={market.get(b.token)?.logoUrl} size={16} rounded="none" /></span>
            {b.symbol ? `$${b.symbol}` : shortAddress(b.token)}
          </Pill>
        ))}
      </div>
      <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-4">
        {rows.slice(0, shown).map((e, i) => {
          const amount = e.decimals !== null ? formatAmount(Number(formatUnits(BigInt(e.amountRaw), e.decimals))) : "—";
          const rarity = pool?.tiers[e.tierIndex]?.rarity ?? null;
          return (
            <li key={`${e.token}-${e.roundId}-${e.user}-${e.amountRaw}`} data-rarity={rarity ?? undefined} className={cn("flex items-center gap-3 py-2.5", e.user.toLowerCase() === me && "-mx-4 bg-accent-soft px-4")}>
              <span className="num w-6 shrink-0 text-[11px] font-semibold text-ink-3">#{i + 1}</span>
              <Avatar address={e.user} />
              <Who address={e.user} isMe={e.user.toLowerCase() === me} />
              {rarity ? <span className="hidden sm:block"><RarityChip rarity={rarity} size="xs" /></span> : null}
              <div className="shrink-0 text-right">
                <p className="num text-[13px] font-semibold">{amount} {e.symbol ?? ""}</p>
                <Link href="/verify" className="num text-[10.5px] text-ink-3 hover:text-ink-2">round #{e.roundId}</Link>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > shown ? (
        <button type="button" onClick={() => setShown((s) => s + 15)} className="mt-3 rounded-full border border-[rgb(var(--line-rgb)_/_0.14)] px-4 py-1.5 text-[12.5px] font-medium text-ink-2 hover:text-ink">Load more</button>
      ) : null}
    </Section>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors", active ? "border-transparent bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]" : "border-[rgb(var(--line-rgb)_/_0.14)] text-ink-2 hover:text-ink")}>
      {children}
    </button>
  );
}

function JustPulled() {
  const { events, isLoading } = useActivity({ kinds: ["reward-assigned"], limit: 10 });
  return (
    <Section eyebrow="Just pulled" title="Live from settled rounds.">
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />
      ) : events.length === 0 ? (
        <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-5 py-8 text-center text-[13px] text-ink-3">No recent pulls to show yet.</div>
      ) : (
        <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-4" aria-live="polite">
          {events.slice(0, 6).map((e) => {
            const amount = e.amountRaw && e.tokenDecimals != null ? formatAmount(Number(formatUnits(BigInt(e.amountRaw), e.tokenDecimals))) : null;
            return (
              <li key={e.id} className="flex items-center gap-3 py-2.5 text-[12.5px]">
                <span className="num text-ink-3">{e.wallet ? shortAddress(e.wallet) : "Someone"}</span>
                <span className="text-ink-2">pulled</span>
                <span className="num font-medium text-ink">{amount ?? ""} {e.tokenSymbol ?? ""}</span>
                <span className="ml-auto num text-[11px] text-ink-3">{formatAge((Date.now() - e.at) / 60000)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function MostDiscoveredList({ projects }: { projects: { token: string; symbol: string | null; uniqueDiscoverers: number }[] }) {
  const market = useTokenMarket(projects.map((p) => p.token));
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p, i) => {
        const project = projectByAddress(p.token);
        const href = project ? projectHref(project) : `/projects/${p.token}`;
        return (
          <li key={p.token}>
            <Link href={href} className="flex items-center gap-3 rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-3.5 py-2.5 transition-colors hover:border-[rgb(var(--line-rgb)_/_0.16)]">
              <span className="num w-5 shrink-0 text-[11px] font-semibold text-ink-3">#{i + 1}</span>
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                <TokenAvatar address={p.token} symbol={p.symbol} logoUrl={market.get(p.token)?.logoUrl} size={32} rounded="none" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{project?.name ?? p.symbol ?? shortAddress(p.token)}</span>
              <span className="num shrink-0 text-[11px] text-ink-3">{p.uniqueDiscoverers}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
