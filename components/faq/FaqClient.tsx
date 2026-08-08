"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  Coins,
  Compass,
  Globe,
  Layers,
  Link2,
  Search,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { FAQ_GROUPS } from "@/data/faq";
import { useMounted } from "@/lib/use-mounted";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { cn } from "@/lib/utils";

/**
 * The Robacha support / FAQ experience.
 *
 * Everything is built from the canonical FAQ_GROUPS in data/faq — search,
 * category navigation and deep-linkable accordions all read the same answers,
 * so nothing here is a second copy that can drift. Wallet-aware help is derived
 * only from real WalletHistory (never a fabricated alert), and there is no fake
 * AI, no fake popularity ranking and no fake support desk — just fast answers,
 * troubleshooting and links to verify things yourself.
 */

const CATEGORY_ICON: Record<string, typeof Search> = {
  "getting-started": Compass,
  "spins-and-rewards": Sparkles,
  "wallets-and-claims": Wallet,
  "reward-pools": Layers,
  "robinhood-chain": Globe,
  rob: Coins,
  "more-robacha": Boxes,
  "risk-and-transparency": ShieldAlert,
};

function slugify(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface FaqItem {
  question: string;
  answer: string;
  category: string;
  categoryId: string;
  slug: string;
}

const ALL_ITEMS: FaqItem[] = FAQ_GROUPS.flatMap((g) =>
  g.items.map((it) => ({ ...it, category: g.title, categoryId: g.id, slug: slugify(it.question) })),
);

// Six shortcuts to high-value answers. Labelled "Quick answers" — there's no
// real popularity data, so we don't claim any.
const QUICK = [
  "How does a spin work?",
  "Can I see the odds?",
  "How do I get my reward?",
  "What if the machine runs out of a prize?",
  "Where does randomness come from?",
  "What is $ROB?",
].map(slugify);

export function FaqClient() {
  const [query, setQuery] = useState("");
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());
  const [activeCat, setActiveCat] = useState<string>(FAQ_GROUPS[0].id);
  const inputRef = useRef<HTMLInputElement>(null);

  const searching = query.trim().length > 0;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ITEMS.filter((it) => `${it.question} ${it.answer} ${it.category}`.toLowerCase().includes(q));
  }, [query]);

  const catItems = useMemo(() => ALL_ITEMS.filter((it) => it.categoryId === activeCat), [activeCat]);

  function open(slug: string, only = false) {
    setOpenSlugs((prev) => {
      const next = only ? new Set<string>() : new Set(prev);
      next.add(slug);
      return next;
    });
    if (typeof history !== "undefined") history.replaceState(null, "", `#${slug}`);
  }
  function toggle(slug: string) {
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  // Deep link: open the matching question on load and scroll to it. The state
  // updates are deferred into the timeout (after paint) so this isn't a
  // synchronous setState in the effect body.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!hash) return;
    const item = ALL_ITEMS.find((it) => it.slug === hash);
    if (!item) return;
    const t = window.setTimeout(() => {
      setActiveCat(item.categoryId);
      setOpenSlugs(new Set([hash]));
      document.getElementById(hash)?.scrollIntoView({ block: "center" });
    }, 100);
    return () => window.clearTimeout(t);
  }, []);

  // "/" focuses search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function jumpTo(slug: string) {
    const item = ALL_ITEMS.find((it) => it.slug === slug);
    if (!item) return;
    setQuery("");
    setActiveCat(item.categoryId);
    open(slug);
    window.setTimeout(() => document.getElementById(slug)?.scrollIntoView({ block: "center" }), 60);
  }

  return (
    <>
      {/* ---- Hero + search ---- */}
      <section className="relative overflow-hidden">
        <span className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,158,196,0.25),transparent_70%)]" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.2),transparent_70%)]" aria-hidden="true" />
        <PageContainer width="wide" className="relative pt-10">
          <p className="micro">Support</p>
          <h1 className="mt-2.5 max-w-[16ch] text-[clamp(2.1rem,4.2vw,3.1rem)] font-semibold leading-[1] tracking-[-0.035em]">
            Everything worth knowing before you spin.
          </h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
            Quick answers about spins, rewards, wallets, pools, claims and how Robacha works onchain.
          </p>

          <div className="mt-6 flex max-w-[620px] items-center gap-2.5 rounded-full border border-[rgb(var(--line-rgb)_/_0.12)] bg-surface/80 px-4 shadow-[0_10px_30px_-24px_rgb(var(--ink-rgb)_/_0.5)]">
            <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Robacha help…"
              className="h-13 w-full bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3"
              aria-label="Search the FAQ"
              autoComplete="off"
            />
            <kbd className="hidden shrink-0 rounded-md border border-[rgb(var(--line-rgb)_/_0.12)] px-1.5 py-0.5 text-[10px] font-medium text-ink-3 sm:block">/</kbd>
          </div>

          {/* Quick answers */}
          {!searching ? (
            <div className="mt-4">
              <p className="micro text-ink-3">Quick answers</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK.map((slug) => {
                  const item = ALL_ITEMS.find((it) => it.slug === slug);
                  if (!item) return null;
                  return (
                    <button key={slug} type="button" onClick={() => jumpTo(slug)} className="glass-chip inline-flex items-center rounded-full px-3.5 py-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink">
                      {item.question}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </PageContainer>
      </section>

      <PageContainer width="wide" className="pb-4">
        {searching ? (
          <SearchResults query={query} results={results} openSlugs={openSlugs} toggle={toggle} />
        ) : (
          <>
            <PersonalHelp />
            <StartHere />
            <MainFaq activeCat={activeCat} setActiveCat={setActiveCat} items={catItems} openSlugs={openSlugs} toggle={toggle} />
            <Troubleshooting />
            <VerifyCta />
            <StillStuck />
          </>
        )}
      </PageContainer>
    </>
  );
}

/* ------------------------------------------------------------ search --- */

function SearchResults({ query, results, openSlugs, toggle }: { query: string; results: FaqItem[]; openSlugs: Set<string>; toggle: (s: string) => void }) {
  return (
    <section className="mt-8">
      <p className="micro text-ink-3">Search results</p>
      <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">
        &ldquo;{query.trim()}&rdquo; · {results.length} {results.length === 1 ? "answer" : "answers"}
      </h2>
      {results.length === 0 ? (
        <div className="mt-5 glass-card rounded-[18px] p-8 text-center">
          <p className="text-[14px] font-medium">Couldn&rsquo;t find that.</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Try: refund · claim · round · odds · wallet · $ROB</p>
          <Link href="/docs" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline">Read the docs <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-[rgb(var(--line-rgb)_/_0.08)] overflow-hidden rounded-[18px] glass-card">
          {results.map((it) => <Row key={it.slug} item={it} open={openSlugs.has(it.slug)} onToggle={() => toggle(it.slug)} showCategory />)}
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------- wallet-aware help --- */

function PersonalHelp() {
  const wallet = useWallet();
  const mounted = useMounted();
  const { history } = useWalletHistory();

  if (!mounted || !wallet.isConnected || !history) return null;
  if (history.unclaimedCount === 0) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[rgba(142,197,0,0.3)] bg-[rgba(142,197,0,0.06)] px-5 py-4">
      <p className="text-[13.5px] font-medium">
        You have <span className="num font-semibold">{history.unclaimedCount}</span> unclaimed {history.unclaimedCount === 1 ? "reward" : "rewards"}.
      </p>
      <Link href="/bag" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-ink hover:underline">Open My Bag <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </div>
  );
}

/* ------------------------------------------------------------ start here --- */

function StartHere() {
  const cards = [
    { n: "01", title: "What is Robacha?", body: "A transparent onchain discovery machine.", href: "/how-it-works", cta: "Learn how it works" },
    { n: "02", title: "How do I spin?", body: "Choose spins, enter a round and receive a published reward.", href: "/how-it-works#steps", cta: "Spin walkthrough" },
    { n: "03", title: "Where do rewards go?", body: "Settled rewards appear in My Bag and can be claimed.", href: "/bag", cta: "Open My Bag" },
  ];
  return (
    <section className="mt-10">
      <p className="micro text-ink-3">New to Robacha?</p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">Start here.</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.n} className="glass-card flex flex-col rounded-[18px] p-5">
            <span className="num text-[11px] text-ink-3">{c.n}</span>
            <h3 className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em]">{c.title}</h3>
            <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-2">{c.body}</p>
            <Link href={c.href} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:underline">{c.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- main FAQ --- */

function MainFaq({ activeCat, setActiveCat, items, openSlugs, toggle }: { activeCat: string; setActiveCat: (id: string) => void; items: FaqItem[]; openSlugs: Set<string>; toggle: (s: string) => void }) {
  const group = FAQ_GROUPS.find((g) => g.id === activeCat);
  return (
    <section className="mt-12 grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
      {/* category nav */}
      <nav aria-label="FAQ categories" className="lg:sticky lg:top-[84px]">
        <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {FAQ_GROUPS.map((g) => {
            const Icon = CATEGORY_ICON[g.id] ?? Compass;
            const active = g.id === activeCat;
            return (
              <li key={g.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveCat(g.id)}
                  className={cn(
                    "inline-flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-medium transition-colors",
                    active ? "bg-ink text-surface" : "text-ink-2 hover:bg-[rgb(var(--ink-rgb)_/_0.05)] hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {g.title}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* questions */}
      <div>
        {group ? <p className="mb-3 text-[13px] text-ink-3">{group.description}</p> : null}
        <div className="divide-y divide-[rgb(var(--line-rgb)_/_0.08)] overflow-hidden rounded-[18px] glass-card">
          {items.map((it) => <Row key={it.slug} item={it} open={openSlugs.has(it.slug)} onToggle={() => toggle(it.slug)} />)}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ row --- */

function Row({ item, open, onToggle, showCategory }: { item: FaqItem; open: boolean; onToggle: () => void; showCategory?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copyLink() {
    try {
      const url = `${window.location.origin}/faq#${item.slug}`;
      void navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }
  return (
    <div id={item.slug} className="scroll-mt-28">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span>
          {showCategory ? <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{item.category}</span> : null}
          <span className="text-[14px] font-medium tracking-[-0.01em]">{item.question}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div className="px-5 pb-4">
          <p className="text-[13px] leading-relaxed text-ink-2">{item.answer}</p>
          <button type="button" onClick={copyLink} className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 hover:text-ink-2">
            <Link2 className="h-3 w-3" aria-hidden="true" /> {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------- troubleshooting --- */

function Troubleshooting() {
  const cards = [
    { title: "Round still open", body: "Your spin waits for the round to fill or settle.", href: "/activity", cta: "Check activity" },
    { title: "Reward not showing", body: "Check settlement and My Bag.", href: "/bag", cta: "Open My Bag" },
    { title: "Claim failed", body: "Review your wallet and network state, then retry.", href: "/bag", cta: "Go to My Bag" },
    { title: "Refund expected", body: "Check whether the round is actually refundable.", href: "/bag", cta: "Check My Bag" },
    { title: "Transaction stuck", body: "Inspect it on Robinhood Chain.", href: "/activity", cta: "View activity" },
  ];
  return (
    <section className="mt-14">
      <p className="micro text-ink-3">Troubleshooting</p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">Something look wrong?</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="glass-card group flex flex-col rounded-[16px] p-5 transition-transform hover:-translate-y-0.5">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{c.title}</h3>
            <p className="mt-1 flex-1 text-[12px] leading-relaxed text-ink-2">{c.body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink">{c.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- verify cta - */

function VerifyCta() {
  const links = [
    { label: "Verify a round", href: "/verify" },
    { label: "View pools", href: "/pools" },
    { label: "View contracts", href: "/docs" },
    { label: "Transparency", href: "/transparency" },
  ];
  return (
    <section className="mt-14">
      <div className="glass-panel glass-reflection relative overflow-hidden rounded-[24px] p-6 sm:p-8">
        <span className="noise-overlay" aria-hidden="true" />
        <div className="relative">
          <h2 className="text-[22px] font-semibold tracking-[-0.025em]">Don&rsquo;t take our word for it. <span className="text-gradient-accent">Verify the system.</span></h2>
          <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-ink-2">Pools, odds, rounds, contracts and settled results can be inspected independently.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {links.map((l, i) => (
              <Link key={l.href} href={l.href} className={cn("inline-flex h-10 items-center rounded-full px-5 text-[13px] font-semibold transition-transform hover:-translate-y-0.5", i === 0 ? "bg-ink text-surface" : "glass-chip text-ink")}>{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- still stuck --- */

function StillStuck() {
  const actions = [
    { title: "Check your round", body: "See live entries and settlement.", href: "/activity" },
    { title: "Read the docs", body: "Contracts, addresses and mechanics.", href: "/docs" },
    { title: "Open the app", body: "Jump back to the machine.", href: "/app" },
  ];
  return (
    <section className="mt-14 mb-16">
      <p className="micro text-ink-3">Still stuck?</p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">A few more ways to get unstuck.</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.title} href={a.href} className="glass-card group flex flex-col rounded-[18px] p-5 transition-transform hover:-translate-y-0.5">
            <h3 className="text-[14.5px] font-semibold tracking-[-0.02em]">{a.title}</h3>
            <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-2">{a.body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink">Go <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
