import Image from "next/image";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { CapsuleGlyph } from "./CapsuleGlyph";

/**
 * NFT spins, before they exist.
 *
 * A teaser in the strict sense: the idea, the artwork, and where the news
 * will land first. Nothing else, because nothing else is real yet — there is
 * no contract, no collection, no odds and no date, and this page's job is to
 * build appetite without borrowing against any of those.
 *
 * The discipline here is the same one the mint page keeps. No number appears
 * unless something on chain can answer for it, so this page has no numbers at
 * all: no supply, no price, no percentages, no countdown. The hype is carried
 * by the artwork and the one-line idea, which are the two things that are
 * actually true today. When the machine exists, its odds and prizes get
 * published from the contract before the first spin, exactly as every token
 * pool's are — and that promise is on the page, because being checkable is
 * the loudest thing this project has.
 *
 * The CTA sends people to the live machine rather than a mailing list. The
 * best way to be excited about the next machine is to have played this one.
 */
export function NftSpinsTeaser() {
  const x = SOCIAL_LINKS[0];

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      <Reveal className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-3 sm:p-4">
        <span className="noise-overlay" aria-hidden="true" />

        <div className="relative grid gap-3 lg:grid-cols-[1.05fr_1fr]">
          {/* ---- artwork ---- */}
          <div className="relative aspect-square overflow-hidden rounded-[24px] lg:aspect-auto lg:min-h-[420px]">
            <Image
              src="/nft.png"
              alt="A Robacha capsule: a glossy pink and white sphere with a lit centre button, floating among smaller capsules"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 680px"
              className="object-cover"
            />
          </div>

          {/* ---- pitch ---- */}
          <div className="flex flex-col justify-center p-4 sm:p-6">
            <span className="glass-chip inline-flex h-8 w-fit items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Coming soon
            </span>

            <h1 className="text-display mt-4">
              Spin the machine.
              <br />
              Pull an NFT.
            </h1>

            <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-ink-2">
              A new machine is being built for ROBACHA: same spin, but the
              capsule that drops holds an NFT instead of tokens. Same chain,
              same provable draw.
            </p>

            <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-ink-3">
              No odds, supply or dates yet — when the machine is real, all
              three get published from the contract before the first spin,
              the same way every pool&rsquo;s are.
            </p>

            {/* One of each tier drifting past, the same decorative capsules
                the rest of the product uses. Decoration, not a prize list. */}
            <div aria-hidden="true" className="mt-6 flex items-end gap-3">
              <span data-rarity="grail">
                <CapsuleGlyph id="spins-grail" className="capsule-float h-14 w-14 drop-shadow-[0_10px_22px_rgb(var(--rarity-glow)_/_0.4)]" />
              </span>
              <span data-rarity="legendary" className="opacity-70">
                <CapsuleGlyph id="spins-legendary" className="capsule-drift-a h-10 w-10" />
              </span>
              <span data-rarity="rare" className="opacity-70">
                <CapsuleGlyph id="spins-rare" className="capsule-drift-b h-9 w-9" />
              </span>
              <span data-rarity="common" className="opacity-60">
                <CapsuleGlyph id="spins-common" className="capsule-drift-c h-8 w-8" />
              </span>
            </div>

            <div className="mt-6 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-5">
              <p className="micro">Opening</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                Announced on X first. Follow{" "}
                <a
                  href={x.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-ink underline decoration-dotted underline-offset-2"
                >
                  <XIcon className="h-3 w-3" aria-hidden="true" />
                  {x.handle}
                </a>{" "}
                to catch it.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ButtonLink href="/app" variant="primary" size="lg">
                Spin the live machine
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
                <Lock className="h-3 w-3" aria-hidden="true" />
                NFT spins are not live yet
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </PageContainer>
  );
}
