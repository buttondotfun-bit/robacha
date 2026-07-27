"use client";

import { useQuery } from "@tanstack/react-query";
import type { TokenMarket } from "@/app/api/tokens/route";

/**
 * Logos, prices and liquidity for a set of reward tokens, keyed by contract
 * address.
 *
 * One request covers every token on screen, so a pool of any size costs a
 * single round trip. Results are returned as a lookup keyed by lowercase
 * address; a token the upstream index has never seen simply resolves to
 * `undefined` and the caller falls back to the generated avatar.
 */
export function useTokenMarket(addresses: readonly string[]) {
  const key = [...new Set(addresses.map((a) => a.toLowerCase()))].sort();

  const query = useQuery({
    queryKey: ["robacha", "token-market", key.join(",")],
    enabled: key.length > 0,
    // Market data moves, but not so fast that a reward grid needs to chase it.
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/tokens?addresses=${key.join(",")}`, {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("token market unavailable");
      const body = (await response.json()) as {
        tokens: TokenMarket[];
        minLiquidityUsd: number;
      };
      return body;
    },
  });

  const byAddress = new Map<string, TokenMarket>();
  for (const token of query.data?.tokens ?? []) {
    byAddress.set(token.address.toLowerCase(), token);
  }

  return {
    /** Look a token up by contract address. Undefined when unresolved. */
    get: (address: string): TokenMarket | undefined =>
      byAddress.get(address.toLowerCase()),
    minLiquidityUsd: query.data?.minLiquidityUsd ?? null,
    isLoading: query.isPending && key.length > 0,
    isError: query.isError,
  };
}
