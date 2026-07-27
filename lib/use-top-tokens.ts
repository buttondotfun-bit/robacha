"use client";

import { useQuery } from "@tanstack/react-query";
import type { RobinhoodToken } from "@/lib/server/robinhood-tokens";

/**
 * The top tokens on Robinhood Chain by market cap.
 *
 * Ecosystem data, independent of pool state — this is what the chain looks
 * like, not what is currently spinnable. The server holds a last-good copy, so
 * a transient upstream failure keeps returning the previous list rather than
 * emptying the surface.
 */
export function useTopTokens(limit = 12) {
  const query = useQuery({
    queryKey: ["robacha", "top-tokens", limit],
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 2,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/tokens/top?limit=${limit}`, { signal });
      if (!response.ok) throw new Error("top tokens unavailable");
      return (await response.json()) as {
        tokens: RobinhoodToken[];
        fetchedAt: number | null;
        stale: boolean;
      };
    },
  });

  return {
    tokens: query.data?.tokens ?? [],
    isLoading: query.isPending,
    isError: query.isError,
  };
}
