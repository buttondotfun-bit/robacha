"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Button } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { explorerUrl } from "@/lib/config";
import { formatAmount, shortAddress } from "@/lib/formatters";
import { NETWORK_LABEL } from "@/lib/web3";
import { useDiagnostics } from "@/lib/use-diagnostics";
import { RoundState, usePendingSpins } from "@/lib/use-pending-spins";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";

/**
 * The Robacha Help / diagnostic center.
 *
 * Not a contact form — a tool. It reads the connected wallet's real on-chain
 * state (via the one canonical useDiagnostics) and tells the user exactly what's
 * happening and the single next thing to do. Every result is derived from chain
 * state; there is no fake support desk, no fake AI, no invented wallet problem.
 * The one action it can take — pushing a stuck round along — is genuinely
 * permissionless, and it never asks for anything private.
 */

const X_LINK = SOCIAL_LINKS[0];

function rewardAmount(r: { amountRaw: string; decimals: number | null; symbol: string | null }): string {
  const amt = r.decimals != null ? formatAmount(Number(formatUnits(BigInt(r.amountRaw), r.decimals))) : "—";
  return `${amt} ${r.symbol ?? "token"}`;
}

export function SupportClient() {
  const wallet = useWallet();
  const diag = useDiagnostics();
  const [deep, setDeep] = useState<{ round?: string; tx?: string; issue?: string }>({});

  // Deep links: /support?round=421 | ?tx=0x… | ?issue=claim. Parsed after mount
  // (deferred so it isn't a synchronous setState in the effect body).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const next = { round: p.get("round") ?? undefined, tx: p.get("tx") ?? undefined, issue: p.get("issue") ?? undefined };
    if (!next.round && !next.tx && !next.issue) return;
    const t = window.setTimeout(() => setDeep(next), 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <PageContainer width="wide" className="pb-6 pt-6">
      <Hero diag={diag} wallet={wallet} />
      {diag.connected ? <StatusModule diag={diag} /> : null}
      <Lookup initialRound={deep.round} initialTx={deep.tx} />
      <FixPaths diag={diag} initialIssue={deep.issue} wallet={wallet} />
      <VerifyYourself />
      <SecurityCallout />
      <StillStuck diag={diag} />
      <RelatedHelp />
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ hero --- */

function Hero({ diag, wallet }: { diag: ReturnType<typeof useDiagnostics>; wallet: ReturnType<typeof useWallet> }) {
  return (
    <section className="relative overflow-hidden">
      <span className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,158,196,0.22),transparent_70%)]" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-24 top-6 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.18),transparent_70%)]" aria-hidden="true" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          <p className="micro">Help</p>
          <h1 className="mt-2.5 text-[clamp(2rem,4.4vw,3rem)] font-semibold leading-[1] tracking-[-0.035em]">Something wrong?</h1>
          <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
            Start here. Robacha checks your wallet, spins and rounds against the
            same onchain state the app uses — then tells you exactly what happens next.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-3">
            <Trust label="Reads onchain state" />
            <Trust label="Doesn't move funds" />
            <Trust label="Never asks for keys" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {wallet.isConnected ? (
              <a href="#status" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(186,232,0,0.98))] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)]">
                Check my Robacha <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <Button variant="primary" size="lg" onClick={() => void wallet.connect()} disabled={wallet.isConnecting}>
                <Wallet className="h-4 w-4" aria-hidden="true" /> Check my Robacha
              </Button>
            )}
            <a href="#lookup" className="glass-chip inline-flex h-11 items-center rounded-full px-5 text-[14px] font-semibold text-ink">Check a round</a>
          </div>
        </div>

        <YourRobacha diag={diag} wallet={wallet} />
      </div>
    </section>
  );
}

function Trust({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> {label}</span>;
}

function YourRobacha({ diag, wallet }: { diag: ReturnType<typeof useDiagnostics>; wallet: ReturnType<typeof useWallet> }) {
  if (!wallet.isConnected) {
    return (
      <div className="glass-panel rounded-[22px] p-6">
        <p className="micro text-ink-3">Your Robacha</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">Connect the wallet you used to spin. Robacha reads its public onchain activity — pending rounds, rewards and refunds — without moving anything.</p>
        <Button variant="primary" size="md" className="mt-4 w-full" onClick={() => void wallet.connect()} disabled={wallet.isConnecting}>
          <Wallet className="h-4 w-4" aria-hidden="true" /> Connect wallet
        </Button>
      </div>
    );
  }
  return (
    <div className="glass-panel rounded-[22px] p-6">
      <p className="micro text-ink-3">Your Robacha</p>
      <dl className="mt-3 space-y-0.5">
        <StatRow label="Wallet" ok value={wallet.address ? shortAddress(wallet.address, 4) : "—"} />
        <StatRow label="Network" ok={diag.networkCorrect} value={diag.networkCorrect ? NETWORK_LABEL : "Wrong network"} />
        <StatRow label="Pending spins" value={String(diag.waitingRounds.length)} muted={diag.waitingRounds.length === 0} />
        <StatRow label="Claimable rewards" value={String(diag.claimable.length)} muted={diag.claimable.length === 0} accent={diag.claimable.length > 0} />
        <StatRow label="Refunds available" value={diag.hasRefund ? "Yes" : "0"} muted={!diag.hasRefund} accent={diag.hasRefund} />
      </dl>
      {!diag.networkCorrect ? (
        <Button variant="primary" size="sm" className="mt-3 w-full" onClick={() => void wallet.switchNetwork()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Switch to {NETWORK_LABEL}
        </Button>
      ) : null}
    </div>
  );
}

function StatRow({ label, value, ok, muted, accent }: { label: string; value: string; ok?: boolean; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[rgb(var(--line-rgb)_/_0.06)] py-2 last:border-0">
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className={cn("num inline-flex items-center gap-1.5 text-[12.5px] font-semibold", accent ? "text-accent-ink" : muted ? "text-ink-3" : "text-ink")}>
        {value}
        {ok === true ? <CheckCircle2 className="h-3.5 w-3.5 text-[#3f7d17]" aria-hidden="true" /> : ok === false ? <ShieldAlert className="h-3.5 w-3.5 text-[#c0447a]" aria-hidden="true" /> : null}
      </dd>
    </div>
  );
}

/* ----------------------------------------------------------- status module - */

function StatusModule({ diag }: { diag: ReturnType<typeof useDiagnostics> }) {
  return (
    <section id="status" className="mt-10 scroll-mt-24">
      <OverallBanner diag={diag} />

      {/* Issue cards */}
      {diag.claimable.length > 0 || diag.refundableRounds.length > 0 || diag.waitingRounds.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {diag.claimable.slice(0, 4).map((r) => (
            <IssueCard key={r.rewardId} title={`Round #${r.roundId}`} heading="Reward ready" body={`${rewardAmount(r)} — assigned to this wallet and ready to claim.`}
              primary={{ label: "Open My Bag", href: "/bag" }} secondary={{ label: "Verify round", href: "/verify" }} />
          ))}
          {diag.refundableRounds.map((p) => (
            <IssueCard key={`ref-`} title={`Round #${p.roundId}`} heading="Refund available" body="This round entered a refundable state, so your full payment is waiting in My Bag."
              primary={{ label: "Withdraw in My Bag", href: "/bag" }} secondary={{ label: "Why?", href: "/faq#when-does-a-refund-happen" }} />
          ))}
          {diag.waitingRounds.map((p) => (
            <WaitingCard key={`wait-${p.roundId}`} round={p} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function OverallBanner({ diag }: { diag: ReturnType<typeof useDiagnostics> }) {
  if (diag.isLoading) {
    return <Banner tone="neutral" icon={Loader2} spin title="Checking your Robacha…" body="Reading your wallet's state from the contract." />;
  }
  if (diag.overall === "wrong-network") {
    return <Banner tone="warn" icon={ShieldAlert} title="Wrong network" body={`This wallet isn't on ${NETWORK_LABEL}. Switch networks to interact.`} />;
  }
  if (diag.overall === "refund") {
    return <Banner tone="action" icon={RefreshCw} title="Refund available" body="One of your rounds couldn't settle. Your refund is waiting in My Bag." />;
  }
  if (diag.overall === "attention") {
    const n = diag.attentionCount;
    return <Banner tone="action" icon={Clock} title={`${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} your attention`} body="See the cards below for the one next step on each." />;
  }
  if (diag.overall === "no-history") {
    return <Banner tone="ok" icon={CheckCircle2} title="All clear" body="We couldn't find any Robacha spins for this wallet. Used another wallet? Connect that one, or spin the machine." cta={{ label: "Spin Genesis", href: "/app" }} />;
  }
  return (
    <Banner tone="ok" icon={CheckCircle2} title="All clear" body="Nothing needs your attention. Your spins are settled and you have no pending actions." cta={{ label: "Open My Bag", href: "/bag" }}>
      {diag.lastSettledRound != null ? <span className="num mt-2 block text-[11.5px] text-ink-3">Last settled round #{diag.lastSettledRound}</span> : null}
    </Banner>
  );
}

function Banner({ tone, icon: Icon, spin, title, body, cta, children }: { tone: "ok" | "action" | "warn" | "neutral"; icon: typeof Clock; spin?: boolean; title: string; body: string; cta?: { label: string; href: string }; children?: React.ReactNode }) {
  const tint = {
    ok: "border-[rgba(142,197,0,0.35)] bg-[rgba(142,197,0,0.06)]",
    action: "border-[rgba(47,90,168,0.28)] bg-[rgba(47,90,168,0.05)]",
    warn: "border-[rgba(240,190,60,0.4)] bg-[rgba(240,190,60,0.08)]",
    neutral: "border-[rgb(var(--line-rgb)_/_0.12)] bg-[rgb(var(--ink-rgb)_/_0.02)]",
  }[tone];
  const iconColor = { ok: "text-[#3f7d17]", action: "text-[#2f5aa8]", warn: "text-[#8a6410]", neutral: "text-ink-3" }[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-[18px] border p-5", tint)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor, spin && "animate-spin")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{body}</p>
        {children}
        {cta ? <Link href={cta.href} className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-ink hover:underline">{cta.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}
      </div>
    </div>
  );
}

function IssueCard({ title, heading, body, primary, secondary }: { title: string; heading: string; body: string; primary: { label: string; href: string }; secondary?: { label: string; href: string } }) {
  return (
    <div className="glass-card rounded-[18px] p-5">
      <div className="flex items-center justify-between">
        <span className="num text-[11px] text-ink-3">{title}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,90,168,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#2f5aa8]">{heading}</span>
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={primary.href} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-surface">{primary.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        {secondary ? <Link href={secondary.href} className="glass-chip inline-flex h-9 items-center rounded-full px-3.5 text-[12.5px] font-medium text-ink">{secondary.label}</Link> : null}
      </div>
    </div>
  );
}

/** A waiting round — includes the genuinely permissionless "push along" action. */
function WaitingCard({ round }: { round: ReturnType<typeof usePendingSpins>["pending"][number] }) {
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const canPush = round.state !== RoundState.Open && !round.withdrawable;

  async function push() {
    setWorking(true);
    setResult(null);
    try {
      const res = await fetch("/api/settle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roundId: round.roundId }) });
      const body = (await res.json()) as { ok?: boolean; state?: string };
      setResult(body.ok ? `Round is now ${body.state}.` : "That didn't go through. Try again shortly.");
    } catch {
      setResult("Couldn't reach the server. Try again shortly.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="glass-card rounded-[18px] p-5">
      <div className="flex items-center justify-between">
        <span className="num text-[11px] text-ink-3">Round #{round.roundId}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] px-2 py-0.5 text-[10px] font-semibold text-ink-3">{round.label}</span>
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">{round.detail}</p>
      {canPush ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void push()} disabled={working}>
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            {working ? "Pushing along…" : "Push this round along"}
          </Button>
          {result ? <p className="text-[12px] text-ink-2">{result}</p> : null}
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ink-3"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> No action required — the round finishes on its own.</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- lookup --- */

function Lookup({ initialRound, initialTx }: { initialRound?: string; initialTx?: string }) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!initialRound && !initialTx) return;
    const t = window.setTimeout(() => setQ(initialRound ? `#${initialRound}` : initialTx ?? ""), 0);
    return () => window.clearTimeout(t);
  }, [initialRound, initialTx]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    const round = v.replace(/^#/, "");
    if (/^\d+$/.test(round)) {
      window.location.href = `/verify?round=${round}`;
    } else if (/^0x[a-fA-F0-9]{64}$/.test(v)) {
      const url = explorerUrl("tx", v);
      if (url) window.open(url, "_blank", "noopener");
    } else if (/^0x[a-fA-F0-9]{40}$/.test(v)) {
      const url = explorerUrl("address", v);
      if (url) window.open(url, "_blank", "noopener");
    }
  }

  return (
    <section id="lookup" className="mt-12 scroll-mt-24">
      <p className="micro text-ink-3">Check something specific</p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">Look up a round, transaction or wallet.</h2>
      <form onSubmit={submit} className="mt-4 flex max-w-[620px] items-center gap-2">
        <div className="flex flex-1 items-center gap-2.5 rounded-full border border-[rgb(var(--line-rgb)_/_0.12)] bg-surface/80 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Round #421, 0x transaction or wallet…" className="h-12 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3" aria-label="Round, transaction or wallet" autoComplete="off" spellCheck={false} />
        </div>
        <Button type="submit" variant="primary" size="md">Check</Button>
      </form>
      <p className="mt-2 text-[11.5px] text-ink-3">A round number opens the verifier; a transaction or wallet opens the explorer.</p>
    </section>
  );
}

/* ------------------------------------------------------------- fix paths --- */

const FIX_PATHS: { id: string; title: string; explain: (d: ReturnType<typeof useDiagnostics>) => string; href: string; cta: string }[] = [
  { id: "waiting", title: "My spin is waiting", explain: (d) => d.waitingRounds.length ? `Round #${d.waitingRounds[0].roundId} is mid-flight — your entry is already recorded onchain and nothing needs signing again.` : "No mid-flight spin was found for this wallet. A spin resolves once its round settles.", href: "/how-it-works#rounds", cta: "How rounds work" },
  { id: "missing", title: "My reward is missing", explain: (d) => d.claimable.length ? `You have ${d.claimable.length} reward${d.claimable.length === 1 ? "" : "s"} assigned and ready to claim in My Bag.` : "A reward only appears after its round settles. Check My Bag for assigned rewards.", href: "/bag", cta: "Open My Bag" },
  { id: "claim", title: "My claim failed", explain: () => "Claiming needs the right wallet on Robinhood Chain with a little gas. If the round hasn't settled, no claim is possible yet.", href: "/faq#how-are-rewards-claimed", cta: "Claim help" },
  { id: "refund", title: "I expected a refund", explain: (d) => d.hasRefund ? "A refund is available — withdraw it in My Bag." : "A refund only exists when a round can't settle or pay in full. Contract state decides, not expectation.", href: "/faq#when-does-a-refund-happen", cta: "Refund rules" },
  { id: "tx", title: "My transaction failed", explain: () => "Inspect the transaction on Robinhood Chain to see the revert reason — usually gas or network.", href: "/activity", cta: "View activity" },
  { id: "spin", title: "I can't spin", explain: () => "Paid spins may be switched off while testing, or your wallet may be on the wrong network. The button says which.", href: "/app", cta: "Open the app" },
  { id: "network", title: "Wrong network", explain: () => `Robacha runs on ${NETWORK_LABEL}. Switch your wallet's network and try again.`, href: "/how-it-works", cta: "Learn more" },
  { id: "raffle", title: "Raffle issue", explain: () => "Raffle tickets, refunds and prizes are all enforced by the raffle contract. Open the raffle to see its live state.", href: "/raffle", cta: "View raffles" },
];

function FixPaths({ diag, initialIssue, wallet }: { diag: ReturnType<typeof useDiagnostics>; initialIssue?: string; wallet: ReturnType<typeof useWallet> }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!initialIssue) return;
    const t = window.setTimeout(() => setActive(initialIssue), 0);
    return () => window.clearTimeout(t);
  }, [initialIssue]);

  return (
    <section className="mt-14">
      <p className="micro text-ink-3">Self-service</p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">What are you trying to fix?</h2>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {FIX_PATHS.map((p) => {
          const open = active === p.id;
          return (
            <div key={p.id} className={cn("rounded-[16px] border p-4 transition-colors", open ? "border-[rgba(47,90,168,0.3)] bg-[rgba(47,90,168,0.04)]" : "glass-card")}>
              <button type="button" onClick={() => setActive(open ? null : p.id)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left">
                <span className="text-[13px] font-semibold tracking-[-0.01em]">{p.title}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden="true" />
              </button>
              {open ? (
                <div className="mt-2.5">
                  <p className="text-[12px] leading-relaxed text-ink-2">{wallet.isConnected ? p.explain(diag) : p.explain(diag)}</p>
                  <Link href={p.href} className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-accent-ink hover:underline">{p.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------- verify yourself --- */

function VerifyYourself() {
  const cards = [
    { title: "Check a round", body: "Inspect round state and result.", href: "/verify" },
    { title: "My Bag", body: "See assigned rewards and claims.", href: "/bag" },
    { title: "Activity", body: "See recent onchain Robacha activity.", href: "/activity" },
    { title: "Transparency", body: "Contracts, randomness and status.", href: "/transparency" },
  ];
  return (
    <section className="mt-14">
      <p className="micro text-ink-3">Self-service</p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">Don&rsquo;t want to wait for us? Verify it yourself.</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="glass-card group flex flex-col rounded-[16px] p-5 transition-transform hover:-translate-y-0.5">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{c.title}</h3>
            <p className="mt-1 flex-1 text-[12px] leading-relaxed text-ink-2">{c.body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink">Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- security callout - */

function SecurityCallout() {
  return (
    <section className="mt-14">
      <div className="rounded-[18px] border border-[rgba(192,68,122,0.3)] bg-[rgba(192,68,122,0.05)] p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#c0447a]" aria-hidden="true" />
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Robacha will never ask for</h2>
        </div>
        <ul className="mt-3 grid gap-1.5 text-[12.5px] text-ink-2 sm:grid-cols-2">
          {["Your seed phrase or recovery phrase", "Your private key", "Remote access to your computer", "Funds sent to “fix” a transaction"].map((l) => (
            <li key={l} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#c0447a]" aria-hidden="true" /> {l}</li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-3">Support only needs public information: your wallet address, a round number or a transaction hash. Anyone asking for the above is not us.</p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- still stuck --- */

function StillStuck({ diag }: { diag: ReturnType<typeof useDiagnostics> }) {
  const [copied, setCopied] = useState(false);
  const detectedState = diag.overall === "attention" ? "Action needed" : diag.overall === "refund" ? "Refund available" : diag.overall === "wrong-network" ? "Wrong network" : diag.overall === "all-clear" ? "All settled" : diag.overall === "no-history" ? "No activity found" : "Not connected";
  const round = diag.claimable[0]?.roundId ?? diag.waitingRounds[0]?.roundId ?? diag.refundableRounds[0]?.roundId ?? null;

  const message = [
    "Hi Robacha — having an issue with:",
    diag.address ? `Wallet: ${shortAddress(diag.address, 6)}` : "Wallet: (not connected)",
    round != null ? `Round: #${round}` : null,
    `Network: ${NETWORK_LABEL}`,
    `State shown: ${detectedState}`,
    "(No sensitive data included.)",
  ].filter(Boolean).join("\n");

  function copy() {
    try {
      void navigator.clipboard?.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="mt-14">
      <p className="micro text-ink-3">Escalation</p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">Still stuck?</h2>
      <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-ink-2">If Robacha can&rsquo;t diagnose it automatically, send us the public details below. Never include a seed phrase or private key — we&rsquo;ll never ask.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="glass-card rounded-[16px] p-5">
          <p className="micro text-ink-3">Support details</p>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
            <Detail label="Wallet" value={diag.address ? shortAddress(diag.address, 6) : "Not connected"} />
            <Detail label="Network" value={NETWORK_LABEL} />
            {round != null ? <Detail label="Round" value={`#${round}`} /> : null}
            <Detail label="Detected state" value={detectedState} />
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="md" onClick={copy}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy support details"}
          </Button>
          <a href={X_LINK.href} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-surface">
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Message {X_LINK.handle} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--line-rgb)_/_0.06)] py-1.5 last:border-0"><dt className="text-ink-3">{label}</dt><dd className="num font-medium text-ink">{value}</dd></div>;
}

/* --------------------------------------------------------- related help --- */

function RelatedHelp() {
  const links = [
    { label: "How rounds work", href: "/how-it-works#rounds" },
    { label: "How claims work", href: "/faq#how-are-rewards-claimed" },
    { label: "How refunds work", href: "/faq#when-does-a-refund-happen" },
    { label: "How randomness works", href: "/how-it-works#randomness" },
    { label: "FAQ", href: "/faq" },
    { label: "Contracts & docs", href: "/docs" },
  ];
  return (
    <section className="mt-14">
      <p className="micro text-ink-3">Understand what&rsquo;s happening</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="glass-chip inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-medium text-ink-2 hover:text-ink">{l.label} <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>
        ))}
      </div>
    </section>
  );
}
