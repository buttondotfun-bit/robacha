"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { WalletReward, WalletRewardsResponse } from "@/types/reward";

export type RewardsUnavailable =
  | "not-configured"
  | "indexer-unavailable"
  | "indexer-behind"
  | null;

class RewardsUnavailableError extends Error {
  constructor(readonly reason: Exclude<RewardsUnavailable, null>) {
    super(reason);
    this.name = "RewardsUnavailableError";
  }
}

/**
 * Robacha rewards assigned to the connected wallet.
 *
 * Served by the indexer from `RewardAssigned` / `RewardClaimed` logs and
 * reconciled against contract state. An empty bag and an unreachable indexer
 * are different conditions and are reported differently.
 */
export function useWalletRewards() {
  const { address, isConnected } = useAccount();

  const query = useQuery({
    queryKey: ["robacha", "wallet-rewards", address ?? ""],
    enabled: Boolean(address) && isConnected,
    retry: false,
    refetchInterval: 45_000,
    queryFn: async ({ signal }): Promise<WalletRewardsResponse> => {
      const response = await fetch(`/api/wallet/${address}/rewards`, {
        signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          reason?: Exclude<RewardsUnavailable, null>;
        } | null;
        throw new RewardsUnavailableError(
          body?.reason ?? "indexer-unavailable",
        );
      }

      return (await response.json()) as WalletRewardsResponse;
    },
  });

  const unavailable: RewardsUnavailable = query.error
    ? query.error instanceof RewardsUnavailableError
      ? query.error.reason
      : "indexer-unavailable"
    : query.data && !query.data.synced
      ? "indexer-behind"
      : null;

  const rewards: WalletReward[] =
    query.data && query.data.synced ? query.data.rewards : [];

  return {
    rewards,
    unclaimed: rewards.filter((reward) => !reward.claimed),
    unavailable,
    isLoading: query.isPending && Boolean(address) && isConnected,
    refetch: () => void query.refetch(),
  };
}
