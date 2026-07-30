"use client";

import { RefreshCw, Users } from "lucide-react";
import { formatEther } from "viem";
import { StatCard } from "@/components/shared/primitives";
import { Button } from "@/components/ui/Button";
import { chainConfig } from "@/lib/config";
import { useAnalytics } from "@/lib/use-analytics";

/**
 * How many distinct people have actually used each pool version.
 *
 * Spin counts were already visible and are a poor proxy for reach: thirty spins
 * from six wallets and thirty from thirty are the same number describing very
 * different situations. Everything here counts wallets, not events, so the two
 * cannot be confused.
 *
 * Wallet addresses are not shown and are not needed — only counts. Nothing here
 * profiles anyone; a "participant" is an address that appears in a log the
 * contract emitted, and it links to nothing off chain.
 *
 * Version rows are kept separate rather than summed into one pool total,
 * because a version is where the economics live: v2 and v3 have different
 * prizes and different odds, and merging them would hide exactly the comparison
 * that makes the numbers worth reading.
 */
export function PoolAnalytics() {
  const { analytics, isLoading, unavailable, refetch } = useAnalytics();

  if (unavailable) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-3">
          Couldn&rsquo;t read the chain, so no figures are shown — a partial
          count here would get quoted as if it were the real one.
        </p>
        <Button variant="secondary" size="md" onClick={refetch}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !analytics) {
    return <p className="text-[13px] text-ink-3">Walking the log history…</p>;
  }

  const { totals, pools, distribution } = analytics;
  const eth = (wei: string) =>
    `${Number(formatEther(BigInt(wei))).toFixed(4)} ${chainConfig.nativeSymbol}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="People, all time"
          value={String(totals.participants)}
          hint="Distinct wallets that have spun"
          icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
          emphasis
        />
        <StatCard
          label="Came back"
          value={String(totals.repeatWallets)}
          hint={
            totals.participants > 0
              ? `${Math.round((totals.repeatWallets / totals.participants) * 100)}% spun more than once`
              : undefined
          }
        />
        <StatCard label="Spins" value={String(totals.spins)} hint={`across ${totals.rounds} rounds`} />
        <StatCard label="Taken in" value={eth(totals.paidWei)} hint="Before refunds" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Prizes given" value={String(totals.prizes)} />
        <StatCard
          label="Prizes claimed"
          value={String(totals.claimed)}
          hint={
            totals.prizes > 0
              ? `${totals.prizes - totals.claimed} still unclaimed`
              : undefined
          }
        />
        <StatCard label="Refunded" value={eth(totals.refundedWei)} />
        <StatCard
          label="Wallets refunded"
          value={String(totals.refundedWallets)}
          hint="Rounds that could not pay"
        />
      </div>

      {/* Per version, because the economics differ between them. */}
      <div>
        <p className="micro mb-2">By pool version</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[12.5px]">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="pb-2 font-medium">Pool</th>
                <th className="pb-2 text-right font-medium">People</th>
                <th className="pb-2 text-right font-medium">Returning</th>
                <th className="pb-2 text-right font-medium">Spins</th>
                <th className="pb-2 text-right font-medium">Rounds</th>
                <th className="pb-2 text-right font-medium">Winners</th>
                <th className="pb-2 text-right font-medium">Prizes</th>
                <th className="pb-2 text-right font-medium">Taken in</th>
                <th className="pb-2 text-right font-medium">Last spin</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool, index) => (
                <tr
                  key={`${pool.poolId}-${pool.version}`}
                  className="border-t border-[rgba(20,24,18,0.07)]"
                >
                  <td className="py-2.5">
                    <span className="num font-medium text-ink">
                      #{pool.poolId} v{pool.version}
                    </span>
                    {index === 0 ? (
                      <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent-ink">
                        live
                      </span>
                    ) : null}
                  </td>
                  <td className="num py-2.5 text-right font-semibold text-ink">
                    {pool.participants}
                  </td>
                  <td className="num py-2.5 text-right text-ink-2">{pool.returning}</td>
                  <td className="num py-2.5 text-right text-ink-2">{pool.spins}</td>
                  <td className="num py-2.5 text-right text-ink-2">{pool.rounds}</td>
                  <td className="num py-2.5 text-right text-ink-2">{pool.winners}</td>
                  <td className="num py-2.5 text-right text-ink-2">{pool.prizes}</td>
                  <td className="num py-2.5 text-right text-ink-2">{eth(pool.paidWei)}</td>
                  <td className="num py-2.5 text-right text-ink-3">
                    {pool.lastSpinAt
                      ? new Date(pool.lastSpinAt * 1000).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          Per-version people counts add up to more than the all-time total,
          because the same wallet can appear in several versions and is only
          counted once overall.
        </p>
      </div>

      {/* A handful of heavy users and a broad base look identical in a total. */}
      <div>
        <p className="micro mb-2">Spins per wallet</p>
        <ul className="space-y-1.5">
          {distribution.map((bucket) => {
            const share =
              totals.participants > 0 ? (bucket.wallets / totals.participants) * 100 : 0;
            return (
              <li key={bucket.label} className="flex items-center gap-3">
                <span className="num w-14 shrink-0 text-[11.5px] text-ink-2">
                  {bucket.label}
                </span>
                <span
                  className="h-2 rounded-full bg-[rgba(204,255,0,0.55)]"
                  style={{ width: `${Math.max(share, bucket.wallets > 0 ? 3 : 0)}%` }}
                  aria-hidden="true"
                />
                <span className="num text-[11.5px] text-ink-3">
                  {bucket.wallets} {bucket.wallets === 1 ? "wallet" : "wallets"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-3">
        Counted from contract logs at block {analytics.headBlock.toLocaleString()}.
        No cookies, no sessions, no identities — a participant is a wallet
        address the contract emitted, and nothing here links one to a person.
      </p>
    </div>
  );
}
