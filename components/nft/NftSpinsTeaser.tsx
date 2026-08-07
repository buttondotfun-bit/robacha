import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { NftSpinStage } from "./NftSpinStage";

/**
 * NFT spins, before they exist.
 *
 * Laid out like the spin page rather than an announcement, because that is
 * the promise: the machine people already know, loaded with NFTs. The
 * cabinet leads — same casing, coin slot and chute as the live stage — with
 * the fan carousel turning idly inside it and the spin control rendered but
 * locked, stated on the control itself.
 *
 * The reel is the part that could lie, so it is built not to. Every card is
 * a real ERC-721 collection on this chain, verified against its contract
 * (see data/nft-spins.ts), labelled a candidate rather than a prize, and a
 * click opens it on the explorer. No number appears anywhere on the page:
 * no odds, floors, supplies or dates, because no contract exists to answer
 * for them. When the machine is real, its odds and prize list get published
 * from the contract before the first spin, exactly as every pool's are.
 */
export function NftSpinsTeaser() {
  const x = SOCIAL_LINKS[0];

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      {/* ---------------- The machine ---------------- */}
      <Reveal className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[28px]">
        <span className="noise-overlay" aria-hidden="true" />
        <div className="cross-grid absolute inset-0" aria-hidden="true" />
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />

        {/* Casing — the same cues as the live stage: brushed top rail, coin
            slot, screws. Decorative, none load-bearing. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-11 rounded-t-[28px] border-b border-[rgb(var(--line-rgb)_/_0.07)] bg-[linear-gradient(180deg,rgb(var(--edge-rgb)_/_0.85),rgb(var(--edge-rgb)_/_0.25))]"
        >
          <span className="absolute left-1/2 top-[18px] h-[5px] w-16 -translate-x-1/2 rounded-full bg-[rgb(var(--line-rgb)_/_0.14)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]" />
          <span className="absolute left-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
          <span className="absolute right-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
        </div>

        <div className="relative px-3 pb-6 pt-14 sm:px-6 sm:pt-16">
          <div className="mb-2 flex justify-center">
            <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Coming soon
            </span>
          </div>

          <NftSpinStage className="mt-4" />

          <p className="mx-auto mt-6 max-w-[520px] text-center text-[11.5px] leading-relaxed text-ink-3">
            Candidates, not confirmed prizes. Each card is a real collection on
            Robinhood Chain — tap one to read it on the explorer. The final
            prize list and its odds are published from the contract before the
            first spin.
          </p>

          {/* The control, present and locked — same treatment as the mint. */}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)] px-10 text-[15px] font-semibold text-ink-3"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              NFT spins locked — opening announced on X
            </button>
          </div>

          {/* The chute. */}
          <div
            aria-hidden="true"
            className="mx-auto mt-5 h-6 max-w-[220px] rounded-b-[14px] rounded-t-[4px] border border-t-0 border-[rgb(var(--line-rgb)_/_0.09)] bg-[linear-gradient(180deg,rgb(var(--ink-rgb)_/_0.07),rgb(var(--ink-rgb)_/_0.02))] shadow-[inset_0_3px_8px_rgb(var(--ink-rgb)_/_0.12)]"
          />
        </div>
      </Reveal>

      {/* ---------------- The pitch ---------------- */}
      <Reveal
        delay={80}
        className="glass-panel glass-reflection glass-highlight relative mt-4 overflow-hidden rounded-[28px] p-6 sm:p-8"
      >
        <span className="noise-overlay" aria-hidden="true" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h1 className="text-display">
              Spin the machine.
              <br />
              Pull an NFT.
            </h1>

            <p className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-ink-2">
              A new machine is being built for ROBACHA: same spin, but the
              capsule that drops holds an NFT from one of Robinhood
              Chain&rsquo;s top collections. Same chain, same provable draw.
            </p>

            <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-ink-3">
              No odds, prize list or dates yet — when the machine is real, all
              three get published from the contract before the first spin, the
              same way every pool&rsquo;s are.
            </p>
          </div>

          <div className="flex flex-col justify-center lg:border-l lg:border-[rgb(var(--line-rgb)_/_0.08)] lg:pl-8">
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

            <div className="mt-5">
              <ButtonLink href="/app" variant="primary" size="lg">
                Spin the live machine
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </Reveal>
    </PageContainer>
  );
}
