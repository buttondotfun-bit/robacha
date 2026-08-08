"use client";

import { ArrowRight } from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { SectionHeader, PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { machineBySlug } from "@/data/machines";
import { RARITY_LABEL } from "@/lib/constants";
import { STOCK_POOL_ID, isStockMachineLive } from "@/lib/config";
import { PoolProvider } from "@/lib/pool-context";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";

/**
 * The Stock Pool, in the pools directory.
 *
 * Reads the live tokenized-stock pool (pool 2) through PoolProvider, so it shows
 * the same real state the Stock Machine spins — assets, tier odds, inventory —
 * all from the contract. Renders nothing until the machine is actually live, so
 * the directory never lists a pool that doesn't exist.
 */
export function StockPoolCard() {
  if (!isStockMachineLive || STOCK_POOL_ID === null) return null;
  return (
    <PoolProvider poolId={STOCK_POOL_ID}>
      <StockPoolInner />
    </PoolProvider>
  );
}

function StockPoolInner() {
  const { pool } = usePool();
  const machine = machineBySlug("tokenized-stocks");
  const tokens = pool ? [...new Set(pool.entries.map((e) => e.token.toLowerCase()))] : [];
  const market = useTokenMarket(tokens);
  const assetCount = tokens.length;

  return (
    <section className="relative py-6">
      <PageContainer width="wide">
        <SectionHeader eyebrow="Live now" title="The Stock Pool." className="mb-5" />
        <div className="glass-panel glass-reflection relative overflow-hidden rounded-[26px] p-6 sm:p-7">
          <span className="noise-overlay" aria-hidden="true" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <span className="micro text-accent-ink">Live · drawn by {machine?.name ?? "Stock Machine"}</span>
              <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">{pool?.name || "Stock Pool"}</h3>
              <p className="mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-2">
                Tokenized-stock rewards on Robinhood Chain — {assetCount > 0 ? `${assetCount} assets, ` : ""}published odds, drawn onchain. Not investment advice.
              </p>

              {pool && pool.tiers.length ? (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
                  {pool.tiers.map((t) => (
                    <span key={t.index} className="num">
                      {RARITY_LABEL[t.rarity]} <span className="text-ink">{Math.round(t.probabilityPercent)}%</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[12.5px] text-ink-3">Live pool data loads from the contract.</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href="/machines/tokenized-stocks" variant="primary" size="md">
                  Spin the Stock Machine <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              </div>
            </div>

            {/* Asset preview */}
            <div>
              {tokens.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tokens.map((addr) => (
                    <span key={addr} className="glass-chip inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3">
                      <span className="h-6 w-6 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.7)] [container-type:inline-size]">
                        <TokenAvatar address={addr} symbol={market.get(addr)?.symbol ?? null} logoUrl={market.get(addr)?.logoUrl} size={24} rounded="none" />
                      </span>
                      <span className="num text-[11.5px] font-medium text-ink">{market.get(addr)?.symbol ?? "token"}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="glass-card grid h-24 place-items-center rounded-[16px] text-[12.5px] text-ink-3">Loading pool assets…</div>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
