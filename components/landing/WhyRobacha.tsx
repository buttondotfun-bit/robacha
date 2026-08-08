"use client";

import { LightField } from "@/components/shared/AmbientBackground";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { RARITY_LABEL } from "@/lib/constants";
import { chainConfig } from "@/lib/config";
import { formatPercent } from "@/lib/formatters";
import { usePool } from "@/lib/use-pool";
import { useTopTokens } from "@/lib/use-top-tokens";
import { TokenAvatar } from "@/components/brand/TokenAvatar";

/**
 * Asymmetric bento. Each card carries its own drawn visual rather than a
 * generic icon, so the four benefits read as four different ideas.
 */
export function WhyRobacha() {
  const { pool } = usePool();
  const tiers = pool?.tiers ?? [];

  return (
    <section className="relative py-11 sm:py-14">
      <LightField
        tone="pink"
        size={700}
        className="left-[2%] top-[16%] opacity-70"
      />

      <PageContainer width="wide" className="relative">
        <SectionHeader
          eyebrow="Why ROBACHA"
          title="A discovery machine, not a lottery."
          className="mb-10"
        />

        <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
          {/* 1 — Large: discovery, shown as a token orbit */}
          <article className="glass-card glass-reflection glass-highlight glass-spotlight relative overflow-hidden rounded-[26px] p-7 lg:col-span-2">
            <div className="relative z-10 max-w-[34ch]">
              <h3 className="text-[22px] font-semibold tracking-[-0.03em]">
                Discover emerging memes
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                Every spin can turn up a coin you’d never have gone looking
                for on your own.
              </p>
              {pool ? (
                <p className="num mt-6 text-[11.5px] text-ink-3">
                  {pool.entries.length} prizes in the pool right now
                </p>
              ) : null}
            </div>
            <TokenOrbit />
          </article>

          {/* 2 — Tall: real rewards, shown as a capsule dispensing */}
          <article className="glass-card glass-reflection glass-highlight relative overflow-hidden rounded-[26px] p-7 lg:row-span-2">
            <h3 className="text-[19px] font-semibold tracking-[-0.03em]">
              Real coins, not points
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
              What you win lands in your wallet as real tokens you can keep,
              send or sell.
            </p>

            <RewardCapsule />

            <p className="num mt-6 text-[11.5px] text-ink-3">
              Sent to you on {chainConfig.name}
            </p>
          </article>

          {/* 3 — Wide: transparent odds, shown as the live distribution */}
          <article className="glass-card glass-reflection glass-highlight relative overflow-hidden rounded-[26px] p-7">
            <h3 className="text-[19px] font-semibold tracking-[-0.03em]">
              You see the odds first
            </h3>
            <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-ink-2">
              Every chance is on the table before you spend anything — never
              hidden behind the reveal.
            </p>

            {tiers.length ? (
              <ul className="mt-6 space-y-2">
                {tiers.map((tier) => (
                  <li
                    key={tier.index}
                    data-rarity={tier.rarity}
                    className="flex items-center gap-2.5"
                  >
                    <span className="w-[68px] shrink-0 text-[11px] text-ink-2">
                      {RARITY_LABEL[tier.rarity]}
                    </span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)]">
                      <span
                        className="rarity-dot block h-full rounded-full"
                        style={{ width: `${tier.probabilityPercent}%` }}
                      />
                    </span>
                    <span className="num w-[34px] shrink-0 text-right text-[11px] text-ink">
                      {formatPercent(tier.probabilityPercent, 0)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-[12.5px] leading-relaxed text-ink-3">
                Exact odds show up here as soon as a pool is running.
              </p>
            )}
          </article>

          {/* 4 — Compact: network, shown as a signal pulse */}
          <article className="glass-card glass-reflection glass-highlight relative overflow-hidden rounded-[26px] p-7">
            <NetworkPulse />
            <h3 className="relative mt-5 text-[19px] font-semibold tracking-[-0.03em]">
              Built for {chainConfig.name}
            </h3>
            <p className="relative mt-3 text-[14px] leading-relaxed text-ink-2">
              Everything lives on the chain — the prizes, the draw, and the
              coins you win.
            </p>
            <p className="num relative mt-6 text-[11.5px] text-ink-3">
              Chain ID {chainConfig.id}
            </p>
          </article>
        </div>
      </PageContainer>
    </section>
  );
}

/**
 * The chain's top tokens, orbiting a core — the discovery idea, made literal.
 *
 * Always populated from live Robinhood Chain data (ranked by market cap,
 * stablecoins and wrapped assets excluded), independent of whether a reward
 * pool is open. This is the ecosystem ROBACHA draws from, not the pool itself,
 * so nothing here implies a token is currently spinnable.
 */
function TokenOrbit() {
  const { tokens } = useTopTokens(8);

  // Fixed positions so the ring never reflows as data lands.
  const positions = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-16 -top-10 hidden h-[340px] w-[340px] sm:block"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.18),transparent_66%)]" />
      <div className="absolute inset-[8%] rounded-full border border-[rgb(var(--ink-rgb)_/_0.06)]" />
      <div className="absolute inset-[24%] rounded-full border border-dashed border-[rgb(var(--ink-rgb)_/_0.07)]" />

      <div className="orbit-slow absolute inset-0">
        {positions.map((index) => {
          const token = tokens[index];
          const angle = (index / positions.length) * Math.PI * 2;
          const radius = 42;
          return (
            <span
              key={index}
              className="glass-card absolute h-11 w-11 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.85)] shadow-[0_6px_16px_-8px_rgb(var(--ink-rgb)_/_0.5)] [container-type:inline-size]"
              style={{
                // Fixed precision: Node and the browser serialise the same float
                // differently, which React reports as a hydration mismatch.
                left: `${(50 + Math.cos(angle) * radius).toFixed(3)}%`,
                top: `${(50 + Math.sin(angle) * radius).toFixed(3)}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {token ? (
                <TokenAvatar
                  address={token.address}
                  symbol={token.symbol}
                  logoUrl={token.iconPath}
                  size={44}
                  rounded="full"
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The gacha ball releasing a token — the reward idea, drawn from the brand mark. */
function RewardCapsule() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto my-8 h-[190px] w-full max-w-[220px]"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(255,119,172,0.24),transparent_62%)]" />

      <svg viewBox="0 0 200 190" className="relative h-full w-full">
        <defs>
          <linearGradient id="rc-shell" x1="0.22" y1="0.08" x2="0.78" y2="0.96">
            <stop offset="0" stopColor="#FCD8EA" />
            <stop offset="0.46" stopColor="#F8B7D8" />
            <stop offset="1" stopColor="#F09CC7" />
          </linearGradient>
          <linearGradient id="rc-btn" x1="0.25" y1="0.15" x2="0.8" y2="0.9">
            <stop offset="0" stopColor="#C3E84A" />
            <stop offset="1" stopColor="#8CC318" />
          </linearGradient>
        </defs>

        {/* The ball, at the same proportions as the brand mark */}
        <g transform="translate(38 8) scale(1.24)">
          <circle
            cx="50"
            cy="50"
            r="40.5"
            fill="url(#rc-shell)"
            stroke="#C4457F"
            strokeWidth="5.2"
          />
          <path
            d="M11.5 51.2 Q50 55.4 88.5 51.2"
            fill="none"
            stroke="#C4457F"
            strokeWidth="4.4"
            strokeLinecap="round"
          />
          <g fill="#ffffff">
            <ellipse
              cx="31.5"
              cy="33"
              rx="3.4"
              ry="8.2"
              transform="rotate(-38 31.5 33)"
              opacity="0.92"
            />
            <ellipse
              cx="40.5"
              cy="25.8"
              rx="2.7"
              ry="4.4"
              transform="rotate(-38 40.5 25.8)"
              opacity="0.92"
            />
          </g>
          <circle cx="35.2" cy="57.4" r="12.4" fill="#3A3A3C" />
          <circle cx="35.2" cy="57.4" r="9" fill="url(#rc-btn)" />
          <circle cx="32.2" cy="54.2" r="3.1" fill="#EAF8A4" opacity="0.95" />
        </g>

        {/* Dispense trail beneath it */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={100}
            cy={148 + i * 14}
            r={4 - i}
            fill="#10110f"
            opacity={0.14 - i * 0.04}
          />
        ))}
      </svg>
    </div>
  );
}

/** Concentric signal rings — the network idea, drawn. */
function NetworkPulse() {
  return (
    <div aria-hidden="true" className="relative h-16 w-16">
      <span className="absolute inset-0 rounded-full border border-[rgba(142,197,0,0.28)]" />
      <span className="absolute inset-[18%] rounded-full border border-[rgba(142,197,0,0.4)]" />
      <span className="absolute inset-[36%] rounded-full border border-[rgba(142,197,0,0.55)]" />
      <span className="pulse-dot absolute inset-[46%] rounded-full bg-[#8ec500] shadow-[0_0_14px_rgba(142,197,0,0.9)]" />
    </div>
  );
}
