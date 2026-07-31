import { ArrowUpRight, Check, Lock, Shuffle, Sparkles, Wallet } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { RarityChip } from "@/components/shared/RarityChip";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import {
  NFT_FACTS,
  NFT_MINT_PRICE_USD,
  NFT_PHASES,
  NFT_TIERS,
} from "@/data/nft";
import { NETWORK_LABEL } from "@/lib/web3";
import { CapsulePreview } from "./CapsulePreview";
import { MintCountdown } from "./MintCountdown";

/**
 * The capsule drop.
 *
 * Laid out as a mint page rather than an announcement: the capsule leads at
 * size on the left, and the right rail carries the pitch, the price, the clock
 * and the button — the shape people already know how to read.
 *
 * The button is locked because there is no contract behind it. That is stated
 * on the control itself rather than buried, and the page is written in the
 * present tense of something being built rather than as a list of caveats.
 * Confidence and honesty are not in tension here: the strongest thing this
 * project has is that its numbers can be checked, and a drop page that quietly
 * invents supply, payouts or a rolling timer would spend that to buy urgency it
 * does not need.
 */
export function NftTeaser() {
  const x = SOCIAL_LINKS[0];

  return (
    <>
      {/* ---------------- Hero: capsule left, mint panel right ---------------- */}
      <PageContainer width="wide" className="pb-6 pt-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <CapsulePreview />

          <div className="lg:pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Minting soon
              </span>
              <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
                {NETWORK_LABEL}
              </span>
            </div>

            <h1 className="text-page-title mt-4">Robacha Capsules.</h1>

            <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-ink-2">
              A collection built to be used, not just held. Mint a capsule and
              it&rsquo;s yours on {NETWORK_LABEL} — trade it like any NFT, or,
              if you pull a legendary, hand it back to the machine and spin it
              for a draw from a bigger pool than a standard spin reaches.
            </p>

            <ul className="mt-5 space-y-2">
              {[
                "Yours in your own wallet — we can't move it or take it back",
                "Freely tradable from the moment it mints",
                "Legendary capsules can be spun for a bigger pull",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" aria-hidden="true" />
                  <span className="text-[13px] leading-relaxed text-ink-2">{line}</span>
                </li>
              ))}
            </ul>

            {/* ---- mint panel ---- */}
            <div className="glass-panel mt-6 rounded-[24px] p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="micro">Mint price</p>
                  <p className="num mt-1 text-[32px] font-semibold leading-none tracking-[-0.03em]">
                    ${NFT_MINT_PRICE_USD}
                  </p>
                </div>
                <p className="text-[11.5px] leading-snug text-ink-3">
                  Per capsule
                  <span className="block">Paid in {NETWORK_LABEL} ETH</span>
                </p>
              </div>

              <div className="mt-5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
                <MintCountdown />
              </div>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)] text-[15px] font-semibold text-ink-3"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                Minting locked
              </button>

              {/* Says why on the control, rather than leaving a dead button. */}
              <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-ink-3">
                The button unlocks when the contract is deployed and verified.
                Until then there is nothing to sign and nothing to pay.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
                <ButtonLink href={x.href} external variant="primary" size="md" className="flex-1">
                  <XIcon className="h-3.5 w-3.5" />
                  Get the drop first
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/app" variant="secondary" size="md" className="flex-1">
                  Spin the live machine
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* ---------------- Tiers ---------------- */}
      <section className="relative py-14">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="The collection"
            title="Three tiers, one of them with a second life."
            description="Capsules use the same rarity ladder as the machine, so a capsule reads exactly the way a pull does."
            className="mb-6"
          />

          <ul className="grid gap-4 sm:grid-cols-3">
            {NFT_TIERS.map((tier) => (
              <li
                key={tier.key}
                data-rarity={tier.key}
                className="rarity-glass glass-highlight relative overflow-hidden rounded-[20px] p-5"
              >
                <RarityChip rarity={tier.key} size="sm" />
                <h3 className="mt-3 text-[16px] font-semibold tracking-[-0.02em]">
                  {tier.name}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                  {tier.blurb}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
            Supply for each tier is fixed in the contract when it deploys, and
            we&rsquo;ll link you straight to it — the same way the live
            pool&rsquo;s odds are published rather than described.
          </p>
        </PageContainer>
      </section>

      {/* ---------------- Phases ---------------- */}
      <section className="relative pb-14">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="How it works"
            title="Mint it. Trade it. Or spend it."
            description="Three things a capsule can do. The third is the one we built the tier for."
            className="mb-6"
          />

          <ol className="grid gap-4 sm:grid-cols-3">
            {NFT_PHASES.map((phase, index) => {
              const Icon = [Wallet, Shuffle, Sparkles][index] ?? Wallet;
              return (
                <li key={phase.title} className="glass-card rounded-[20px] p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="glass-micro grid h-9 w-9 place-items-center rounded-xl">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="num text-[11px] text-ink-3">{phase.label}</span>
                  </div>
                  <h3 className="mt-3.5 text-[16px] font-semibold tracking-[-0.02em]">
                    {phase.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                    {phase.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </PageContainer>
      </section>

      {/* ---------------- Detail ---------------- */}
      <section className="relative pb-16">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="The detail"
            title="Everything we can tell you today."
            description="Straight answers on what a capsule is, what it does, and what still has to land on chain before you can buy one."
            className="mb-6"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {NFT_FACTS.map((fact) => (
              <div key={fact.question} className="glass-card rounded-[20px] p-5">
                <h3 className="text-[14px] font-semibold tracking-[-0.02em]">
                  {fact.question}
                </h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                  {fact.answer}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-[80ch] text-[11.5px] leading-relaxed text-ink-3">
            Capsules are chance-based and their value moves — one can be worth
            less than you paid, and a legendary pull is still a pull. Nothing on
            this page is live yet: no contract is deployed, and the price, supply
            and opening date can all change before one is. Only spend what
            you&rsquo;d be fine losing.
          </p>
        </PageContainer>
      </section>
    </>
  );
}
