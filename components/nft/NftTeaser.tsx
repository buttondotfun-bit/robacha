import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Lock,
  Repeat,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import {
  NFT_FUNDING_SCENARIOS,
  NFT_MINT_PRICE_USD,
  NFT_PHASES,
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
import { CapsuleUtilitySelector } from "./CapsuleUtilitySelector";
import { MintFaqAccordion } from "./MintFaqAccordion";
import { NftSpinsCallout } from "./NftSpinsCallout";
import { MintFollowCta } from "./MintFollowCta";
import { MintPrice } from "./MintPrice";
import { RobContextLink } from "@/components/rob/RobContextLink";

/**
 * The Robacha Capsules mint.
 *
 * Built as a real product drop, but honestly pre-launch: there is no contract,
 * so nothing here is a live reading. Every number is the collection's fixed
 * plan from data/nft.ts — supply, tier split, the 85% vault share that already
 * runs on chain — shown as arithmetic rather than asserted, and the mint console
 * is locked with the reason on the control. No minted counter, no holder count,
 * no rolling countdown: those appear only when a contract exists to answer them.
 */
const MACHINE_ELIGIBLE = NFT_TIERS.filter((t) => t.spendable).reduce((s, t) => s + t.supply, 0);
const GRAILS = NFT_TIERS.find((t) => t.key === "grail")?.supply ?? 0;

export function NftTeaser() {
  const x = SOCIAL_LINKS[0];

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <PageContainer width="wide" className="pb-4 pt-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <CapsulePreview />

          <div className="lg:pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Minting soon
              </span>
              <span className="glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-ink-2">{NETWORK_LABEL}</span>
              <span className="num glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-ink-2">{NFT_TOTAL_SUPPLY} total</span>
            </div>

            <h1 className="text-page-title mt-4">Robacha Capsules.</h1>
            <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
              {NFT_TOTAL_SUPPLY} capsules built to be used, not just held. Mint one,
              keep or trade it — or put an eligible capsule back into the machine
              for a deeper reward pool. Three of the {NFT_TOTAL_SUPPLY} are Grails.
            </p>

            {/* ---- Mint console ---- */}
            <div className="glass-panel mt-6 rounded-[24px] p-5">
              <p className="micro text-ink-3">Mint a capsule</p>
              <MintPrice />

              {/* Quantity — shown as the eventual control, locked until live. */}
              <div className="mt-4 flex items-center gap-2 opacity-55" aria-hidden="true">
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
              <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-ink-3">
                The console unlocks when the contract is deployed and verified — until then there&rsquo;s nothing to sign and nothing to pay.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
                <ButtonLink href={x.href} external variant="primary" size="md" className="flex-1">
                  <XIcon className="h-3.5 w-3.5" /> Get the drop first <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/app" variant="secondary" size="md" className="flex-1">Spin the live machine</ButtonLink>
              </div>
              <div className="mt-3">
                <MintFollowCta />
              </div>
            </div>
          </div>
        </div>

        {/* Scarcity strip */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-[rgb(var(--line-rgb)_/_0.08)] rounded-[18px] glass-card">
          <Scarcity value={NFT_TOTAL_SUPPLY} label="Total capsules" />
          <Scarcity value={MACHINE_ELIGIBLE} label="Machine-eligible" />
          <Scarcity value={GRAILS} label="Grails" accent />
        </div>
      </PageContainer>

      {/* ---------------- Tiers ---------------- */}
      <section className="relative pt-14">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="The collection"
            title="Four tiers. Three Grails."
            description="500 capsules on the machine's own 70 / 25 / 5 ladder. The top 5% splits again — and only three land at the very top."
            className="mb-6"
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NFT_TIERS.map((tier, index) => {
              const share = (tier.supply / NFT_TOTAL_SUPPLY) * 100;
              return (
                <Reveal
                  as="li"
                  key={tier.key}
                  delay={index * 80}
                  data-rarity={tier.key}
                  className={cn(
                    "rarity-glass glass-highlight group relative overflow-hidden rounded-[20px] p-5 transition-transform duration-300 hover:-translate-y-1",
                    tier.key === "grail" && "ring-2 ring-[rgb(var(--rarity-glow)_/_0.45)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "var(--rarity-bg)", color: "var(--rarity-fg)", border: "1px solid var(--rarity-bd)" }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rarity-dot)" }} aria-hidden="true" />
                      {tier.name}
                    </span>
                    {tier.spendable ? <span className="num text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--rarity-fg)" }}>Spendable</span> : null}
                  </div>
                  <CapsuleGlyph id={tier.key} className="mt-4 h-14 w-14 drop-shadow-[0_6px_14px_rgb(var(--rarity-glow)_/_0.35)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-6" />
                  <p className="num mt-3 text-[30px] font-semibold leading-none tracking-[-0.03em]">{tier.supply}</p>
                  <p className="num mt-1 text-[11px] text-ink-3">{share < 1 ? share.toFixed(1) : share.toFixed(0)}% of the collection</p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{tier.blurb}</p>
                </Reveal>
              );
            })}
          </ul>
        </PageContainer>
      </section>

      {/* ---------------- Grail story ---------------- */}
      <section className="relative pt-14">
        <PageContainer width="wide">
          <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-6 sm:p-8">
            <span className="noise-overlay" aria-hidden="true" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="micro text-accent-ink">Three exist</p>
                <h2 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em]">Only 3 of the 500 are Grails.</h2>
                <p className="mt-3 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-2">
                  A Grail can be committed to the machine for a pull against the deepest pool it can hold — the tier the whole collection is built around. Three exist, and there will never be more.
                </p>
                <p className="mt-3 text-[11.5px] text-ink-3">Which tokens are Grails is set by the contract, published before minting opens.</p>
              </div>
              <div className="flex items-end justify-center gap-4">
                {["s1", "s2", "s3"].map((id, i) => (
                  <div key={id} className="flex flex-col items-center gap-2" data-rarity="grail">
                    <CapsuleGlyph id={`grail-story-${id}`} className={cn("h-16 w-16 drop-shadow-[0_8px_18px_rgb(var(--rarity-glow)_/_0.4)]", i === 0 && "capsule-drift-a", i === 1 && "capsule-drift-b", i === 2 && "capsule-drift-c")} />
                    <span className="num text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ---------------- Utility flow ---------------- */}
      <section className="relative pt-14">
        <PageContainer width="wide">
          <SectionHeader eyebrow="How it works" title="Mint it. Trade it. Or spend it." description="Three things a capsule can do. The third is the one the tier is built for." className="mb-6" />
          <ol className="grid gap-4 lg:grid-cols-3">
            {NFT_PHASES.map((phase, index) => {
              const Icon = [Wallet, Repeat, Sparkles][index] ?? Wallet;
              return (
                <li key={phase.title} className="relative">
                  <div className="glass-card h-full rounded-[20px] p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(204,255,0,0.14)] text-accent-ink"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="num text-[11px] text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-3.5 text-[16px] font-semibold tracking-[-0.02em]">{phase.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{phase.body}</p>
                  </div>
                  {index < NFT_PHASES.length - 1 ? (
                    <span aria-hidden="true" className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-ink-3 lg:block"><ArrowRight className="h-4 w-4" /></span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </PageContainer>
      </section>

      {/* ---------------- Interactive utility ---------------- */}
      <section className="relative pt-14">
        <PageContainer width="wide">
          <SectionHeader eyebrow="Utility" title="What can my capsule do?" description="Pick a tier to see exactly what it unlocks." className="mb-6" />
          <CapsuleUtilitySelector />
        </PageContainer>
      </section>

      {/* ---------------- Economics + vault ---------------- */}
      <section className="relative pt-14">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="Where the mint goes"
            title="It's arithmetic, not a slogan."
            description={`${Math.round(NFT_VAULT_SHARE * 100)}% of every mint goes into the prize vault — the same split the live machine runs on today.`}
            className="mb-6"
          />
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
            <Reveal className="glass-panel rounded-[24px] p-5 sm:p-6">
              {/* Allocation bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                <span className="h-full bg-[#8ec500]" style={{ width: `${NFT_VAULT_SHARE * 100}%` }} aria-hidden="true" />
                <span className="h-full w-[12%] bg-[rgb(var(--ink-rgb)_/_0.28)]" aria-hidden="true" />
                <span className="h-full w-[3%] bg-[rgb(var(--ink-rgb)_/_0.14)]" aria-hidden="true" />
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-ink-2">
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#8ec500]" aria-hidden="true" /> Prize vault <span className="num text-ink">85%</span></li>
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.28)]" aria-hidden="true" /> Robacha <span className="num text-ink">12%</span></li>
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.14)]" aria-hidden="true" /> Running costs <span className="num text-ink">3%</span></li>
              </ul>

              {/* Vault flow */}
              <div className="mt-5 flex items-center justify-between gap-2 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.03)] p-4">
                <FlowNode label="Mints" />
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
                <FlowNode label="Prize vault" accent />
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
                <FlowNode label="Machine rewards" />
              </div>

              <p className="mt-4 micro text-ink-3">Illustrative collection economics</p>
              <ul className="mt-2 space-y-2 text-[13px]">
                {NFT_FUNDING_SCENARIOS.map((fraction) => {
                  const minted = Math.round(NFT_TOTAL_SUPPLY * fraction);
                  const gross = minted * NFT_MINT_PRICE_USD;
                  const highlight = fraction === 0.5;
                  return (
                    <li key={fraction} className={cn("flex items-center justify-between rounded-[12px] px-3 py-2", highlight ? "bg-accent-soft/60" : "bg-[rgb(var(--ink-rgb)_/_0.02)]")}>
                      <span className="num font-medium text-ink">{Math.round(fraction * 100)}% mint <span className="text-ink-3">· {minted} capsules</span></span>
                      <span className="num text-ink-3">${gross.toLocaleString()} → <span className="font-semibold text-ink">${vaultAt(fraction).toLocaleString()}</span></span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>

            <Reveal delay={80} className="glass-card rounded-[24px] p-5 sm:p-6">
              <div className="mb-3 flex items-end gap-2" aria-hidden="true">
                {["v1", "v2", "v3"].map((id, i) => (
                  <span key={id} data-rarity="grail"><CapsuleGlyph id={`vault-${id}`} className={cn("h-10 w-10 drop-shadow-[0_6px_14px_rgb(var(--rarity-glow)_/_0.4)]", i === 0 && "capsule-drift-a", i === 1 && "capsule-drift-b", i === 2 && "capsule-drift-c")} /></span>
                ))}
              </div>
              <p className="text-[13px] font-semibold">Why the math matters</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                Only {MACHINE_ELIGIBLE} of the {NFT_TOTAL_SUPPLY} capsules can be spent against that vault — {GRAILS} of them Grails. A five-figure pool drawn on by {MACHINE_ELIGIBLE} capsules is what puts four-figure Grail pulls within reach. Not optimism — division.
              </p>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
                Exact odds and prize ranges go on chain before minting opens, and those are the numbers that bind — this shows the funding, not a promise about any single pull.
              </p>
            </Reveal>
          </div>
        </PageContainer>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="relative pt-14">
        <PageContainer width="wide">
          <SectionHeader eyebrow="FAQ" title="Everything we can tell you today." className="mb-6" />
          <MintFaqAccordion />
        </PageContainer>
      </section>

      {/* ---------------- Know before you mint + on-chain ---------------- */}
      <section className="relative pt-14">
        <PageContainer width="wide">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div className="glass-card rounded-[20px] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-ink-2" aria-hidden="true" />
                <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Know before you mint</h2>
              </div>
              <ul className="mt-3 space-y-2">
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

            <div className="glass-card rounded-[20px] p-5 sm:p-6">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em]">On-chain details</h2>
              <dl className="mt-3 space-y-2.5 text-[12.5px]">
                <Detail label="Network" value={NETWORK_LABEL} />
                <Detail label="Total supply" value={String(NFT_TOTAL_SUPPLY)} />
                <Detail label="Mint price" value={`$${NFT_MINT_PRICE_USD} equivalent`} />
                <Detail label="Payment assets" value={NFT_PAYMENT_TOKENS.map((t) => t.symbol).join(" · ")} />
                <Detail label="Tier split" value="350 / 125 / 22 / 3" />
                <Detail label="Prize-vault share" value={`${Math.round(NFT_VAULT_SHARE * 100)}%`} />
                <Detail label="Collection contract" value="Published when it deploys" muted />
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
                Every figure above is fixed in the contract when it deploys — we&rsquo;ll link you straight at it rather than ask you to take the split on trust.
              </p>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ---------------- Next machine ---------------- */}
      <div className="pt-14">
        <NftSpinsCallout />
      </div>

      {/* Quiet ecosystem footnote — a link, not a payment path (the mint is
          priced in ETH / listed tokens, never $ROB). */}
      <div className="flex justify-center pb-2 pt-12">
        <RobContextLink />
      </div>
    </>
  );
}

function Scarcity({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="px-4 py-4 text-center sm:px-5">
      <p className={cn("num text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]", accent && "text-accent-ink")}>{value}</p>
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
