"use client";

import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RobachaCapsuleRing } from "@/components/brand/RobachaLogo";
import { OrbitalRings } from "@/components/shared/AmbientBackground";
import { PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/Glass";
import { chainConfig } from "@/lib/config";
import { useTopTokens } from "@/lib/use-top-tokens";

/**
 * Where the drifting reward cards sit behind the chamber. Each slot is filled
 * with a real trending token from Robinhood Chain, ranked by market cap — this
 * is the ecosystem the pools draw from, not a claim about pool contents.
 */
const BACKDROP = [
  { key: "a", className: "left-[6%] top-[18%] rotate-[-11deg]", size: 108 },
  { key: "b", className: "left-[17%] bottom-[14%] rotate-[8deg]", size: 90 },
  { key: "c", className: "right-[7%] top-[16%] rotate-[12deg]", size: 116 },
  { key: "d", className: "right-[18%] bottom-[16%] rotate-[-7deg]", size: 88 },
  { key: "e", className: "left-[30%] top-[8%] rotate-[6deg]", size: 74 },
  { key: "f", className: "right-[30%] bottom-[9%] rotate-[-13deg]", size: 78 },
];

export function FinalCta() {
  const { tokens } = useTopTokens(BACKDROP.length);

  return (
    <section className="relative pb-10 pt-16 sm:pt-20">
      <PageContainer width="wide">
        <div className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[36px] px-6 py-20 text-center sm:px-10 sm:py-24">
          <span className="noise-overlay" aria-hidden="true" />

          {/* Light chamber */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.3)_0%,rgba(204,255,0,0.08)_38%,transparent_68%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[62%] h-[380px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,119,172,0.22)_0%,transparent_66%)]"
          />
          <OrbitalRings
            className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
            size={640}
          />

          {/* Reward cards in the depth */}
          {BACKDROP.map((item, index) => (
            <span
              key={item.key}
              aria-hidden="true"
              className={`glass-card pointer-events-none absolute hidden aspect-square overflow-hidden rounded-2xl p-1.5 opacity-70 blur-[0.4px] lg:block [container-type:inline-size] ${item.className}`}
              style={{ width: item.size }}
            >
              {tokens[index] ? (
                <span className="block h-full w-full overflow-hidden rounded-xl">
                  <TokenAvatar
                    address={tokens[index].address}
                    symbol={tokens[index].symbol}
                    logoUrl={tokens[index].iconPath}
                    size={item.size}
                    rounded="none"
                  />
                </span>
              ) : null}
            </span>
          ))}

          {/* Content */}
          <div className="relative">
            <span className="relative inline-block">
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,119,172,0.4),transparent_66%)] blur-md"
              />
              <RobachaCapsuleRing
                className="relative drop-shadow-[0_10px_24px_rgba(16,17,15,0.22)]"
                style={{ height: 72, width: 72 }}
              />
            </span>

            <h2 className="text-page-title mx-auto mt-8 max-w-[16ch]">
              Your next meme is{" "}
              <span className="text-gradient-accent">one spin away.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-2">
              Enter the live Robacha pool and discover what Robinhood Chain sends
              your way.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/app" variant="primary" size="lg">
                Start Spinning
              </ButtonLink>
              <ButtonLink href="/rewards" variant="secondary" size="lg">
                Read the Odds First
              </ButtonLink>
            </div>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
              <GlassChip as="span" className="h-8 text-[11px]">
                {chainConfig.name}
              </GlassChip>
              <GlassChip as="span" className="h-8 text-[11px]">
                Odds published on chain
              </GlassChip>
              <GlassChip as="span" className="h-8 text-[11px]">
                Rewards settle as ERC-20 transfers
              </GlassChip>
            </div>

            <p className="mt-6 text-[11.5px] text-ink-3">
              Odds shown before you spin · Token values go up and down
            </p>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
