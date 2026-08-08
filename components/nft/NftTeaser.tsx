import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gem,
  Lock,
  Repeat,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import {
  NFT_FUNDING_SCENARIOS,
  NFT_MINT_PRICE_USD,
  NFT_PAYMENT_TOKENS,
  NFT_TIERS,
  NFT_TOTAL_SUPPLY,
  NFT_VAULT_SHARE,
  vaultAt,
} from "@/data/nft";
import { cn } from "@/lib/utils";
import { NETWORK_LABEL } from "@/lib/web3";
import { CapsuleGlyph } from "./CapsuleGlyph";
import { CapsulePreview } from "./CapsulePreview";
import { MintFaqAccordion } from "./MintFaqAccordion";
import { MintFollowCta } from "./MintFollowCta";
import { MintPrice } from "./MintPrice";

/**
 * The Robacha Capsules mint — rebuilt as a premium collectible drop.
 *
 * Honestly pre-launch: there is no contract, so nothing here is a live reading.
 * Every number is the collection's fixed plan from data/nft.ts — 500 supply,
 * the 350/125/22/3 tier split, the 85% vault share that already runs on chain —
 * shown as arithmetic rather than asserted, and the mint console is locked with
 * its reason on the control. No minted counter, no holder count, no rolling
 * countdown: those appear only when a contract exists to answer them.
 *
 * The journey, top to bottom: the drop → scarcity & tiers → what a capsule does
 * → the Grails → where the money goes → trust → FAQ → a real endcap.
 */

const MACHINE_ELIGIBLE = NFT_TIERS.filter((t) => t.spendable).reduce((s, t) => s + t.supply, 0);
const GRAILS = NFT_TIERS.find((t) => t.key === "grail")?.supply ?? 0;

// Concise, on-brand card taglines — summaries of the honest blurbs in data/nft.ts.
const TIER_TAGLINE: Record<string, string> = {
  common: "Most of the collection. Standard capsules to hold or trade.",
  rare: "A quarter of the run — scarcer, and the tier most likely to move.",
  legendary: "Twenty-two exist. Spend one for a pull from a deeper pool.",
  grail: "Three, ever. The deepest pool the machine can hold.",
};

const DO_CARDS = [
  {
    icon: Wallet,
    title: "Mint",
    body: "Mint straight from the page — same wallet, same chain, no account to make. It lands in your wallet.",
    take: "No account. No middleman.",
  },
  {
    icon: Repeat,
    title: "Trade",
    body: "An ordinary NFT the moment it's yours. Sell it, gift it, or sit on it — none of it routes through us.",
    take: "Yours to move, anytime.",
  },
  {
    icon: Sparkles,
    title: "Spend in the machine",
    body: "Feed an eligible capsule back in and it becomes a pull from a deeper pool than a standard spin reaches.",
    take: "Legendary & Grail only.",
  },
];

export function NftTeaser() {
  const x = SOCIAL_LINKS[0];

  return (
    <>
      {/* ===================== 1 · Hero / mint block ===================== */}
      <PageContainer width="wide" className="pb-2 pt-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          {/* the object — the hero */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_35%,rgba(255,182,214,0.35),transparent_70%)]" aria-hidden="true" />
            <CapsulePreview />
          </div>

          {/* the conversion module */}
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Minting soon
              </span>
              <span className="glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-ink-2">{NETWORK_LABEL}</span>
              <span className="num glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-ink-2">{NFT_TOTAL_SUPPLY} total</span>
            </div>

            <h1 className="mt-4 text-[clamp(2.4rem,5vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              Robacha Capsules.
            </h1>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
              Limited capsules built for the machine — mint one, hold it, trade
              it, or spend it. Three of the {NFT_TOTAL_SUPPLY} are Grails.
            </p>

            {/* ---- Mint console — the primary module ---- */}
            <div className="glass-panel glass-reflection relative mt-6 overflow-hidden rounded-[26px] p-6">
              <span className="noise-overlay" aria-hidden="true" />
              <div className="relative">
                <MintPrice />

                {/* Quantity — the eventual control, locked until live. */}
                <div className="mt-5 flex items-center gap-2 opacity-55" aria-hidden="true">
                  <div className="flex flex-1 items-center justify-between rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] p-1">
                    <span className="grid h-9 w-9 place-items-center rounded-full text-ink-3">−</span>
                    <span className="num text-[16px] font-semibold">1</span>
                    <span className="grid h-9 w-9 place-items-center rounded-full text-ink-3">+</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)] text-[15px] font-semibold text-ink-3"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" /> Minting soon
                </button>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ButtonLink href={x.href} external variant="primary" size="md">
                    <XIcon className="h-3.5 w-3.5" /> Get the drop first <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </ButtonLink>
                  <ButtonLink href="/app" variant="secondary" size="md">See the live machine</ButtonLink>
                </div>

                <div className="mt-4 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
                  <MintFollowCta />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-stat headline strip */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-[rgb(var(--line-rgb)_/_0.08)] rounded-[20px] glass-card">
          <Stat value={NFT_TOTAL_SUPPLY} label="Total capsules" />
          <Stat value={MACHINE_ELIGIBLE} label="Machine-eligible" />
          <Stat value={GRAILS} label="Grails" accent />
        </div>
      </PageContainer>

      {/* ===================== 2 · Scarcity + tiers ===================== */}
      <section className="relative pt-16">
        <PageContainer width="wide">
          <Header
            eyebrow="The collection"
            title="Four tiers. Three Grails."
            copy="500 capsules on the machine's own 70 / 25 / 5 ladder. The top 5% splits again — and only three land at the very top."
          />
          <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NFT_TIERS.map((tier, index) => {
              const share = (tier.supply / NFT_TOTAL_SUPPLY) * 100;
              const isGrail = tier.key === "grail";
              return (
                <Reveal
                  as="li"
                  key={tier.key}
                  delay={index * 80}
                  data-rarity={tier.key}
                  className={cn(
                    "rarity-glass glass-highlight group relative flex flex-col overflow-hidden rounded-[22px] p-5 transition-transform duration-300 hover:-translate-y-1.5",
                    isGrail && "ring-2 ring-[rgb(var(--rarity-glow)_/_0.5)]",
                  )}
                >
                  {/* soft tier glow */}
                  <span
                    className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-70 blur-2xl"
                    style={{ background: "rgb(var(--rarity-glow) / 0.35)" }}
                    aria-hidden="true"
                  />
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "var(--rarity-bg)", color: "var(--rarity-fg)", border: "1px solid var(--rarity-bd)" }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rarity-dot)" }} aria-hidden="true" />
                      {tier.name}
                    </span>
                    {tier.spendable ? (
                      <span className="num inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--rarity-fg)" }}>
                        <Sparkles className="h-3 w-3" aria-hidden="true" /> Spendable
                      </span>
                    ) : null}
                  </div>

                  <div className="relative mt-4 grid flex-1 place-items-center py-3">
                    <CapsuleGlyph
                      id={`tier-${tier.key}`}
                      className="h-20 w-20 drop-shadow-[0_10px_22px_rgb(var(--rarity-glow)_/_0.4)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:rotate-6"
                    />
                  </div>

                  <div className="relative">
                    <div className="flex items-baseline justify-between">
                      <p className="num text-[32px] font-semibold leading-none tracking-[-0.03em]">{tier.supply}</p>
                      <p className="num text-[11px] text-ink-3">{share < 1 ? share.toFixed(1) : share.toFixed(0)}%</p>
                    </div>
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-2">{TIER_TAGLINE[tier.key]}</p>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </PageContainer>
      </section>

      {/* ===================== 3 · What a capsule can do ===================== */}
      <section className="relative pt-16">
        <PageContainer width="wide">
          <Header
            eyebrow="Utility"
            title="What can a capsule do?"
            copy="Three things — and the third is the one the top tiers are built for."
          />
          <ol className="mt-7 grid gap-4 lg:grid-cols-3">
            {DO_CARDS.map((card, index) => {
              const Icon = card.icon;
              return (
                <li key={card.title} className="relative">
                  <div className="glass-card h-full rounded-[22px] p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[rgba(204,255,0,0.14)] text-accent-ink"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                      <span className="num text-[11px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">{card.title}</h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{card.body}</p>
                    <p className="mt-4 border-t border-[rgb(var(--line-rgb)_/_0.07)] pt-3 text-[11.5px] font-medium text-accent-ink">{card.take}</p>
                  </div>
                  {index < DO_CARDS.length - 1 ? (
                    <span aria-hidden="true" className="absolute -right-3 top-[52px] hidden text-ink-3 lg:block"><ArrowRight className="h-4 w-4" /></span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </PageContainer>
      </section>

      {/* ===================== 4 · Grails spotlight ===================== */}
      <section className="relative pt-16">
        <PageContainer width="wide">
          <div data-rarity="grail" className="glass-panel glass-reflection relative overflow-hidden rounded-[30px] p-6 sm:p-10">
            <span className="noise-overlay" aria-hidden="true" />
            {/* spotlight */}
            <span className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgb(var(--rarity-glow)_/_0.28),transparent_66%)]" aria-hidden="true" />

            <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="micro text-accent-ink">Only three exist</p>
                <h2 className="mt-2 text-[clamp(1.9rem,3.4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
                  Only 3 are Grails.
                </h2>
                <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-ink-2">
                  A Grail sits at the very top of the collection. Commit one to
                  the machine and it draws from the deepest pool there is — the
                  tier the whole drop is built around. Three exist, and there
                  will never be more.
                </p>
                <p className="mt-3 text-[11.5px] text-ink-3">
                  Which tokens are Grails is set by the contract, published before minting opens.
                </p>
              </div>

              {/* three grails, elevated */}
              <div className="flex items-end justify-center gap-6 sm:gap-10">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <CapsuleGlyph
                      id={`grail-spot-${i}`}
                      className={cn(
                        "h-20 w-20 drop-shadow-[0_14px_28px_rgb(var(--rarity-glow)_/_0.5)] sm:h-24 sm:w-24",
                        i === 0 && "capsule-drift-a",
                        i === 1 && "capsule-drift-b",
                        i === 2 && "capsule-drift-c",
                      )}
                    />
                    <span className="num inline-flex items-center gap-1 rounded-full bg-[rgb(var(--surface-rgb)_/_0.7)] px-2.5 py-1 text-[10.5px] text-ink-2">
                      <Gem className="h-3 w-3 text-accent-ink" aria-hidden="true" /> {String(i + 1).padStart(2, "0")} / {GRAILS}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ===================== 5 · Economics / vault ===================== */}
      <section className="relative pt-16">
        <PageContainer width="wide">
          <Header
            eyebrow="Where the mint goes"
            title="The vault grows from real math."
            copy={`${Math.round(NFT_VAULT_SHARE * 100)}% of every mint flows into the prize vault — the same split the live machine runs on today.`}
          />
          <div className="mt-7 grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
            <Reveal className="glass-panel rounded-[24px] p-6">
              {/* Allocation bar */}
              <div className="flex h-3.5 w-full overflow-hidden rounded-full">
                <span className="h-full bg-[#8ec500]" style={{ width: `${NFT_VAULT_SHARE * 100}%` }} aria-hidden="true" />
                <span className="h-full w-[12%] bg-[rgb(var(--ink-rgb)_/_0.28)]" aria-hidden="true" />
                <span className="h-full w-[3%] bg-[rgb(var(--ink-rgb)_/_0.14)]" aria-hidden="true" />
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-ink-2">
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#8ec500]" aria-hidden="true" /> Prize vault <span className="num text-ink">85%</span></li>
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.28)]" aria-hidden="true" /> Robacha <span className="num text-ink">12%</span></li>
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.14)]" aria-hidden="true" /> Running costs <span className="num text-ink">3%</span></li>
              </ul>

              {/* Flow */}
              <div className="mt-5 flex items-center justify-between gap-2 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.03)] p-4">
                <FlowNode label="Mints" />
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
                <FlowNode label="Prize vault" accent />
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
                <FlowNode label="Machine rewards" />
              </div>

              {/* Scenarios */}
              <p className="mt-5 micro text-ink-3">If the collection sells…</p>
              <ul className="mt-2 space-y-2 text-[13px]">
                {NFT_FUNDING_SCENARIOS.map((fraction) => {
                  const minted = Math.round(NFT_TOTAL_SUPPLY * fraction);
                  const gross = minted * NFT_MINT_PRICE_USD;
                  const highlight = fraction === 0.5;
                  return (
                    <li key={fraction} className={cn("flex items-center justify-between rounded-[12px] px-3 py-2.5", highlight ? "bg-accent-soft/60 ring-1 ring-[rgba(204,255,0,0.35)]" : "bg-[rgb(var(--ink-rgb)_/_0.02)]")}>
                      <span className="num font-medium text-ink">{Math.round(fraction * 100)}% mint <span className="text-ink-3">· {minted} capsules</span></span>
                      <span className="num text-ink-3">${gross.toLocaleString()} → <span className="font-semibold text-ink">${vaultAt(fraction).toLocaleString()}</span></span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-ink-3">Same split, real inputs, visible math.</p>
            </Reveal>

            <Reveal delay={80} className="glass-card flex flex-col rounded-[24px] p-6">
              <div className="mb-3 flex items-end gap-2" aria-hidden="true" data-rarity="grail">
                {[0, 1, 2].map((i) => (
                  <span key={i}><CapsuleGlyph id={`vault-${i}`} className={cn("h-11 w-11 drop-shadow-[0_6px_14px_rgb(var(--rarity-glow)_/_0.4)]", i === 0 && "capsule-drift-a", i === 1 && "capsule-drift-b", i === 2 && "capsule-drift-c")} /></span>
                ))}
              </div>
              <p className="text-[14px] font-semibold tracking-[-0.01em]">Why the math matters</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                Only {MACHINE_ELIGIBLE} of the {NFT_TOTAL_SUPPLY} capsules can be
                spent against that vault — {GRAILS} of them Grails. A five-figure
                pool drawn on by just {MACHINE_ELIGIBLE} capsules is what puts
                four-figure Grail pulls within reach. Not optimism — division.
              </p>
              <p className="mt-auto pt-4 text-[11.5px] leading-relaxed text-ink-3">
                Exact odds and prize ranges go on chain before minting opens, and those bind — this shows the funding, not a promise about any single pull.
              </p>
            </Reveal>
          </div>
        </PageContainer>
      </section>

      {/* ===================== 6 · Trust + onchain ===================== */}
      <section className="relative pt-16">
        <PageContainer width="wide">
          <Header eyebrow="Trust" title="Know exactly what you're minting." />
          <div className="mt-7 grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="glass-card rounded-[22px] p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-ink-2" aria-hidden="true" />
                <h3 className="text-[14px] font-semibold tracking-[-0.01em]">Before you mint</h3>
              </div>
              <ul className="mt-3.5 space-y-2.5">
                {[
                  "Capsules are NFTs on Robinhood Chain — yours in your own wallet.",
                  "Mint transactions are final, and market value isn't guaranteed.",
                  "Reward values can fluctuate; machine utility follows the active protocol rules.",
                  "Nothing is live yet: no contract is deployed, and price, supply and date can change before one is.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" aria-hidden="true" /> {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-[22px] p-6">
              <h3 className="text-[14px] font-semibold tracking-[-0.01em]">Onchain details</h3>
              <dl className="mt-3.5 space-y-2.5 text-[12.5px]">
                <Detail label="Network" value={NETWORK_LABEL} />
                <Detail label="Total supply" value={String(NFT_TOTAL_SUPPLY)} />
                <Detail label="Mint price" value={`$${NFT_MINT_PRICE_USD} equivalent`} />
                <Detail label="Payment assets" value={NFT_PAYMENT_TOKENS.map((t) => t.symbol).join(" · ")} />
                <Detail label="Tier split" value="350 / 125 / 22 / 3" />
                <Detail label="Prize-vault share" value={`${Math.round(NFT_VAULT_SHARE * 100)}%`} />
                <Detail label="Collection contract" value="Published when it deploys" muted />
              </dl>
              <p className="mt-3.5 text-[11px] leading-relaxed text-ink-3">
                Every figure is fixed in the contract when it deploys — we&rsquo;ll link you straight at it rather than ask you to take the split on trust.
              </p>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ===================== 7 · FAQ ===================== */}
      <section className="relative pt-16">
        <PageContainer width="wide">
          <Header eyebrow="FAQ" title="Everything we can tell you today." />
          <div className="mt-7">
            <MintFaqAccordion />
          </div>
        </PageContainer>
      </section>

      {/* ===================== 8 · Final CTA ===================== */}
      <section className="relative py-16">
        <PageContainer width="wide">
          <div className="glass-panel glass-reflection relative overflow-hidden rounded-[30px] px-6 py-14 text-center sm:px-10">
            <span className="noise-overlay" aria-hidden="true" />
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.16),transparent_66%)]" aria-hidden="true" />
            <div className="relative mx-auto max-w-[42ch]">
              <span aria-hidden="true" data-rarity="grail" className="mx-auto mb-5 block w-fit">
                <CapsuleGlyph id="cta-capsule" className="capsule-float h-14 w-14 drop-shadow-[0_10px_22px_rgb(var(--rarity-glow)_/_0.45)]" />
              </span>
              <h2 className="text-[clamp(1.9rem,3.6vw,2.7rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
                Get ready before the machine opens.
              </h2>
              <p className="mx-auto mt-3 max-w-[40ch] text-[14px] leading-relaxed text-ink-2">
                500 capsules, 3 Grails, one drop. Follow along to hear the moment
                minting opens — and spin the live machine while you wait.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <ButtonLink href={x.href} external variant="primary" size="lg">
                  <XIcon className="h-4 w-4" /> Get the drop first <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/app" variant="secondary" size="lg">See the live machine</ButtonLink>
              </div>
              <p className="mt-6 text-[12px] text-ink-3">
                Next up:{" "}
                <a href="/nft-spins" className="inline-flex items-center gap-1 font-medium text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">
                  NFT Spins <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </p>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

/* --------------------------------------------------------------- helpers --- */

function Header({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="max-w-[52ch]">
      <p className="micro text-ink-3">{eyebrow}</p>
      <h2 className="mt-1.5 text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{title}</h2>
      {copy ? <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">{copy}</p> : null}
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="px-4 py-5 text-center sm:px-5">
      <p className={cn("num text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]", accent && "text-accent-ink")}>{value}</p>
      <p className="micro mt-0.5 text-ink-3">{label}</p>
    </div>
  );
}

function FlowNode({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span className={cn("num rounded-full px-3 py-1.5 text-[11px] font-medium", accent ? "bg-[rgba(204,255,0,0.16)] text-accent-ink" : "glass-chip text-ink-2")}>{label}</span>
  );
}

function Detail({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className={cn("num text-right", muted ? "text-ink-3" : "text-ink")}>{value}</dd>
    </div>
  );
}
