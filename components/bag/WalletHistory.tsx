"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { formatEther, formatUnits } from "viem";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { Button } from "@/components/ui/Button";
import { chainConfig } from "@/lib/config";
import { formatAmount } from "@/lib/formatters";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWalletHistory } from "@/lib/use-wallet-history";

/**
 * "What has this cost me, and what did I get?"
 *
 * Nobody could answer that before. It is the least flattering panel on the
 * site, which is the reason it belongs here rather than the reason to leave it
 * out — a product taking real money should make its own bill easy to read.
 *
 * Deliberately no single net-profit figure. Money in is denominated in
 * ETH; prizes are tokens, and some of them have no reliably priced market. A
 * combined number would have to invent an exchange rate for the unpriced ones,
 * and a confident wrong total is worse here than two honest columns. Where a
 * token cannot be priced, this says so on that row instead of quietly treating
 * it as zero — or, worse, as whatever makes the total look better.
 */
export function WalletHistory() {
  const { history, isLoading, unavailable, refetch } = useWalletHistory();
  const market = useTokenMarket(history?.rewards.map((r) => r.token) ?? []);

  if (unavailable) {
    return (
      <section className="glass-panel rounded-[24px] p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-[13.5px] font-semibold">Your history is unavailable</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              The chain could not be read just now, so this is showing nothing
              rather than a total that might be too low.
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (isLoading || !history) {
    return (
      <section className="glass-panel rounded-[24px] p-5">
        <p className="text-[12.5px] text-ink-3">Reading your history…</p>
      </section>
    );
  }

  if (history.spins === 0) {
    return null;
  }

  const paid = BigInt(history.paidBaseWei) + BigInt(history.paidSurchargeWei);
  const refunded = BigInt(history.refundedWei);
  const pending = BigInt(history.pendingRefundWei);
  const net = paid - refunded;

  const eth = (wei: bigint) => `${Number(formatEther(wei)).toFixed(5)} ${chainConfig.nativeSymbol}`;

  return (
    <section>
      <header className="mb-3">
        <h2 className="text-section-title text-[19px]">Your history</h2>
        <p className="mt-1 text-[12.5px] text-ink-2">
          Everything this wallet has spent and won, read straight from the
          chain.
        </p>
      </header>

      <div className="glass-panel rounded-[24px] p-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Stat label="Spins bought" value={String(history.spins)} />
          <Stat
            label="Rounds joined"
            value={String(history.rounds)}
          />
          <Stat label="Paid in" value={eth(paid)} />
          <Stat
            label={refunded > 0n ? "Paid, after refunds" : "Refunded"}
            value={refunded > 0n ? eth(net) : eth(0n)}
          />
        </dl>

        {pending > 0n ? (
          <p className="mt-4 rounded-[14px] bg-accent-soft px-3.5 py-2.5 text-[12.5px] text-accent-ink">
            {eth(pending)} is refundable and waiting for you to withdraw it.
          </p>
        ) : null}

        <div className="mt-5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
          <p className="micro mb-3">
            Prizes won ({history.rewardCount})
            {history.unclaimedCount > 0 ? ` · ${history.unclaimedCount} unclaimed` : ""}
          </p>

          {history.rewards.length === 0 ? (
            <p className="text-[12.5px] text-ink-3">
              Nothing yet. Prizes appear once a round settles.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.rewards.map((row) => {
                const meta = market.get(row.token);
                const decimals = 18;
                const amount = Number(formatUnits(BigInt(row.amountRaw), decimals));
                // Only priced when the market data is actually trustworthy.
                // An unreliable price is treated the same as no price.
                const priced =
                  meta?.price != null && meta.priceReliable ? amount * meta.price : null;

                return (
                  <li
                    key={row.token}
                    className="flex items-center gap-3 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-3 py-2.5"
                  >
                    <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                      <TokenAvatar
                        address={row.token}
                        symbol={meta?.symbol ?? null}
                        logoUrl={meta?.logoUrl ?? null}
                        size={32}
                        rounded="none"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="num truncate text-[13px] font-semibold">
                        {formatAmount(amount)} {meta?.symbol ?? ""}
                      </p>
                      <p className="text-[11px] text-ink-3">
                        {row.count} {row.count === 1 ? "prize" : "prizes"}
                      </p>
                    </div>
                    <p className="num shrink-0 text-right text-[12.5px]">
                      {priced !== null ? (
                        <span className="font-semibold">${priced.toFixed(2)}</span>
                      ) : (
                        <span className="text-ink-3" title={meta?.unavailableReason ?? undefined}>
                          no reliable price
                        </span>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
            Money in is shown in {chainConfig.nativeSymbol}; prizes are tokens,
            so the two are not added together. Token values move, and a token
            with no liquid market has no dependable price at all.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="micro">{label}</dt>
      <dd className="num mt-1 text-[15px] font-semibold tracking-[-0.02em]">{value}</dd>
    </div>
  );
}
