import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { NFT_MINT_PRICE_USD, NFT_STEPS } from "@/data/nft";
import { NETWORK_LABEL } from "@/lib/web3";

/**
 * The NFT drop, announced honestly.
 *
 * Nothing on this page exists yet: no contract, no artwork on chain, no vault
 * behind the legendary mechanic. Every other page here can be checked against
 * the chain, so this one has to be unmistakably a plan — otherwise it borrows
 * credibility the rest of the site earned and spends it on something unbuilt.
 *
 * The capsule art is drawn rather than shown, for the same reason the upcoming
 * machines are blurred: displaying artwork that has not been made would be
 * inventing the product. Shapes are honest about being shapes.
 *
 * No supply count, no mint progress, no holders, no countdown. Those numbers do
 * not exist, and a fabricated one on an unlaunched drop is the most common lie
 * in this category.
 */
export function NftTeaser() {
  const x = SOCIAL_LINKS[0];

  return (
    <>
      <PageContainer width="wide" className="pb-4 pt-6">
        <header className="max-w-[62ch]">
          <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Not live yet
          </span>
          <h1 className="text-page-title mt-4">Capsules you actually own.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Robacha NFTs are coming to {NETWORK_LABEL}. Mint one, trade it, or
            feed a legendary back into the machine for a pull from a bigger
            pool. None of it is live — this page is what we&rsquo;re building,
            not something you can buy today.
          </p>
        </header>

        {/* Drawn, not photographed. There is no artwork yet and showing some
            would be inventing the product. */}
        <div
          aria-hidden="true"
          className="relative mt-8 grid h-[190px] place-items-center overflow-hidden rounded-[24px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.035)]"
        >
          <div className="flex items-end gap-4">
            {["common", "rare", "legendary"].map((rarity, index) => (
              <span
                key={rarity}
                data-rarity={rarity}
                className="grid place-items-center rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)]"
                style={{
                  width: index === 2 ? 108 : 84,
                  height: index === 2 ? 132 : 104,
                }}
              >
                <svg viewBox="0 0 80 80" className={index === 2 ? "h-14 w-14" : "h-11 w-11"}>
                  <path d="M8 40a32 32 0 0 0 64 0Z" fill="rgb(var(--ink-rgb) / 0.14)" />
                  <path d="M8 40a32 32 0 0 1 64 0Z" fill="rgb(var(--rarity-glow) / 0.85)" />
                  <rect
                    x="6"
                    y="36.5"
                    width="68"
                    height="7"
                    rx="3.5"
                    fill="rgb(var(--surface-rgb) / 0.9)"
                  />
                </svg>
              </span>
            ))}
          </div>
          <p className="absolute bottom-3 text-[11px] text-ink-3">
            Artwork isn&rsquo;t finished. These are placeholders, not the real
            capsules.
          </p>
        </div>
      </PageContainer>

      <section className="relative py-12">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="How it will work"
            title="Mint, trade, or spin it."
            description="Three things you'll be able to do with a capsule. The third is the one we're most interested in."
            className="mb-6"
          />

          <ol className="grid gap-4 sm:grid-cols-3">
            {NFT_STEPS.map((step, index) => (
              <li key={step.title} className="glass-card rounded-[20px] p-5">
                <span className="num text-[11px] text-ink-3">0{index + 1}</span>
                <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="glass-panel mt-6 rounded-[24px] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="micro">Planned mint price</p>
                <p className="num mt-1 text-[26px] font-semibold tracking-[-0.03em]">
                  ${NFT_MINT_PRICE_USD}
                </p>
              </div>
              <Sparkles className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
            </div>
            <p className="mt-3 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-2">
              That&rsquo;s what we&rsquo;re planning to open at, and it can
              change before launch — nothing is committed until a contract is
              deployed and you can read it yourself. When minting does open,
              the price, the supply and the legendary odds will all be on chain
              first, the same as every pool on this site.
            </p>
          </div>
        </PageContainer>
      </section>

      <section className="relative pb-16">
        <PageContainer width="wide">
          <div className="glass-card rounded-[24px] p-6">
            <h2 className="text-section-title text-[19px]">
              What we&rsquo;re not going to tell you yet
            </h2>
            <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-ink-2">
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-3" aria-hidden="true" />
                <span>
                  <span className="font-medium text-ink">What a legendary pays.</span>{" "}
                  It depends on a prize vault that doesn&rsquo;t exist yet.
                  We&rsquo;re not putting a number on it while it would be a
                  guess — you&rsquo;ll get the real range and the real odds
                  before you can spend anything.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-3" aria-hidden="true" />
                <span>
                  <span className="font-medium text-ink">A date.</span> We
                  haven&rsquo;t committed to one, so there&rsquo;s no countdown
                  on this page.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-3" aria-hidden="true" />
                <span>
                  <span className="font-medium text-ink">How many there are.</span>{" "}
                  Supply gets set in the contract, and we&rsquo;ll point you at
                  it rather than quote it here.
                </span>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-5">
              <ButtonLink href={x.href} external variant="primary" size="md">
                <XIcon className="h-3.5 w-3.5" />
                Follow for the drop
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/app" variant="secondary" size="md">
                Spin the live machine
              </ButtonLink>
            </div>

            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
              NFTs are chance-based and their value moves — a capsule can be
              worth less than you paid, and a legendary pull is still a pull.
              Only spend what you&rsquo;d be fine losing.
            </p>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
