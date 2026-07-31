"use client";

import { LightField } from "@/components/shared/AmbientBackground";
import { RarityDistribution } from "@/components/shared/RarityDistribution";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { RARITY_LABEL, RARITY_ORDER } from "@/lib/constants";
import { formatPercent } from "@/lib/formatters";
import { usePool } from "@/lib/use-pool";
import { cn } from "@/lib/utils";

/**
 * How Robacha rarity works, and — once a pool is live — the odds that pool
 * actually publishes.
 *
 * Rarity is a presentation label derived from each tier's probability rank in
 * the contract, so the explanation below is always true, while the numbers only
 * appear when a real pool is readable.
 */
export function RewardTiers() {
  const { pool } = usePool();

  const bands = pool
    ? pool.tiers.map((tier) => ({
        rarity: tier.rarity,
        label: RARITY_LABEL[tier.rarity],
        probability: tier.probabilityPercent,
      }))
    : [];

  return (
    <section className="relative py-16 sm:py-20">
      <LightField tone="cool" size={760} className="left-[6%] top-0 opacity-60" />
      <LightField
        tone="gold"
        size={620}
        className="bottom-[6%] right-[4%] opacity-70"
      />

      <PageContainer width="wide" className="relative">
        <SectionHeader
          eyebrow="Reward tiers"
          title="Some pulls are rarer than others."
          description="Every pool sorts its prizes into tiers. The harder something is to pull, the rarer we call it — and you can see the exact chance of each one before you spend anything."
          className="mb-10"
        />

        {bands.length ? (
          <div className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[28px] p-6 sm:p-8">
            <span className="noise-overlay" aria-hidden="true" />
            <div className="relative">
              <p className="micro mb-4">
                Published odds · pool #{pool?.poolId}
              </p>
              <RarityDistribution bands={bands} height={14} />

              <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pool?.tiers.map((tier) => (
                  <li
                    key={tier.index}
                    data-rarity={tier.rarity}
                    className="rarity-glass glass-highlight relative overflow-hidden rounded-[20px] p-5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-semibold">
                        {RARITY_LABEL[tier.rarity]}
                      </p>
                      <p className="num text-[22px] font-semibold leading-none tracking-[-0.03em]">
                        {formatPercent(tier.probabilityPercent, 2)}
                      </p>
                    </div>
                    <p className="mt-2 text-[12.5px] text-ink-2">
                      {tier.entries.length}{" "}
                      {tier.entries.length === 1 ? "prize" : "prizes"}{" "}
                      in this tier
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-6 sm:p-8">
            <span className="noise-overlay" aria-hidden="true" />
            <div className="relative">
              <p className="micro mb-5">How the labels are assigned</p>
              <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {RARITY_ORDER.map((rarity, index) => (
                  <li
                    key={rarity}
                    data-rarity={rarity}
                    className={cn(
                      "rarity-glass glass-highlight relative overflow-hidden rounded-[20px] p-4",
                    )}
                  >
                    <span
                      className="rarity-dot mb-3 block h-1.5 w-8 rounded-full"
                      aria-hidden="true"
                    />
                    <p className="text-[14px] font-semibold">
                      {RARITY_LABEL[rarity]}
                    </p>
                    <p className="num mt-1 text-[11.5px] text-ink-3">
                      Rarity rank {RARITY_ORDER.length - index}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-6 max-w-[60ch] text-[13px] leading-relaxed text-ink-2">
                Exact percentages come from the live pool contract. They are
                published here the moment a pool is active, and cannot change
                once that pool has taken its first paid spin.
              </p>
            </div>
          </div>
        )}
      </PageContainer>
    </section>
  );
}
