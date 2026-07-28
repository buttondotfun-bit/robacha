"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { WalletHistory } from "@/app/api/wallet/[address]/history/route";

/**
 * Everything this wallet has put in and taken out.
 *
 * Deliberately a separate read from `useWalletRewards`: that one answers "what
 * can I claim right now" and is allowed to be empty, while this one answers
 * "what has this cost me" and must never under-report. If the chain read fails
 * the hook reports unavailable rather than zero — a zero here would read as
 * "you have spent nothing", which is the one wrong answer that matters.
 */
export function useWalletHistory() {
  const { address, isConnected } = useAccount();

  const query = useQuery({
    queryKey: ["robacha", "wallet-history", address?.toLowerCase() ?? null],
    enabled: Boolean(address) && isConnected,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/wallet/${address}/history`, {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("history unavailable");
      return (await response.json()) as WalletHistory;
    },
  });

  return {
    history: query.data ?? null,
    isLoading: query.isPending && Boolean(address) && isConnected,
    unavailable: query.isError,
    refetch: () => void query.refetch(),
  };
}
