"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Coins,
  Dice5,
  Layers,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { PageContainer } from "@/components/shared/primitives";
import { CapsuleGlyph } from "@/components/nft/CapsuleGlyph";
import { machineBySlug } from "@/data/machines";
import { DEEP_DIVE } from "@/data/how-it-works";
import { RARITY_LABEL } from "@/lib/constants";
import { formatCompact } from "@/lib/formatters";
import { useLiveRound } from "@/lib/use-live-round";
import { usePool } from "@/lib/use-pool";
import { useRobBurned } from "@/lib/use-rob-burned";
import { useTokenMarket } from "@/lib/use-token-market";
import { cn } from "@/lib/utils";

/**
 * How Robacha works — the product walkthrough.
 *
 * A client component so the live mechanics it describes are shown with real
 * data (the current pool's odds and assets, the live round, the $ROB burn) —
 * never a hardcoded copy of numbers that live elsewhere. Every factual claim is
 * the same one the deployed contracts back; the DEEP_DIVE answers (exported for
 * the page's FAQPage JSON-LD) preserve the full text of the old explainer.
 * Renders its prose on the server too, so it stays a real SEO landing page.
 */

const ROUND_CAPACITY = 5;

// The section anchors the sticky nav jumps between.
const NAV = [
  { id: "steps", label: "Steps" },
  { id: "pools", label: "Pools" },
  { id: "odds", label: "Odds" },
  { id: "rounds", label: "Rounds" },
  { id: "randomness", label: "Randomness" },
  { id: "rewards", label: "Rewards" },
  { id: "payments", label: "Payments" },
  { id: "verify", label: "Verify" },
] as const;

export function HowItWorksClient() {
  return (
    <>
      <Hero />
      <StickyNav />
      <PageContainer width="wide" className="pb-4">
        <FourSteps />
        <Architecture />
        <MachineVsPool />
        <SpinWalkthrough />
        <PoolsSection />
        <OddsSection />
        <RoundsSection />
        <RandomnessSection />
        <RewardsSection />
        <PaymentsSection />
        <RobSection />
        <RefundsSection />
        <EcosystemSection />
        <VerifySection />
        <DeepDive />
        <Endcap />
      </PageContainer>
    </>
  );
}

/* ------------------------------------------------------------------ hero --- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <span className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,158,196,0.28),transparent_70%)]" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.22),transparent_70%)]" aria-hidden="true" />
      <PageContainer width="wide" className="relative pt-10">
        <div className="grid items-center gap-8 lg:grid-cols-[45fr_55fr]">
          <div>
            <p className="micro">How it works</p>
            <h1 className="mt-2.5 text-[clamp(2.2rem,4.6vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              See exactly how
              <br />
              Robacha works.
            </h1>
            <p className="mt-3.5 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
              Robacha is an onchain discovery machine on Robinhood Chain. Pick a
              transparent reward pool, enter a round, let the machine resolve, and
              claim what you pull.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/app" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(204,255,0,0.98),rgba(186,232,0,0.98))] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5">
                Spin the machine <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/pools" className="glass-chip inline-flex h-11 items-center rounded-full px-5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5">
                Explore pools
              </Link>
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-ink-3">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
              Pools, odds, rounds and results are published for anyone to inspect.
            </p>
          </div>

          <FlowDiagram />
        </div>
      </PageContainer>
    </section>
  );
}

/** The system, at a glance: projects → pool → machine → capsule → wallet. */
function FlowDiagram() {
  const nodes = [
    { icon: Layers, label: "Project cards" },
    { icon: Coins, label: "Genesis Pool" },
    { icon: Dice5, label: "Robacha machine" },
    { icon: Sparkles, label: "Reward capsule" },
    { icon: Wallet, label: "Your wallet" },
  ];
  return (
    <div className="glass-panel glass-reflection relative overflow-hidden rounded-[26px] p-6">
      <span className="noise-overlay" aria-hidden="true" />
      <div className="relative flex flex-col gap-2.5">
        {nodes.map((n, i) => {
          const Icon = n.icon;
          const accent = i === 2;
          return (
            <div key={n.label}>
              <div className={cn("flex items-center gap-3 rounded-[14px] border p-3", accent ? "border-[rgba(204,255,0,0.4)] bg-[rgba(204,255,0,0.08)]" : "border-[rgb(var(--line-rgb)_/_0.08)] bg-surface/70")}>
                <span className={cn("grid h-9 w-9 place-items-center rounded-[11px]", accent ? "bg-[rgba(204,255,0,0.2)] text-accent-ink" : "bg-accent-soft text-accent-ink")}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{n.label}</span>
              </div>
              {i < nodes.length - 1 ? (
                <div className="flex justify-center py-0.5" aria-hidden="true">
                  <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- sticky nav - */

function StickyNav() {
  const [active, setActive] = useState<string>(NAV[0].id);

  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-[72px] z-30 mt-8 border-y border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--canvas-rgb)_/_0.85)] backdrop-blur-md">
      <PageContainer width="wide" className="py-2.5">
        <nav aria-label="On this page" className="flex gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                active === n.id ? "bg-ink text-surface" : "text-ink-2 hover:bg-[rgb(var(--ink-rgb)_/_0.05)] hover:text-ink",
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </PageContainer>
    </div>
  );
}

/* ---------------------------------------------------------- section head --- */

function Head({ eyebrow, title, copy, id }: { eyebrow: string; title: string; copy?: string; id?: string }) {
  return (
    <div id={id} className="max-w-[54ch] scroll-mt-32">
      <p className="micro text-ink-3">{eyebrow}</p>
      <h2 className="mt-1.5 text-[clamp(1.6rem,2.8vw,2.2rem)] font-semibold leading-[1.03] tracking-[-0.03em]">{title}</h2>
      {copy ? <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">{copy}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------- 4 steps ---- */

function FourSteps() {
  const steps = [
    { n: "01", icon: MousePointerClick, title: "Choose", body: "Pick a live reward pool and how many spins you want." },
    { n: "02", icon: Coins, title: "Enter", body: "Your spins join the next Robacha round." },
    { n: "03", icon: Dice5, title: "Draw", body: "The machine resolves from the published pool and verifiable randomness." },
    { n: "04", icon: Wallet, title: "Claim", body: "Your reward becomes claimable and can be sent to your wallet." },
  ];
  return (
    <section id="steps" className="scroll-mt-32 pt-14">
      <Head eyebrow="The whole machine" title="Four steps. Start to finish." />
      <ol className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-3">
              <div className="glass-card h-full flex-1 rounded-[20px] p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-accent-ink"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="num text-[13px] text-ink-3">{s.n}</span>
                </div>
                <h3 className="mt-3.5 text-[16px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
              {i < steps.length - 1 ? <ArrowRight className="hidden h-4 w-4 shrink-0 text-ink-3 lg:block" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------- architecture --- */

function Architecture() {
  const nodes = ["Projects / assets", "Reward pool", "Machine", "Round", "Randomness", "Reward", "Wallet"];
  const detail: Record<string, string> = {
    "Reward pool": "The published collection of rewards the machine can draw from.",
    Machine: "The interface and contracts that organise the spin.",
    Round: "A group of entries settled together.",
    Randomness: "Committed before settlement, so the result can be checked.",
  };
  return (
    <section className="pt-16">
      <Head eyebrow="Under the hood" title="A spin moves through the same transparent system every time." />
      <div className="mt-6 flex flex-wrap items-stretch gap-2">
        {nodes.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="glass-card rounded-[14px] px-4 py-3" title={detail[label]}>
              <p className="text-[13px] font-semibold tracking-[-0.01em]">{label}</p>
              {detail[label] ? <p className="mt-0.5 max-w-[22ch] text-[11px] leading-snug text-ink-3">{detail[label]}</p> : null}
            </div>
            {i < nodes.length - 1 ? <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------- machine vs pool - */

function MachineVsPool() {
  return (
    <section className="pt-16">
      <Head eyebrow="Two words that matter" title="Machine vs Pool." copy="They're easy to mix up, and the difference is the whole architecture." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-[20px] p-6">
          <div className="flex items-center gap-2"><Dice5 className="h-4 w-4 text-accent-ink" aria-hidden="true" /><h3 className="text-[15px] font-semibold">Machine</h3></div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">The thing that runs the experience — the interface and contracts that perform the draw.</p>
          <p className="mt-3 text-[11.5px] text-ink-3">Genesis Machine · NFT Machine · Stock Machine</p>
          <Link href="/machines" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">View machines <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
        <div className="glass-card rounded-[20px] p-6">
          <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-accent-ink" aria-hidden="true" /><h3 className="text-[15px] font-semibold">Pool</h3></div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">The published inventory a machine draws from — its assets, ranges and probabilities.</p>
          <p className="mt-3 text-[11.5px] text-ink-3">Genesis Pool</p>
          <Link href="/pools" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">View pools <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      </div>
      <p className="mt-3 text-center text-[12.5px] text-ink-3">Machine <span className="text-ink-2">→ draws from →</span> Pool</p>
    </section>
  );
}

/* -------------------------------------------------------- spin walkthrough - */

function SpinWalkthrough() {
  const steps = [
    { k: "Choose spins", v: "− 1 +" },
    { k: "Your spin enters a round", v: "Round · 3 / 5" },
    { k: "A tier resolves", v: "Common · Rare · Legendary" },
    { k: "The machine picks from that tier", v: "one published prize" },
    { k: "Reward assigned", v: "claimable in your bag" },
  ];
  return (
    <section className="pt-16">
      <Head eyebrow="Step by step" title="What happens when you spin?" />
      <ol className="mt-6 grid gap-3 md:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.k} className="glass-card rounded-[16px] p-4">
            <span className="num text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-1.5 text-[13px] font-semibold leading-snug tracking-[-0.01em]">{s.k}</p>
            <p className="num mt-2 text-[11.5px] text-ink-3">{s.v}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11.5px] text-ink-3">Illustrative — not a live transaction. The real flow runs on the <Link href="/app" className="underline decoration-dotted underline-offset-2 hover:text-ink">spin page</Link>.</p>
    </section>
  );
}

/* ----------------------------------------------------------------- pools --- */

function PoolsSection() {
  const { pool } = usePool();
  const tokens = useMemo(() => (pool ? [...new Set(pool.entries.map((e) => e.token.toLowerCase()))] : []), [pool]);
  const market = useTokenMarket(tokens);
  const shown = tokens.slice(0, 7);
  const extra = tokens.length - shown.length;

  return (
    <section id="pools" className="scroll-mt-32 pt-16">
      <Head eyebrow="Reward pools" title="Everything the machine can pull is published." copy="A pool is the published reward inventory for a machine. Its contents, ranges and probabilities are visible before you participate." />
      <div className="mt-6 glass-panel rounded-[22px] p-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,197,0,0.16)] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#3f7d17]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Live
          </span>
          <span className="num text-[12px] text-ink-3">{pool ? `${tokens.length} assets` : "—"}</span>
        </div>
        <p className="mt-3 text-[15px] font-semibold">{pool?.name || "Genesis Pool"}</p>
        {tokens.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {shown.map((addr) => (
              <span key={addr} className="glass-chip inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3">
                <span className="h-6 w-6 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.7)] [container-type:inline-size]">
                  <TokenAvatar address={addr} symbol={market.get(addr)?.symbol ?? null} logoUrl={market.get(addr)?.logoUrl} size={24} rounded="none" />
                </span>
                <span className="num text-[11.5px] font-medium text-ink">{market.get(addr)?.symbol ?? "token"}</span>
              </span>
            ))}
            {extra > 0 ? <span className="num inline-flex items-center rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] px-3 py-1.5 text-[11.5px] text-ink-2">+{extra}</span> : null}
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-3">Live pool data loads from the contract.</p>
        )}
        <Link href="/pools/genesis" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:underline">View Genesis Pool <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ odds --- */

function OddsSection() {
  const { pool } = usePool();
  const tiers = pool?.tiers ?? [];
  return (
    <section id="odds" className="scroll-mt-32 pt-16">
      <Head eyebrow="Odds" title="No mystery odds." copy="Each tier's probability comes straight from the pool contract — the same numbers the draw uses." />
      {tiers.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.index} className="glass-card rounded-[18px] p-5 text-center">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{RARITY_LABEL[t.rarity]}</p>
              <p className="num mt-2 text-[34px] font-semibold tracking-[-0.03em] text-accent-ink">{Math.round(t.probabilityPercent)}%</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 glass-card rounded-[18px] p-6 text-[13px] text-ink-3">Live tier odds load from the pool contract.</div>
      )}
      <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
        A spin picks a tier first, then a prize inside that tier, then an amount inside that prize&rsquo;s published range. Within a tier, each asset has its own published probability and inventory.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- rounds --- */

function RoundsSection() {
  const round = useLiveRound();
  const stages = ["Entries fill", "Round closes", "Randomness requested", "Round settles", "Rewards assigned"];
  return (
    <section id="rounds" className="scroll-mt-32 pt-16">
      <Head eyebrow="Rounds" title={`${ROUND_CAPACITY} pulls. One round.`} copy="Spins are grouped into rounds and settled together. A spin resolves when its round settles — not in the spin transaction." />
      {round.status === "open" && round.roundId ? (
        <p className="num mt-4 inline-flex items-center gap-1.5 rounded-full bg-[rgba(142,197,0,0.12)] px-3 py-1 text-[12px] text-[#3f7d17]">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Round #{round.roundId} open · {round.entryCount ?? 0}/{ROUND_CAPACITY}
        </p>
      ) : null}
      <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        {stages.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-ink-2">
              <span className="num text-ink-3">{i + 1}</span> {s}
            </span>
            {i < stages.length - 1 ? <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-ink-3 sm:block" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2 text-[11.5px]">
        {[["Open", "taking entries"], ["Settling", "randomness requested"], ["Settled", "rewards assigned"], ["Refundable", "entries can be withdrawn"]].map(([s, d]) => (
          <span key={s} className="rounded-[10px] bg-[rgb(var(--ink-rgb)_/_0.03)] px-3 py-2 text-ink-3"><span className="font-semibold text-ink-2">{s}</span> — {d}</span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ randomness --- */

function RandomnessSection() {
  const flow = ["Randomness committed before settlement", "Folded into the round's draw", "Draw result assigned", "Verify on chain"];
  return (
    <section id="randomness" className="scroll-mt-32 pt-16">
      <div className="glass-panel glass-reflection relative overflow-hidden rounded-[26px] p-6 sm:p-8">
        <span className="noise-overlay" aria-hidden="true" />
        <div className="relative">
          <Head eyebrow="Randomness" title="Nobody's server chooses your pull." copy="Robacha uses a verifiable randomness process, so a round's result can be checked after settlement rather than trusted." />
          <ol className="mt-6 grid gap-2 sm:grid-cols-4">
            {flow.map((f, i) => (
              <li key={f} className="rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-surface/70 p-4">
                <span className="num text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1.5 text-[12.5px] font-medium leading-snug">{f}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/verify" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-semibold text-surface transition-transform hover:-translate-y-0.5">Verify a round <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            <Link href="/docs" className="glass-chip inline-flex h-10 items-center rounded-full px-4 text-[13px] font-medium text-ink">Read the docs</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- rewards --- */

function RewardsSection() {
  const flow = ["Round settles", "Reward appears in My Bag", "You claim", "Token in your wallet"];
  return (
    <section id="rewards" className="scroll-mt-32 pt-16">
      <Head eyebrow="Rewards" title="You pulled it. Now it's yours." copy="When a round settles, your reward is assigned to your wallet and waits in your bag. Claiming is a separate transaction that transfers the token to you." />
      <ol className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        {flow.map((f, i) => (
          <li key={f} className="flex items-center gap-2">
            <span className="glass-card inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-[12.5px] font-medium">{f}</span>
            {i < flow.length - 1 ? <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-ink-3 sm:block" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
      <Link href="/bag" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:underline">View My Bag <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </section>
  );
}

/* -------------------------------------------------------------- payments --- */

function PaymentsSection() {
  const { pool } = usePool();
  // Real split from the pool contract's bps, falling back to the published
  // 85/12/3 the live pool has run since launch.
  const reserve = pool ? pool.rewardReserveBps / 100 : 85;
  const protocol = pool ? pool.protocolFeeBps / 100 : 12;
  const ops = pool ? pool.operationsFeeBps / 100 : 3;
  const parts = [
    { label: "Prize inventory", pct: reserve, color: "#8ec500" },
    { label: "Robacha", pct: protocol, color: "rgb(var(--ink-rgb) / 0.28)" },
    { label: "Operations", pct: ops, color: "rgb(var(--ink-rgb) / 0.14)" },
  ];
  return (
    <section id="payments" className="scroll-mt-32 pt-16">
      <Head eyebrow="Where your spin goes" title="Every portion is labelled." copy="Your wallet pays the spin transaction; the protocol handles the split. Nothing is manually routed by an operator." />
      <div className="mt-6 glass-card rounded-[20px] p-6">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full">
          {parts.map((p) => <span key={p.label} className="h-full" style={{ width: `${p.pct}%`, background: p.color }} aria-hidden="true" />)}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2">
          {parts.map((p) => (
            <li key={p.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" /> {p.label} <span className="num font-semibold text-ink">{Math.round(p.pct)}%</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ $ROB --- */

function RobSection() {
  const { burned } = useRobBurned();
  const burnedNum = burned != null ? Number(burned) / 1e18 : null;
  const showBurn = burnedNum != null && burnedNum > 0;
  return (
    <section className="pt-16">
      <Head eyebrow="$ROB" title="$ROB powers more of the machine." />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <RobCard title="Pay with $ROB" body="Spend $ROB on eligible spins — your wallet swaps it for exactly the ETH a spin costs." />
        <RobCard title="Buyback + burn" body="Protocol fees buy $ROB back and send it to a dead address no one can spend." />
        <RobCard title="Utility token" body="The official Robacha ecosystem token on Robinhood Chain." />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {showBurn ? (
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px]"><span className="num font-semibold text-ink">{formatCompact(burnedNum!)}</span> <span className="text-ink-3">$ROB burned</span></span>
        ) : null}
        <Link href="/rob" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:underline">About $ROB <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        <Link href="/transparency" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">Verify the burn <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

function RobCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass-card rounded-[18px] p-5">
      <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

/* --------------------------------------------------------------- refunds --- */

function RefundsSection() {
  const flow = ["Round can't pay a prize in full, or fails to settle in time", "Those entries become refundable", "The people owed withdraw their refund"];
  return (
    <section className="pt-16">
      <Head eyebrow="Refunds" title="What if a round can't settle?" copy="An entry is refunded rather than paid short. The contract holds the money, not us." />
      <ol className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        {flow.map((f, i) => (
          <li key={f} className="flex items-center gap-2">
            <span className="glass-card inline-flex max-w-[26ch] items-center rounded-[14px] px-4 py-2.5 text-[12.5px] font-medium leading-snug">{f}</span>
            {i < flow.length - 1 ? <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-ink-3 sm:block" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------- ecosystem --- */

function EcosystemSection() {
  const cards = [
    { slug: "nft", name: "NFT Machine", body: "Pull NFTs from published collection pools." },
    { slug: "tokenized-stocks", name: "Stock Machine", body: "Tokenized-stock discovery." },
  ];
  return (
    <section className="pt-16">
      <Head eyebrow="More Robacha" title="The machine is getting bigger." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EcoCard href="/machines" title="Genesis Machine" status="Live" body="Token rewards from the live pool." live />
        {cards.map((c) => {
          const m = machineBySlug(c.slug);
          return <EcoCard key={c.slug} href={m?.href ?? "/machines"} title={c.name} status="Coming soon" body={c.body} />;
        })}
        <EcoCard href="/raffle" title="Raffles" status="Live" body="Turn NFTs into onchain raffles." live />
      </div>
      <Link href="/machines" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:underline">View all machines <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </section>
  );
}

function EcoCard({ href, title, status, body, live }: { href: string; title: string; status: string; body: string; live?: boolean }) {
  return (
    <Link href={href} className="glass-card group flex flex-col rounded-[18px] p-5 transition-transform hover:-translate-y-0.5">
      <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", live ? "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]" : "bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3")}>
        {live ? <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> : null}{status}
      </span>
      <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{body}</p>
    </Link>
  );
}

/* ---------------------------------------------------------------- verify --- */

function VerifySection() {
  const cards = [
    { title: "Pool", body: "See what the machine could pull.", href: "/pools/genesis" },
    { title: "Odds", body: "Inspect the published probabilities.", href: "/pools/genesis" },
    { title: "Round", body: "Recompute a settlement.", href: "/verify" },
    { title: "Contracts", body: "Read the deployed logic.", href: "/docs" },
  ];
  return (
    <section id="verify" className="scroll-mt-32 pt-16">
      <div className="glass-panel glass-reflection relative overflow-hidden rounded-[26px] p-6 sm:p-8">
        <span className="noise-overlay" aria-hidden="true" />
        <div className="relative">
          <Head eyebrow="Trust" title="Don't trust the UI. Verify it." copy="Pools, odds, rounds, contracts and settled results can be inspected independently." />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <Link key={c.title} href={c.href} className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-surface/70 p-4 transition-transform hover:-translate-y-0.5">
                <p className="text-[13.5px] font-semibold">{c.title}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{c.body}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/verify" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-semibold text-surface">Verify a round</Link>
            <Link href="/transparency" className="glass-chip inline-flex h-10 items-center rounded-full px-4 text-[13px] font-medium text-ink">Transparency</Link>
            <Link href="/docs" className="glass-chip inline-flex h-10 items-center rounded-full px-4 text-[13px] font-medium text-ink">Contracts</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- deep dive --- */

function DeepDive() {
  return (
    <section className="pt-16">
      <Head eyebrow="Deep dive" title="The full mechanics." copy="Every factual detail, in plain language. Open what you want." />
      <div className="mt-6 divide-y divide-[rgb(var(--line-rgb)_/_0.08)] overflow-hidden rounded-[18px] glass-card">
        {DEEP_DIVE.map((item) => <DeepRow key={item.q} q={item.q} a={item.a} />)}
      </div>
    </section>
  );
}

function DeepRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="text-[14px] font-medium tracking-[-0.01em]">{q}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-2">{a}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- endcap --- */

function Endcap() {
  return (
    <section className="py-16">
      <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] px-6 py-14 text-center sm:px-10">
        <span className="noise-overlay" aria-hidden="true" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.16),transparent_66%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[40ch]">
          <span aria-hidden="true" data-rarity="grail" className="mx-auto mb-5 block w-fit"><CapsuleGlyph id="hiw-cta" className="capsule-float h-14 w-14 drop-shadow-[0_10px_22px_rgb(var(--rarity-glow)_/_0.45)]" /></span>
          <h2 className="text-[clamp(1.9rem,3.6vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.03em]">Know the machine. <span className="text-gradient-accent">Now rob it.</span></h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/app" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(204,255,0,0.98),rgba(186,232,0,0.98))] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5">Spin Genesis <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/pools/genesis" className="glass-chip inline-flex h-11 items-center rounded-full px-5 text-[14px] font-semibold text-ink">Explore the pool</Link>
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-ink-3">
            Robacha is an independent project built for Robinhood Chain — not affiliated with, endorsed by, or operated by Robinhood. Token values go up and down; nothing here is financial advice.
          </p>
        </div>
      </div>
    </section>
  );
}
