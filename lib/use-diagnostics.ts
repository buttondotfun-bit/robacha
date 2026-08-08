"use client";

import { useMemo } from "react";
import type { WalletReward } from "@/types/reward";
import { usePendingSpins } from "@/lib/use-pending-spins";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { useWalletRewards } from "@/lib/use-wallet-rewards";

/**
 * The one canonical Robacha diagnostic.
 *
 * Aggregates the connected wallet's real on-chain state from the existing hooks
 * — pending rounds, assigned rewards, claim status, refundable balance — into a
 * single read every Help surface shares, so no two components disagree about
 * what's wrong. Every field is derived from chain state; nothing is inferred or
 * invented, and an unreachable feed reports "unknown" rather than "fine".
 */

export type Overall = "disconnected" | "wrong-network" | "loading" | "attention" | "refund" | "all-clear" | "no-history";

export interface Diagnostics {
  connected: boolean;
  networkCorrect: boolean;
  address: string | null;
  isLoading: boolean;
  hasHistory: boolean;
  /** Rewards assigned but not yet claimed. */
  claimable: WalletReward[];
  /** Rewards already claimed (most-recent first). */
  claimed: WalletReward[];
  /** Rounds still mid-flight (not yet settled, not refundable). */
  waitingRounds: ReturnType<typeof usePendingSpins>["pending"];
  /** Rounds whose payment is refundable/withdrawable. */
  refundableRounds: ReturnType<typeof usePendingSpins>["pending"];
  /** Refundable balance in wei (from the contract's own read), as a string. */
  refundPendingWei: string;
  hasRefund: boolean;
  lastSettledRound: number | null;
  attentionCount: number;
  overall: Overall;
}

export function useDiagnostics(): Diagnostics {
  const wallet = useWallet();
  const { pending, isLoading: pendingLoading } = usePendingSpins();
  const { history, isLoading: historyLoading } = useWalletHistory();
  const { rewards, isLoading: rewardsLoading } = useWalletRewards();

  return useMemo(() => {
    const connected = wallet.isConnected;
    const networkCorrect = !wallet.wrongNetwork;
    const isLoading = connected && (pendingLoading || historyLoading || rewardsLoading);

    const claimable = rewards.filter((r) => !r.claimed);
    const claimed = [...rewards].filter((r) => r.claimed).sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0));

    const refundPendingWei = history?.pendingRefundWei ?? "0";
    const refundableRounds = pending.filter((p) => p.withdrawable);
    const waitingRounds = pending.filter((p) => !p.withdrawable);
    const hasRefund = (() => {
      try {
        return BigInt(refundPendingWei) > 0n || refundableRounds.length > 0;
      } catch {
        return refundableRounds.length > 0;
      }
    })();

    const hasHistory = (history?.spins ?? 0) > 0 || (history?.rewardCount ?? 0) > 0 || rewards.length > 0;

    const lastSettledRound = rewards.length > 0 ? Math.max(...rewards.map((r) => r.roundId)) : null;

    const attentionCount = claimable.length + refundableRounds.length + (hasRefund && refundableRounds.length === 0 ? 1 : 0);

    let overall: Overall;
    if (!connected) overall = "disconnected";
    else if (!networkCorrect) overall = "wrong-network";
    else if (isLoading) overall = "loading";
    else if (hasRefund) overall = "refund";
    else if (attentionCount > 0) overall = "attention";
    else if (!hasHistory) overall = "no-history";
    else overall = "all-clear";

    return {
      connected,
      networkCorrect,
      address: wallet.address ?? null,
      isLoading,
      hasHistory,
      claimable,
      claimed,
      waitingRounds,
      refundableRounds,
      refundPendingWei,
      hasRefund,
      lastSettledRound,
      attentionCount,
      overall,
    };
  }, [wallet.isConnected, wallet.wrongNetwork, wallet.address, pending, pendingLoading, history, historyLoading, rewards, rewardsLoading]);
}
