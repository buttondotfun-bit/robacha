"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ButtonLink } from "@/components/ui/Button";
import { explorerUrl } from "@/lib/config";
import { cn, ringDelta } from "@/lib/utils";
import { NFT_SPIN_CANDIDATES, type NftSpinCandidate } from "@/data/nft-spins";

/**
 * The NFT machine's stage — the same fan as the live carousel, turning idly.
 *
 * Same transform math as RewardCarousel, deliberately: this page's whole
 * promise is "the machine you already know, loaded with NFTs", and the
 * fastest way to say that is for the stage to *be* the one people have spun.
 * It is a separate component rather than a reuse because the live carousel is
 * coupled to pool entries, market data and the spin transaction, none of
 * which exist here — and wiring fake entries into the real component would
 * put mock values one import away from the production machine.
 *
 * The reel turns slowly and forever. The live reel only free-runs while a
 * real transaction is in flight, because there its motion reports state;
 * here there is no state to report, so the idle turn is honest the way a
 * shop-window display is — clearly a display, nothing implied as pending.
 * Hover pauses it; a click opens the collection on the explorer, the same
 * check-it-yourself invitation the reel has carried since it was a marquee.
 *
 * Cards carry no odds, ranges or tiers — the fields the live card earns from
 * the contract are simply absent, and the footer says "coming soon" where
 * odds would go. Tints are cycled decoration, not rarity claims.
 */

const VISIBLE = 3;
/** Cards per second while idling. The live reel spins at 2.2 mid-transaction. */
const IDLE_RATE = 0.45;

const TINTS = ["grail", "legendary", "rare", "epic", "uncommon", "common"];

export function NftSpinStage({ className }: { className?: string }) {
  const len = NFT_SPIN_CANDIDATES.length;
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const paused = useRef(false);

  /**
   * The card the viewer asked about. A click used to jump straight to the
   * explorer, which answers "is this real?" but nothing else; the dialog
   * answers the question first — what the collection is, where it trades,
   * where to verify it — and then offers both doors. The reel holds still
   * while it is open so the card that was tapped is the card behind it.
   */
  const [selected, setSelected] = useState<NftSpinCandidate | null>(null);
  useEffect(() => {
    if (selected) paused.current = true;
    else paused.current = false;
  }, [selected]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || len === 0) return;

    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused.current) {
        posRef.current = (posRef.current + IDLE_RATE * dt) % len;
        setPos(posRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [len]);

  if (len === 0) return null;

  return (
    <div
      className={cn("relative isolate w-full select-none", className)}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      style={
        {
          "--card-w": "clamp(132px, 12.4vw, 176px)",
          "--gap": "calc(var(--card-w) * 0.84)",
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(204,255,0,0.32) 0%, rgba(204,255,0,0.10) 42%, rgba(204,255,0,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[8%] bottom-[6px] h-px bg-[linear-gradient(90deg,transparent,rgba(204,255,0,0.85),transparent)]"
      />

      <div
        role="group"
        aria-label="Upcoming NFT reward carousel — candidates, not confirmed prizes"
        className="relative mx-auto h-[calc(var(--card-w)*1.72)] w-full"
      >
        {NFT_SPIN_CANDIDATES.map((candidate, index) => {
          const offset = ringDelta(pos, index, len);
          const distance = Math.abs(offset);
          if (distance > VISIBLE + 0.5) return null;

          const direction = Math.sign(offset);
          const xFactor = direction * Math.pow(distance, 0.88);
          const yFactor = distance * 0.055;
          const scale = Math.max(0.54, 1 - distance * 0.118);
          const rotate = offset * -3.4;
          const opacity = Math.max(0.12, 1 - distance * 0.235);
          const isCentre = distance < 0.5;
          const tint = TINTS[index % TINTS.length];

          return (
            <button
              key={candidate.address}
              type="button"
              onClick={() => setSelected(candidate)}
              tabIndex={isCentre ? 0 : -1}
              aria-hidden={!isCentre}
              aria-label={`About ${candidate.name}`}
              className="absolute left-1/2 top-1/2 block h-[calc(var(--card-w)*1.72)] w-[var(--card-w)] cursor-pointer will-change-transform"
              style={{
                transform: `translate3d(calc(-50% + var(--gap) * ${xFactor.toFixed(4)}), calc(-50% + var(--card-w) * ${yFactor.toFixed(4)}), 0) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(3)}deg)`,
                zIndex: 60 - Math.round(distance * 10),
                opacity,
              }}
            >
              <article
                data-rarity={tint}
                className={cn(
                  "glass-reflection relative flex h-full w-full flex-col overflow-hidden rounded-[18px] transition-[box-shadow] duration-300",
                  isCentre
                    ? "rarity-glass shadow-[0_1px_1px_rgb(var(--edge-rgb)_/_0.7)_inset,0_0_0_3px_rgba(204,255,0,0.3),0_24px_48px_-24px_rgb(var(--ink-rgb)_/_0.5)]"
                    : "glass-card",
                )}
              >
                <div className="relative flex items-center justify-between px-2.5 pt-2.5">
                  <span className="micro text-[9px] tracking-[0.1em] text-ink-3">
                    NFT SPINS
                  </span>
                  <span className="num text-[9px] text-ink-3">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* The collection's own artwork — a sample token's image, read
                    from the contract's tokenURI and stored locally (see
                    data/nft-spins.ts). A plain img rather than next/image:
                    half of these are on-chain SVGs, which the optimizer
                    refuses without dangerouslyAllowSVG, and a 320px local
                    file gains nothing from it anyway. */}
                <div className="relative px-2.5 pt-2">
                  <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[radial-gradient(circle_at_50%_38%,rgb(var(--rarity-glow)_/_0.22),transparent_72%)] shadow-[0_4px_12px_-6px_rgb(var(--ink-rgb)_/_0.32)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={candidate.image}
                      alt={`Sample artwork from ${candidate.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
                  <p
                    className="shrink-0 truncate text-[13px] font-semibold leading-snug tracking-[-0.02em]"
                    title={candidate.name}
                  >
                    {candidate.name}
                  </p>
                  <p className="num mt-0.5 shrink-0 truncate text-[10.5px] leading-snug text-ink-3">
                    {candidate.symbol}
                  </p>

                  <div className="mt-auto shrink-0 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-1.5">
                    <span className="micro text-[9px] text-ink-3">
                      Coming soon
                    </span>
                  </div>
                </div>
              </article>
            </button>
          );
        })}
      </div>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        description={selected ? `${selected.symbol} · candidate for the NFT spins machine` : undefined}
        className="w-full max-w-[420px]"
      >
        {selected ? (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-[16px] border border-[rgb(var(--edge-rgb)_/_0.8)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.image}
                alt={`Sample artwork from ${selected.name}`}
                className="aspect-square w-full object-cover"
              />
            </div>

            <dl className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="micro shrink-0">Contract</dt>
                <dd className="num truncate text-ink-2" title={selected.address}>
                  {`${selected.address.slice(0, 10)}…${selected.address.slice(-8)}`}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="micro shrink-0">Chain</dt>
                <dd className="text-ink-2">Robinhood Chain</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="micro shrink-0">Standard</dt>
                <dd className="text-ink-2">ERC-721</dd>
              </div>
            </dl>

            <p className="text-[11.5px] leading-relaxed text-ink-3">
              A candidate for the NFT spins machine, not a confirmed prize. The
              artwork above is a sample token, served by the collection&rsquo;s
              own contract. Verify everything yourself below.
            </p>

            <div className="flex flex-col gap-2">
              <ButtonLink
                href={selected.opensea}
                external
                variant="primary"
                size="lg"
                fullWidth
              >
                View on OpenSea
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink
                href={explorerUrl("token", selected.address) ?? "#"}
                external
                variant="secondary"
                size="lg"
                fullWidth
              >
                Contract on Blockscout
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
