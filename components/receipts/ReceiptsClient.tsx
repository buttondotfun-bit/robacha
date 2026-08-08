"use client";

import Link from "next/link";
import { formatEther, formatUnits } from "viem";
import { ArrowRight, Check, Clock, Receipt, Wallet } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { useWalletRewards } from "@/lib/use-wallet-rewards";
import { formatAmount, shortAddress } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * A wallet's Robacha receipts — a plain-language ledger of what it has spent and
 * pulled, assembled from two on-chain reads: WalletHistory for the totals (never
 * under-reports what a wallet has paid) and WalletRewards for the itemised pulls
 * (from the indexer). The two degrade independently: totals can show while the
 * itemised list is unavailable, and both say so honestly rather than showing a
 * zero that would read as "you've done nothing".
 */

function eth(wei: string, digits = 4): string {
  try {
    const v = Number(formatEther(BigInt(wei)));
    if (v === 0) return "0";
    if (v < 0.0001) return "<0.0001";
    return v.toLocaleString(undefined, { maximumFractionDigits: digits });
  } catch {
    return "—";
  }
}

export function ReceiptsClient() {
  const wallet = useWallet();
  const { history, isLoading: histLoading, unavailable: histDown } = useWalletHistory();
  const { rewards, unavailable: rewardsDown, isLoading: rewardsLoading } = useWalletRewards();

  if (!wallet.isConnected) {
    return (
      <PageContainer width="wide" className="pb-24 pt-8">
        <h1 className="text-page-title">Your receipts</h1>
        <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
          A plain-language record of everything you&rsquo;ve spent and pulled on
          Robacha, read from the chain. Connect a wallet to see yours.
        </p>
        <div className="mt-6">
          <Button variant="primary" size="md" onClick={() => void wallet.connect()} disabled={wallet.isConnecting}>
            <Wallet className="h-4 w-4" aria-hidden="true" /> Connect wallet
          </Button>
        </div>
      </PageContainer>
    );
  }

  const paidWei = history ? (BigInt(history.paidBaseWei) + BigInt(history.paidSurchargeWei)).toString() : null;
  const sortedRewards = [...rewards].sort((a, b) => b.roundId - a.roundId);

  return (
    <PageContainer width="wide" className="pb-20 pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
          <Receipt className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> Read live from chain
        </span>
        {wallet.address ? (
          <span className="num glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-ink-2">{shortAddress(wallet.address, 4)}</span>
        ) : null}
      </div>
      <h1 className="text-page-title mt-4">Your receipts</h1>
      <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-ink-2">
        Everything you&rsquo;ve put into the machine and pulled out of it — the
        real ledger, not a summary we typed up.
      </p>

      {/* Summary */}
      {histDown || !history ? (
        <div className="mt-8 glass-card rounded-[18px] p-6 text-[13px] text-ink-3">
          {histLoading ? "Loading your totals…" : "Your spend totals are temporarily unreachable — they read straight from the chain. Try again shortly."}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric value={String(history.spins)} label="Spins" />
          <Metric value={`${paidWei ? eth(paidWei) : "—"} ETH`} label="Paid in" />
          <Metric value={`${eth(history.refundedWei)} ETH`} label="Refunded" />
          <Metric value={String(history.rewardCount)} label="Rewards" accent />
        </div>
      )}

      {/* Itemised ledger */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Pulls</h2>
          {history && history.unclaimedCount > 0 ? (
            <Link href="/bag" className="text-[12px] font-medium text-accent-ink hover:underline">
              {history.unclaimedCount} unclaimed →
            </Link>
          ) : null}
        </div>

        {rewardsDown ? (
          <div className="mt-4 glass-card rounded-[18px] p-6 text-[13px] text-ink-3">
            {rewardsDown === "indexer-behind"
              ? "The indexer is catching up — your most recent pulls may not be listed yet."
              : rewardsDown === "not-configured"
                ? "The pull-by-pull ledger needs the indexer, which isn't configured in this environment. Your totals above still read live from the chain."
                : "The itemised pull ledger is temporarily unavailable. Your totals above are unaffected."}
          </div>
        ) : rewardsLoading && rewards.length === 0 ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />
            ))}
          </div>
        ) : sortedRewards.length === 0 ? (
          <div className="mt-4 glass-card rounded-[18px] p-8 text-center">
            <p className="text-[14px] font-medium">No pulls yet.</p>
            <p className="mt-1 text-[12.5px] text-ink-2">Spin the machine and your rewards land here.</p>
            <Link href="/app" className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(186,232,0,0.98))] px-5 text-[13px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)]">
              Spin the machine <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[rgb(var(--line-rgb)_/_0.08)] overflow-hidden rounded-[18px] glass-card">
            {sortedRewards.map((r) => {
              const amount = r.decimals != null ? formatAmount(Number(formatUnits(BigInt(r.amountRaw), r.decimals))) : null;
              return (
                <li key={r.rewardId} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-ink">
                      {amount ?? "—"} {r.symbol ?? "token"}
                    </p>
                    <p className="num mt-0.5 text-[11.5px] text-ink-3">
                      Round #{r.roundId} · Tier {r.tierIndex + 1}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium",
                      r.claimed ? "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]" : "bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3",
                    )}
                  >
                    {r.claimed ? <Check className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
                    {r.claimed ? "Claimed" : "Unclaimed"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <p className={cn("num text-[22px] font-semibold tracking-[-0.02em]", accent && "text-accent-ink")}>{value}</p>
      <p className="micro mt-1 text-ink-3">{label}</p>
    </div>
  );
}
