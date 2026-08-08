"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  BellRing,
  Check,
  Eye,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Share2,
} from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { SpinTabs } from "@/components/gacha/SpinTabs";
import { useWatchlist } from "@/lib/use-watchlist";
import { useLiveRound } from "@/lib/use-live-round";
import { usePool } from "@/lib/use-pool";
import { useStockTokens } from "@/lib/use-stock-tokens";
import type { StockToken } from "@/app/api/stock-tokens/route";
import { cn } from "@/lib/utils";

/**
 * The Stock Machine — a PREMIUM COMING-SOON teaser, not a product.
 *
 * Everything is deliberately non-functional: no spin, no wallet charge, no
 * entry, no settlement, no claim, and no fabricated assets, odds, inventory,
 * prices, dates or partners. The machine is drawn locked; every figure a real
 * machine would show reads "Not published" until a contract makes it real.
 * Reward slots are unrevealed silhouettes — no company names or logos, because
 * none are confirmed. The one live number on the page (the Genesis asset count)
 * is read from chain, and degrades to honest copy when unavailable.
 *
 * Its own palette — pink DNA + pale blue + mint + lime + soft silver — sets it
 * apart from the live token machine without looking like a broker terminal: no
 * charts, no candlesticks, no dark trading UI. The job here is anticipation, not
 * documentation.
 */

const MACHINE_KEY = "machine:tokenized-stocks";
const SHARE_URL = "https://www.robacha.fun/machines/tokenized-stocks";
const SHARE_TEXT = "Robacha is building a Tokenized Stock Machine.";

const DISCLAIMER =
  "The Stock Machine is not live. Supported assets, contracts, pool composition, pricing and probabilities will be published before launch. Robacha does not provide investment advice.";

// The public launch milestones. All start pending; each flips to complete only
// when it's genuinely true onchain. The readiness bar is derived from this — it
// is never a hand-set percentage.
const LAUNCH_SEQUENCE = [
  { n: "01", label: "Reward assets confirmed", done: false },
  { n: "02", label: "Inventory funded", done: false },
  { n: "03", label: "Pool contracts deployed", done: false },
  { n: "04", label: "Odds published", done: false },
  { n: "05", label: "Verification enabled", done: false },
  { n: "06", label: "Machine opened", done: false },
] as const;

export function StockMachinePreview() {
  // Real, recognisable assets to float inside the machine artwork — drawn from
  // the live Robinhood Chain catalogue, notable names first. Illustrative of the
  // ecosystem, never a confirmed pool: the machine stays visibly locked.
  const { tokens } = useStockTokens();
  const sample = orderTokens(tokens).slice(0, 6);

  return (
    <div className="stockmachine relative">
      <style>{THEME}</style>

      <PageContainer width="wide" className="pb-16 pt-6">
        <nav className="mb-3 text-[12px] text-[color:var(--sm-ink-3)]" aria-label="Breadcrumb">
          <Link href="/machines" className="hover:text-[color:var(--sm-ink)]">
            Machines
          </Link>
          <span className="mx-1.5" aria-hidden="true">/</span>
          <span className="text-[color:var(--sm-ink-2)]">Stock Machine</span>
        </nav>

        <div className="mb-5">
          <SpinTabs />
        </div>

        <Hero sample={sample} />
        <MachineStage sample={sample} />
        <StockUniverse />
        <FollowReveals />
        <SectionBreak />
        <BeyondMemecoins />
        <HowItWillWork />
        <LaunchSequence />
        <GenesisCta />
        <Disclaimer />
      </PageContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ hero --- */

function Hero({ sample }: { sample: StockToken[] }) {
  return (
    <section className="sm-hero relative overflow-hidden rounded-[28px] px-6 py-9 sm:px-9 sm:py-11">
      <div className="sm-hero-grid" aria-hidden="true" />
      <div className="sm-hero-glow" aria-hidden="true" />

      <div className="relative grid items-center gap-10 lg:grid-cols-[55fr_45fr]">
        {/* left — copy */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="pink">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Next machine
            </Badge>
            <Badge tone="lime" pulse>
              Coming soon
            </Badge>
            <Badge tone="blue">Robinhood Chain</Badge>
          </div>

          <h1 className="mt-5 text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-[color:var(--sm-ink)]">
            Tokenized Stocks
            <br />
            <span className="sm-headline-accent">enter the machine.</span>
          </h1>

          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[color:var(--sm-ink-2)]">
            A new Robacha machine built for discovering tokenized-stock rewards on
            Robinhood Chain — the same transparent spin, a whole new shelf to pull
            from.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href="#follow"
              className="sm-btn-primary inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14px] font-semibold"
            >
              <BellRing className="h-4 w-4" aria-hidden="true" /> Get the drop first
            </a>
            <ButtonLink href="/app" variant="secondary" size="lg">
              Spin Genesis <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <p className="mt-4 text-[12px] text-[color:var(--sm-ink-3)]">
            Assets, pool contracts and odds will be published before launch.
          </p>
        </div>

        {/* right — the machine */}
        <div className="relative">
          <StockMachineArt sample={sample} />
        </div>
      </div>
    </section>
  );
}

/**
 * The oversized Stock Machine — recognizably Robacha (capsule cabinet, pink
 * shell, lime dispenser, glass chamber) but in the stock palette, holding
 * floating tokenized-stock reward cards instead of a capsule. Locked, with a
 * COMING SOON marquee. Ambient float/glow honour reduced-motion.
 */
function StockMachineArt({ sample }: { sample: StockToken[] }) {
  return (
    <div className="sm-machine mx-auto w-full max-w-[380px]">
      <div className="sm-machine-body">
        {/* header lamp */}
        <div className="sm-machine-head">
          <span className="sm-machine-lamp" />
          <span className="sm-machine-brand">ROBACHA</span>
          <span className="sm-machine-lamp" />
        </div>

        {/* glass chamber with floating stock cards */}
        <div className="sm-chamber">
          <span className="sm-chamber-sheen" aria-hidden="true" />
          <div className="sm-float sm-float-a">
            <StockRewardCard n="03" faint token={sample[2]} />
          </div>
          <div className="sm-float sm-float-b">
            <StockRewardCard n="02" faint token={sample[1]} />
          </div>
          <div className="sm-float sm-float-c">
            <StockRewardCard n="01" token={sample[0]} />
          </div>

          {/* locked overlay */}
          <div className="sm-chamber-lock">
            <span className="sm-lock inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold">
              <Lock className="h-3 w-3" /> Coming soon
            </span>
          </div>
        </div>

        {/* dispenser + lime button */}
        <div className="sm-machine-base">
          <span className="sm-tray" />
          <span className="sm-button" />
        </div>
      </div>
      <span className="sm-machine-shadow" />
    </div>
  );
}

/**
 * A premium tokenized-stock reward card. When handed a real asset it shows that
 * company's logo and ticker (drawn from the live chain catalogue, illustrative);
 * otherwise it falls back to a numbered silhouette. The machine around it stays
 * locked, so a recognisable logo reads as "assets like these", not a confirmed
 * reward.
 */
function StockRewardCard({
  n,
  faint = false,
  size = "md",
  token,
}: {
  n: string;
  faint?: boolean;
  size?: "sm" | "md";
  token?: StockToken;
}) {
  return (
    <div className={cn("sm-card", faint && "sm-card-faint", size === "sm" && "sm-card-sm")}>
      <div className="sm-card-top">
        {token ? (
          <TokenLogo token={token} className="h-[22px] w-[22px]" />
        ) : (
          <span className="sm-card-chip" />
        )}
        <span className="sm-card-lime" />
      </div>
      <span className="sm-card-kicker">Tokenized stock</span>
      <span className="sm-card-num">{token ? token.symbol : n}</span>
      <span className="sm-card-line" />
    </div>
  );
}

/* ---------------------------------------------------- machine + preview --- */

function MachineStage({ sample }: { sample: StockToken[] }) {
  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      {/* locked reward stage — cards in perspective */}
      <div className="sm-panel relative overflow-hidden rounded-[24px] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="sm-eyebrow">The machine</p>
            <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[color:var(--sm-ink)]">
              Inside the Stock Machine
            </h2>
          </div>
          <span className="sm-lock inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold">
            <Lock className="h-3 w-3" /> Locked
          </span>
        </div>

        <div className="sm-stage mt-5">
          <div className="sm-stage-cards">
            <div className="sm-stage-card sm-stage-back-l">
              <StockRewardCard n="04" faint size="sm" token={sample[3]} />
            </div>
            <div className="sm-stage-card sm-stage-back-r">
              <StockRewardCard n="05" faint size="sm" token={sample[4]} />
            </div>
            <div className="sm-stage-card sm-stage-mid-l">
              <StockRewardCard n="03" faint token={sample[1]} />
            </div>
            <div className="sm-stage-card sm-stage-mid-r">
              <StockRewardCard n="02" faint token={sample[2]} />
            </div>
            <div className="sm-stage-card sm-stage-front">
              <div className="sm-hero-card">
                <span className="sm-card-kicker">Tokenized stock</span>
                <span className="sm-hero-card-soon">Coming soon</span>
                <span className="sm-hero-card-lock">
                  <Lock className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          <p className="sm-stage-caption">
            The pool opens only after assets, inventory and odds are published.
          </p>
        </div>
      </div>

      {/* disabled future spin panel — mirrors Token Spins, sealed */}
      <div className="sm-panel flex flex-col rounded-[24px] p-6">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[color:var(--sm-ink)]">
            Stock Machine
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--sm-lime-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[color:var(--sm-lime-ink)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8ec500]" /> Coming soon
          </span>
        </div>

        <dl className="mt-4 space-y-0.5">
          <PanelRow label="Reward pool" value="Not published" muted />
          <PanelRow label="Spin price" value="Not published" muted />
          <PanelRow label="Payment assets" value="Not published" muted />
          <PanelRow label="Odds" value="Published before launch" />
        </dl>

        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-5 inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#dde6f2] text-[13.5px] font-semibold text-[color:var(--sm-ink-3)]"
        >
          <Lock className="h-4 w-4" /> Machine locked
        </button>

        {/* condensed status meta (§18) — the non-overlapping fields only */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[color:var(--sm-line)] pt-4">
          <Meta label="Status" value="Building" tone="build" />
          <Meta label="Network" value="Robinhood Chain" />
          <Meta label="Reward type" value="Tokenized stocks" />
          <Meta label="Follow" value="Enabled" tone="lime" />
        </div>
      </div>
    </section>
  );
}

function PanelRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] px-3 py-2.5 odd:bg-[color:var(--sm-inset)]">
      <dt className="text-[12.5px] text-[color:var(--sm-ink-3)]">{label}</dt>
      <dd className={cn("text-[12.5px] font-semibold", muted ? "text-[color:var(--sm-ink-3)]" : "text-[color:var(--sm-ink)]")}>
        {value}
      </dd>
    </div>
  );
}

function Meta({ label, value, tone }: { label: string; value: string; tone?: "build" | "lime" }) {
  return (
    <div className="rounded-[12px] bg-[color:var(--sm-inset)] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--sm-ink-3)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-[12px] font-semibold",
          tone === "build" && "text-[color:var(--sm-lime-ink)]",
          tone === "lime" && "text-[color:var(--sm-lime-ink)]",
          !tone && "text-[color:var(--sm-ink)]",
        )}
      >
        {tone === "build" ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8ec500]" /> {value}
          </span>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------ the real chain universe - */

// Well-known tickers surfaced first so the rail opens on names people recognise.
// Pure display ordering over real data — nothing is added or invented.
const NOTABLE = [
  "NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "COIN", "PLTR",
  "AMD", "NFLX", "AVGO", "MU", "MSTR", "CRCL", "RDDT", "INTC", "BA", "SPY", "QQQ",
];

function orderTokens(tokens: StockToken[]): StockToken[] {
  const rank = new Map(NOTABLE.map((s, i) => [s, i]));
  return [...tokens].sort((a, b) => {
    const ra = rank.get(a.symbol) ?? 999;
    const rb = rank.get(b.symbol) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.symbol.localeCompare(b.symbol);
  });
}

/**
 * The genuine catalogue of tokenized stocks already live on Robinhood Chain.
 * Real logos, tickers and names — but explicitly NOT the Robacha pool. The copy
 * makes the line clear: this is the universe the machine could draw from, not a
 * confirmed lineup. Degrades to honest copy when the upstream is unavailable.
 */
function StockUniverse() {
  const { tokens, total, isLoading, isError } = useStockTokens();
  const ordered = orderTokens(tokens);
  const rail = ordered.slice(0, 28);
  const grid = ordered.slice(0, 18);

  return (
    <section className="mt-12">
      <SectionHead
        eyebrow="Already on Robinhood Chain"
        title="The universe it could draw from."
        blurb={
          total > 0
            ? `${total} tokenized stocks already trade on Robinhood Chain — from NVIDIA to Coinbase. The Stock Machine could draw from assets like these. Which ones actually enter the Robacha pool isn't decided; pool composition and odds are published before launch.`
            : "Tokenized stocks already trade on Robinhood Chain — real, onchain equities. The Stock Machine could draw from assets like these. Which ones actually enter the Robacha pool isn't decided; pool composition and odds are published before launch."
        }
      />

      {isLoading ? (
        <div className="sm-panel mt-5 grid h-24 place-items-center rounded-[18px] text-[12.5px] text-[color:var(--sm-ink-3)]">
          Loading the Robinhood Chain catalogue…
        </div>
      ) : isError || tokens.length === 0 ? (
        <div className="sm-panel mt-5 rounded-[18px] p-5 text-[12.5px] text-[color:var(--sm-ink-3)]">
          The live Robinhood Chain catalogue is temporarily unavailable. It lists
          real tokenized stocks trading onchain — check back shortly.
        </div>
      ) : (
        <>
          {/* moving logo rail — hype, from real assets */}
          <div
            className="marquee-host sm-rail mt-5 overflow-hidden rounded-[18px] py-4"
            style={{ "--marquee-duration": "48s" } as React.CSSProperties}
          >
            <div className="marquee-track flex w-max items-center gap-2.5 pr-2.5">
              {[...rail, ...rail].map((t, i) => (
                <TokenChip key={`${t.address}-${i}`} token={t} />
              ))}
            </div>
          </div>

          {/* a readable grid of notable assets */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {grid.map((t) => (
              <div key={t.address} className="sm-uni-card">
                <TokenLogo token={t} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-[color:var(--sm-ink)]">{t.symbol}</p>
                  <p className="truncate text-[10.5px] text-[color:var(--sm-ink-3)]">{t.name}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-[color:var(--sm-ink-3)]">
            Live from the{" "}
            <a
              href="https://docs.robinhood.com/chain/stock-token-apis"
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-dotted underline-offset-2 hover:text-[color:var(--sm-ink-2)]"
            >
              Robinhood Chain asset API
            </a>
            . Shown to illustrate the ecosystem — not a Robacha reward pool or an endorsement.
          </p>
        </>
      )}
    </section>
  );
}

function TokenChip({ token }: { token: StockToken }) {
  return (
    <span className="sm-chip inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5">
      <TokenLogo token={token} className="h-7 w-7" />
      <span className="text-[12.5px] font-semibold text-[color:var(--sm-ink)]">{token.symbol}</span>
    </span>
  );
}

/**
 * Real Robinhood-CDN logo in a plain <img> (not next/image — the optimizer's
 * remote allowlist is scoped to DexScreener). Falls back to the ticker initial
 * on error so a missing logo never leaves an empty box.
 */
function TokenLogo({ token, className }: { token: StockToken; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (token.logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={token.logoUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full border border-[color:var(--sm-line)] bg-white object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-[color:var(--sm-line)] bg-[color:var(--sm-inset)] text-[10px] font-bold text-[color:var(--sm-ink-2)]",
        className,
      )}
    >
      {token.symbol.slice(0, 2)}
    </span>
  );
}

/* ----------------------------------------------- asset reveals + follow --- */

function FollowReveals() {
  return (
    <section className="mt-12">
      <SectionHead
        eyebrow="The Robacha pool"
        title="Revealed one asset at a time."
        blurb="Plenty of tokenized stocks exist on-chain — but which ones Robacha loads into this machine stays sealed. When a slot is genuinely confirmed and funded, its card flips to a real logo, name and status, so each announcement lands as a reveal, never a rumour."
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["01", "02", "03", "04"].map((n, i) => (
          <RevealCard key={n} n={n} obscured={i >= 2} />
        ))}
      </div>

      <FollowCard />
    </section>
  );
}

function RevealCard({ n, obscured }: { n: string; obscured?: boolean }) {
  return (
    <div className={cn("sm-reveal", obscured && "sm-reveal-obscured")}>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[color:var(--sm-ink-3)]">
          Asset #{n}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--sm-ink-3)]">
          <Lock className="h-2.5 w-2.5" /> Locked
        </span>
      </div>

      <div className="sm-reveal-glyph">
        <span>?</span>
      </div>

      <p className="text-center text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--sm-ink-3)]">
        Unrevealed
      </p>
      <p className="text-center text-[10.5px] text-[color:var(--sm-ink-3)]">Tokenized stock</p>
    </div>
  );
}

function FollowCard() {
  const watch = useWatchlist();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => setMounted(true), []);

  const following = mounted && watch.canFollow && watch.isFollowing(MACHINE_KEY);

  async function share() {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: "Robacha Stock Machine", text: SHARE_TEXT, url: SHARE_URL });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await nav?.clipboard?.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <div id="follow" className="sm-follow relative mt-6 overflow-hidden rounded-[24px] px-6 py-7 sm:px-8">
      <div className="sm-hero-glow" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[46ch]">
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[color:var(--sm-ink)]">
            Follow the reveals
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--sm-ink-2)]">
            Save the machine and be first when assets, pool inventory and launch
            details are published. Kept on this device for your wallet — no email,
            no signup.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-[240px]">
          {!mounted ? (
            <div className="h-12 rounded-full bg-white/50" />
          ) : !watch.canFollow ? (
            <div className="rounded-[14px] border border-[color:var(--sm-line)] bg-white/60 px-4 py-3 text-center text-[12px] text-[color:var(--sm-ink-3)]">
              Connect your wallet to follow
            </div>
          ) : (
            <button
              type="button"
              onClick={() => watch.toggle(MACHINE_KEY)}
              className={cn(
                "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors",
                following
                  ? "border border-[color:var(--sm-line-strong)] bg-white/70 text-[color:var(--sm-ink)]"
                  : "sm-btn-primary",
              )}
            >
              {following ? (
                <>
                  <BellRing className="h-4 w-4" /> Following <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" /> Follow the machine
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={share}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[color:var(--sm-line-strong)] bg-white/50 text-[13px] font-semibold text-[color:var(--sm-ink-2)] transition-colors hover:bg-white/80"
          >
            <Share2 className="h-4 w-4" /> {copied ? "Copied" : "Share preview"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- editorial --- */

function SectionBreak() {
  return (
    <section className="mt-16 text-center">
      <p className="sm-eyebrow">Next on Robacha</p>
      <h2 className="mx-auto mt-2 max-w-[16ch] text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1] tracking-[-0.035em] text-[color:var(--sm-ink)]">
        Beyond memecoins.
      </h2>
      <p className="mx-auto mt-3 max-w-[44ch] text-[13.5px] leading-relaxed text-[color:var(--sm-ink-2)]">
        The Genesis Machine started with tokens. The next machine expands the
        format — same transparent spin, a new kind of reward.
      </p>
    </section>
  );
}

function BeyondMemecoins() {
  const cards = [
    {
      icon: TrendingUp,
      title: "Discover",
      body: "Tokenized-stock rewards join the Robacha discovery model.",
    },
    {
      icon: Eye,
      title: "Published",
      body: "Pool assets and probabilities are visible before you spin.",
    },
    {
      icon: ShieldCheck,
      title: "Verifiable",
      body: "Results settle through Robacha's transparent round architecture.",
    },
  ];
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.title} className="sm-panel rounded-[18px] p-5">
            <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[color:var(--sm-lime-soft)] text-[color:var(--sm-lime-ink)]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--sm-ink)]">
              {c.title}
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--sm-ink-2)]">{c.body}</p>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------- how it works --- */

function HowItWillWork() {
  const steps = [
    { n: "01", title: "Fund", body: "Rewards enter the pool." },
    { n: "02", title: "Publish", body: "Assets and odds go public." },
    { n: "03", title: "Spin", body: "The machine opens." },
    { n: "04", title: "Settle", body: "Rewards reach the wallet." },
  ];
  return (
    <section className="mt-14">
      <SectionHead eyebrow="How it will work" title="Four steps, in order." blurb="Written in the future tense on purpose — none of it is running yet." />
      <ol className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {steps.map((s, i) => (
          <li key={s.n} className="flex flex-1 items-center gap-3">
            <div className="sm-panel flex-1 rounded-[18px] p-5">
              <span className="text-[20px] font-semibold tracking-[-0.03em] text-[color:var(--sm-line-strong)]">
                {s.n}
              </span>
              <h3 className="mt-1 text-[14.5px] font-semibold tracking-[-0.02em] text-[color:var(--sm-ink)]">
                {s.title}
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--sm-ink-2)]">{s.body}</p>
            </div>
            {i < steps.length - 1 ? (
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-[color:var(--sm-ink-3)] lg:block" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------- launch sequence -- */

function LaunchSequence() {
  const total = LAUNCH_SEQUENCE.length;
  const done = LAUNCH_SEQUENCE.filter((s) => s.done).length;
  const pct = Math.round((done / total) * 100);

  return (
    <section className="mt-14">
      <SectionHead
        eyebrow="Launch sequence"
        title="Machine readiness"
        blurb="Each milestone flips only when it's real onchain — never before. This bar is derived straight from the states below."
      />

      <div className="sm-panel mt-6 rounded-[22px] p-6">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[color:var(--sm-ink)]">
            {done} / {total} complete
          </p>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--sm-ink-3)]">
            {pct}% ready
          </span>
        </div>
        <div className="sm-progress mt-3" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
          <span className="sm-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <ol className="mt-5 grid gap-1.5 sm:grid-cols-2">
          {LAUNCH_SEQUENCE.map((s) => (
            <li
              key={s.n}
              className="flex items-center gap-3 rounded-[12px] bg-[color:var(--sm-inset)] px-3.5 py-3"
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  s.done
                    ? "bg-[color:var(--sm-lime-soft)] text-[color:var(--sm-lime-ink)]"
                    : "bg-white text-[color:var(--sm-ink-3)] ring-1 ring-[color:var(--sm-line-strong)]",
                )}
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <span className="flex-1 text-[13px] text-[color:var(--sm-ink-2)]">{s.label}</span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.06em]",
                  s.done ? "text-[color:var(--sm-lime-ink)]" : "text-[color:var(--sm-ink-3)]",
                )}
              >
                {s.done ? "Complete" : "Pending"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- genesis cta - */

function GenesisCta() {
  const { pool } = usePool();
  const round = useLiveRound();
  const assets = pool ? new Set(pool.entries.map((e) => e.token.toLowerCase())).size : null;
  const roundLabel =
    round.status === "open" ? "Live rounds" : round.status === "closing" ? "Round closing" : "Live rounds";

  return (
    <section className="mt-14">
      <div className="sm-cta relative overflow-hidden rounded-[26px] p-7 sm:p-9">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[54ch]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#3f7d17]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8ec500]" /> Live now
            </span>
            <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.025em] text-[color:var(--sm-ink)] sm:text-[28px]">
              Genesis Machine
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--sm-ink-2)]">
              While the Stock Machine loads, the machine it&rsquo;s built on is
              already spinning — live, transparent, and paying out real onchain
              pulls.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Stat value={assets != null ? `${assets}` : "—"} label={assets != null ? "reward assets" : "reward assets · loading"} />
              <Stat value="Published" label="odds" />
              <Stat value={roundLabel} label="onchain" />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:min-w-[220px]">
            <ButtonLink href="/app" variant="primary" size="lg">
              Spin Genesis <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/pools/genesis" variant="secondary" size="md">
              View pool
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[12px] bg-white/60 px-3.5 py-2.5">
      <p className="num text-[15px] font-semibold text-[color:var(--sm-ink)]">{value}</p>
      <p className="text-[10.5px] uppercase tracking-[0.06em] text-[color:var(--sm-ink-3)]">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------- disclaimer -- */

function Disclaimer() {
  return (
    <p className="mt-8 rounded-[14px] border border-[color:var(--sm-line)] bg-[color:var(--sm-inset)] px-4 py-3 text-[11.5px] leading-relaxed text-[color:var(--sm-ink-3)]">
      {DISCLAIMER}
    </p>
  );
}

/* --------------------------------------------------------------- helpers --- */

function SectionHead({ eyebrow, title, blurb }: { eyebrow: string; title: string; blurb: string }) {
  return (
    <div className="max-w-[60ch]">
      <p className="sm-eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.03em] text-[color:var(--sm-ink)]">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--sm-ink-2)]">{blurb}</p>
    </div>
  );
}

function Badge({
  tone,
  pulse,
  children,
}: {
  tone: "lime" | "blue" | "pink";
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em]",
        tone === "lime" && "bg-[color:var(--sm-lime-soft)] text-[color:var(--sm-lime-ink)]",
        tone === "blue" && "bg-[#e6eefb] text-[color:var(--sm-blue-ink)]",
        tone === "pink" && "bg-[#fdeaf1] text-[#c0447a]",
      )}
    >
      {pulse ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8ec500]" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/**
 * Scoped "market" palette — pink DNA + pale blue + mint + lime + soft silver.
 * Local to this component so it never leaks into the app theme. All ambient
 * motion is gated behind prefers-reduced-motion.
 */
const THEME = `
.stockmachine {
  --sm-ink: #223452;
  --sm-ink-2: #4c5f7e;
  --sm-ink-3: #8493ac;
  --sm-blue-ink: #2f5aa8;
  --sm-line: rgba(43, 58, 85, 0.10);
  --sm-line-strong: rgba(43, 58, 85, 0.18);
  --sm-inset: #f2f6fc;
  --sm-lime-ink: #4f7a12;
  --sm-lime-soft: #eaf7cf;
  color: var(--sm-ink);
}
.stockmachine .sm-eyebrow {
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.11em;
  text-transform: uppercase; color: var(--sm-ink-3);
}
.stockmachine .sm-panel {
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fe 100%);
  border: 1px solid var(--sm-line);
  box-shadow: 0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 34px -26px rgba(43,58,85,0.4);
}
.stockmachine .sm-hero {
  background: linear-gradient(150deg, #f4f9ff 0%, #eef7f1 46%, #fdf0f5 100%);
  border: 1px solid var(--sm-line);
}
.stockmachine .sm-follow {
  background: linear-gradient(140deg, #eef7dd 0%, #e7f1fb 55%, #fbeaf2 100%);
  border: 1px solid var(--sm-line);
}
.stockmachine .sm-cta {
  background: linear-gradient(150deg, #eef7dd 0%, #e6f1fb 55%, #e3f4ec 100%);
  border: 1px solid var(--sm-line);
}
.stockmachine .sm-hero-glow {
  position: absolute; inset: -45% -12% auto auto; height: 360px; width: 360px;
  border-radius: 9999px; pointer-events: none;
  background: radial-gradient(circle, rgba(198,240,120,0.4) 0%, rgba(198,240,120,0) 70%);
}
.stockmachine .sm-hero-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image:
    linear-gradient(rgba(47,90,168,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(47,90,168,0.05) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at 72% 42%, #000 0%, transparent 62%);
}
.stockmachine .sm-headline-accent {
  background: linear-gradient(92deg, #2f5aa8 0%, #1f8f63 52%, #7aa80e 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.stockmachine .sm-btn-primary {
  background: linear-gradient(180deg, #c9f24d 0%, #b6e800 100%);
  color: #263c07; border: none;
  box-shadow: 0 10px 22px -8px rgba(150,200,0,0.72);
  transition: transform .15s ease, box-shadow .15s ease;
}
.stockmachine .sm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 14px 28px -8px rgba(150,200,0,0.85); }
.stockmachine .sm-lock {
  background: rgba(255,255,255,0.9); border: 1px solid var(--sm-line-strong);
  color: var(--sm-ink-2); box-shadow: 0 6px 16px -8px rgba(43,58,85,0.4);
}

/* ---- the machine cabinet ---- */
.stockmachine .sm-machine { position: relative; }
.stockmachine .sm-machine-body {
  position: relative; border-radius: 30px; padding: 14px;
  background: linear-gradient(176deg, #ffffff 0%, #eef3fb 60%, #fbeef4 100%);
  border: 1px solid rgba(43,58,85,0.12);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.95) inset,
    0 30px 60px -32px rgba(43,58,85,0.5);
}
.stockmachine .sm-machine-head {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 6px 0 12px;
}
.stockmachine .sm-machine-brand {
  font-size: 11px; font-weight: 800; letter-spacing: 0.22em; color: var(--sm-ink-3);
}
.stockmachine .sm-machine-lamp {
  height: 8px; width: 8px; border-radius: 9999px;
  background: radial-gradient(circle at 35% 30%, #eaffb0, #b6e800);
  box-shadow: 0 0 10px rgba(182,232,0,0.7);
}
.stockmachine .sm-chamber {
  position: relative; height: 250px; border-radius: 22px; overflow: hidden;
  background:
    linear-gradient(180deg, rgba(230,240,251,0.75) 0%, rgba(214,236,226,0.55) 100%);
  border: 1px solid rgba(255,255,255,0.7);
  box-shadow: inset 0 2px 14px rgba(47,90,168,0.12), inset 0 -10px 24px rgba(31,143,99,0.08);
}
.stockmachine .sm-chamber-sheen {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(120deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 42%);
}
.stockmachine .sm-chamber-lock {
  position: absolute; inset: 0; display: grid; place-items: center;
}
.stockmachine .sm-machine-base {
  position: relative; display: flex; align-items: center; justify-content: center;
  padding-top: 14px;
}
.stockmachine .sm-tray {
  position: absolute; left: 22px; right: 22px; top: 12px; height: 12px; border-radius: 8px;
  background: linear-gradient(180deg, #dfe7f2, #eef3fb);
  box-shadow: inset 0 2px 4px rgba(43,58,85,0.18);
}
.stockmachine .sm-button {
  position: relative; margin-top: 20px; height: 34px; width: 34px; border-radius: 9999px;
  background: radial-gradient(circle at 36% 30%, #d6f75f, #a9dc00);
  box-shadow: 0 6px 14px -4px rgba(150,200,0,0.7), 0 1px 0 rgba(255,255,255,0.6) inset;
}
.stockmachine .sm-machine-shadow {
  display: block; height: 22px; margin: 8px auto 0; width: 70%;
  border-radius: 9999px;
  background: radial-gradient(ellipse, rgba(43,58,85,0.22), transparent 70%);
  filter: blur(4px);
}

/* ---- reward cards ---- */
.stockmachine .sm-card {
  width: 132px; border-radius: 13px; padding: 12px;
  background: linear-gradient(160deg, #ffffff 0%, #eef4fc 100%);
  border: 1px solid rgba(43,58,85,0.12);
  box-shadow: 0 10px 24px -14px rgba(43,58,85,0.5), 0 1px 0 rgba(255,255,255,0.9) inset;
}
.stockmachine .sm-card-sm { width: 108px; padding: 10px; }
.stockmachine .sm-card-faint { opacity: 0.72; filter: blur(1px); }
.stockmachine .sm-card-top { display: flex; align-items: center; justify-content: space-between; }
.stockmachine .sm-card-chip { height: 22px; width: 22px; border-radius: 7px; background: linear-gradient(150deg,#e2ecfb,#cfe0f6); }
.stockmachine .sm-card-lime { height: 14px; width: 26px; border-radius: 9999px; background: var(--sm-lime-soft); }
.stockmachine .sm-card-kicker { display: block; margin-top: 12px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sm-ink-3); }
.stockmachine .sm-card-num { display: block; margin-top: 2px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--sm-ink); }
.stockmachine .sm-card-line { display: block; margin-top: 10px; height: 6px; width: 60%; border-radius: 9999px; background: #e4edfa; }

/* floating cards in the hero chamber */
.stockmachine .sm-float { position: absolute; }
.stockmachine .sm-float-a { top: 20px; left: 18px; z-index: 1; transform: rotate(-7deg); }
.stockmachine .sm-float-b { top: 34px; right: 14px; z-index: 2; transform: rotate(8deg); }
.stockmachine .sm-float-c { bottom: 26px; left: 50%; z-index: 3; margin-left: -66px; }

/* ---- the perspective stage ---- */
.stockmachine .sm-stage {
  position: relative; border-radius: 18px; padding: 26px 12px 16px;
  background:
    radial-gradient(ellipse at 50% 8%, rgba(198,240,120,0.18), transparent 60%),
    linear-gradient(180deg, rgba(230,240,251,0.6), rgba(214,236,226,0.4));
  border: 1px solid rgba(255,255,255,0.6);
  overflow: hidden;
}
.stockmachine .sm-stage-cards { position: relative; height: 210px; }
.stockmachine .sm-stage-card { position: absolute; left: 50%; top: 40px; }
.stockmachine .sm-stage-back-l { transform: translateX(-118px) scale(0.72) rotate(-10deg); opacity: 0.5; z-index: 1; }
.stockmachine .sm-stage-back-r { transform: translateX(20px) scale(0.72) rotate(10deg); opacity: 0.5; z-index: 1; }
.stockmachine .sm-stage-mid-l { transform: translateX(-140px) scale(0.86) rotate(-6deg); opacity: 0.75; z-index: 2; }
.stockmachine .sm-stage-mid-r { transform: translateX(30px) scale(0.86) rotate(6deg); opacity: 0.75; z-index: 2; }
.stockmachine .sm-stage-front { transform: translateX(-84px) translateY(6px); z-index: 3; }
.stockmachine .sm-hero-card {
  position: relative; width: 168px; height: 132px; border-radius: 16px; padding: 14px;
  background: linear-gradient(158deg, #ffffff 0%, #eaf1fb 100%);
  border: 1px solid rgba(43,58,85,0.14);
  box-shadow: 0 22px 44px -20px rgba(43,58,85,0.6), 0 1px 0 rgba(255,255,255,0.9) inset;
  display: flex; flex-direction: column;
}
.stockmachine .sm-hero-card-soon {
  margin-top: 6px; font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: var(--sm-ink);
}
.stockmachine .sm-hero-card-lock {
  position: absolute; right: 12px; bottom: 12px; display: grid; place-items: center;
  height: 30px; width: 30px; border-radius: 9999px; color: var(--sm-ink-2);
  background: rgba(255,255,255,0.85); border: 1px solid var(--sm-line-strong);
}
.stockmachine .sm-stage-caption {
  position: relative; margin-top: 4px; text-align: center;
  font-size: 11.5px; color: var(--sm-ink-3);
}

/* ---- reveal cards ---- */
.stockmachine .sm-reveal {
  border-radius: 16px; padding: 14px;
  background: linear-gradient(170deg, #ffffff 0%, #f3f7fd 100%);
  border: 1px solid var(--sm-line);
  box-shadow: 0 10px 26px -20px rgba(43,58,85,0.5);
}
.stockmachine .sm-reveal-obscured { filter: blur(0.6px); opacity: 0.86; }
.stockmachine .sm-reveal-glyph {
  margin: 14px auto 12px; height: 74px; width: 74px; border-radius: 20px;
  display: grid; place-items: center;
  background:
    radial-gradient(circle at 35% 28%, rgba(198,240,120,0.35), transparent 60%),
    linear-gradient(160deg, #eef4fc, #e2ecfb);
  border: 1px solid rgba(43,58,85,0.1);
  color: var(--sm-blue-ink); font-size: 30px; font-weight: 800;
}
.stockmachine .sm-reveal-glyph span { opacity: 0.55; }

/* ---- real chain universe ---- */
.stockmachine .sm-rail {
  background: linear-gradient(180deg, #ffffff 0%, #f4f8fe 100%);
  border: 1px solid var(--sm-line);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}
.stockmachine .sm-chip {
  background: #ffffff;
  border: 1px solid var(--sm-line);
  box-shadow: 0 6px 16px -12px rgba(43,58,85,0.5);
}
.stockmachine .sm-uni-card {
  display: flex; align-items: center; gap: 10px; min-width: 0;
  border-radius: 14px; padding: 10px 12px;
  background: linear-gradient(170deg, #ffffff 0%, #f4f8fe 100%);
  border: 1px solid var(--sm-line);
}

/* ---- progress ---- */
.stockmachine .sm-progress {
  height: 8px; border-radius: 9999px; overflow: hidden;
  background: var(--sm-inset);
}
.stockmachine .sm-progress-fill {
  display: block; height: 100%; border-radius: 9999px;
  background: linear-gradient(90deg, #b6e800, #7aa80e);
  min-width: 4px;
}

@media (prefers-reduced-motion: no-preference) {
  .stockmachine .sm-float-a { animation: sm-float 6.5s ease-in-out infinite; }
  .stockmachine .sm-float-b { animation: sm-float 7.5s ease-in-out infinite 0.4s; }
  .stockmachine .sm-float-c { animation: sm-float 5.8s ease-in-out infinite 0.2s; }
  .stockmachine .sm-machine-body { animation: sm-glow 7s ease-in-out infinite; }
}
@keyframes sm-float {
  0%, 100% { transform: translateY(0) var(--sm-rot, rotate(0deg)); }
  50% { transform: translateY(-9px) var(--sm-rot, rotate(0deg)); }
}
/* keep each floater's rotation while animating Y */
.stockmachine .sm-float-a { --sm-rot: rotate(-7deg); }
.stockmachine .sm-float-b { --sm-rot: rotate(8deg); }
.stockmachine .sm-float-c { --sm-rot: rotate(0deg); }
@keyframes sm-glow {
  0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.95) inset, 0 30px 60px -32px rgba(43,58,85,0.5); }
  50% { box-shadow: 0 1px 0 rgba(255,255,255,0.95) inset, 0 34px 70px -30px rgba(47,90,168,0.42); }
}
`;
