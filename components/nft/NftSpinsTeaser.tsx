import Image from "next/image";
import { ArrowUpRight, ExternalLink, Lock, Sparkles } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { explorerUrl } from "@/lib/config";
import { NFT_SPIN_CANDIDATES } from "@/data/nft-spins";
import { CapsuleGlyph } from "./CapsuleGlyph";

/**
 * NFT spins, before they exist.
 *
 * Two parts. The hero carries the idea and the artwork; the machine below
 * carries the reel — real ERC-721 collections from this chain drifting
 * through a locked cabinet, so the page shows what the product will feel
 * like using only things that are true today.
 *
 * The reel is the part that could lie, so it is built not to. Every card is
 * a collection verified on chain (see data/nft-spins.ts), labelled as a
 * candidate rather than a prize, and clicking one goes to the explorer —
 * the same "check it yourself" invitation the rest of the site makes. No
 * number appears anywhere: no odds, floors, supplies or dates, because no
 * contract exists to answer for any of them. When the machine is real, its
 * odds and prize list get published from the contract before the first
 * spin, exactly as every token pool's are.
 *
 * The spin button is rendered and locked, stated on the control itself —
 * the same treatment as the mint page's button, because a visible locked
 * control is honest about both the plan and its status.
 */
export function NftSpinsTeaser() {
  const x = SOCIAL_LINKS[0];

  // The tier tints, cycled across the reel. Purely decorative — a rarity is
  // a property of a published prize, and these are not prizes yet.
  const tints = ["grail", "legendary", "rare", "epic", "uncommon", "common"];

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      {/* ---------------- Hero: idea + artwork ---------------- */}
      <Reveal className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-3 sm:p-4">
        <span className="noise-overlay" aria-hidden="true" />

        <div className="relative grid gap-3 lg:grid-cols-[1.05fr_1fr]">
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
              capsule that drops holds an NFT from one of Robinhood
              Chain&rsquo;s top collections. Same chain, same provable draw.
            </p>

            <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-ink-3">
              No odds, prize list or dates yet — when the machine is real, all
              three get published from the contract before the first spin, the
              same way every pool&rsquo;s are.
            </p>

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

            <div className="mt-5">
              <ButtonLink href="/app" variant="primary" size="lg">
                Spin the live machine
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------------- The machine, locked ---------------- */}
      <Reveal
        delay={80}
        className="glass-panel glass-reflection glass-highlight relative mt-4 overflow-hidden rounded-[28px]"
      >
        <span className="noise-overlay" aria-hidden="true" />
        <div className="cross-grid absolute inset-0" aria-hidden="true" />
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />

        {/* Machine casing — the same cues the live stage uses: brushed top
            rail, coin slot, and a chute below. Decorative, none load-bearing. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-11 rounded-t-[28px] border-b border-[rgb(var(--line-rgb)_/_0.07)] bg-[linear-gradient(180deg,rgb(var(--edge-rgb)_/_0.85),rgb(var(--edge-rgb)_/_0.25))]"
        >
          <span className="absolute left-1/2 top-[18px] h-[5px] w-16 -translate-x-1/2 rounded-full bg-[rgb(var(--line-rgb)_/_0.14)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]" />
          <span className="absolute left-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
          <span className="absolute right-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
        </div>

        <div className="relative px-3 pb-6 pt-14 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
              The reel it&rsquo;s being loaded with
            </h2>
            <span className="glass-chip inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium text-ink-2">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Coming soon
            </span>
          </div>

          {/* The reel. Real collections, drifting like the live carousel.
              The track is the list twice because the marquee keyframe
              travels -50% and loops — one copy would jump at the seam. */}
          <div className="marquee-host edge-fade overflow-hidden">
            <div
              className="marquee-track flex w-max items-stretch gap-3"
              style={{ "--marquee-duration": "38s" } as React.CSSProperties}
            >
              {[0, 1].map((copy) =>
                NFT_SPIN_CANDIDATES.map((c, i) => (
                  <a
                    key={`${copy}-${c.address}`}
                    href={explorerUrl("token", c.address) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    aria-hidden={copy === 1}
                    tabIndex={copy === 1 ? -1 : undefined}
                    data-rarity={tints[i % tints.length]}
                    className="glass-card group w-[190px] shrink-0 rounded-[18px] p-4 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <span className="grid h-20 place-items-center">
                      <CapsuleGlyph
                        id={`reel-${copy}-${i}`}
                        className="capsule-float h-14 w-14 drop-shadow-[0_10px_20px_rgb(var(--rarity-glow)_/_0.35)]"
                      />
                    </span>
                    <p className="mt-2 truncate text-[13px] font-semibold tracking-[-0.02em]" title={c.name}>
                      {c.name}
                    </p>
                    <p className="num mt-0.5 flex items-center gap-1 text-[11px] text-ink-3">
                      {c.symbol}
                      <ExternalLink className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    </p>
                  </a>
                )),
              )}
            </div>
          </div>

          <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
            Candidates, not confirmed prizes. Each card is a real collection on
            Robinhood Chain — tap one to read it on the explorer. The final
            prize list and its odds are published from the contract before the
            first spin.
          </p>

          {/* The control, present and locked — same treatment as the mint. */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)] text-[15px] font-semibold text-ink-3 sm:w-auto sm:px-10"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            NFT spins locked — opening announced on X
          </button>

          {/* The chute. */}
          <div
            aria-hidden="true"
            className="mx-auto mt-5 h-6 max-w-[220px] rounded-b-[14px] rounded-t-[4px] border border-t-0 border-[rgb(var(--line-rgb)_/_0.09)] bg-[linear-gradient(180deg,rgb(var(--ink-rgb)_/_0.07),rgb(var(--ink-rgb)_/_0.02))] shadow-[inset_0_3px_8px_rgb(var(--ink-rgb)_/_0.12)]"
          />
        </div>
      </Reveal>
    </PageContainer>
  );
}
