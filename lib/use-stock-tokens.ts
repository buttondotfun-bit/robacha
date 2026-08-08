"use client";

import { useQuery } from "@tanstack/react-query";
import type { StockToken } from "@/app/api/stock-tokens/route";

/**
 * The real tokenized-stock catalogue live on Robinhood Chain, from our cached
 * proxy of Robinhood's public asset API. Used only to show what genuinely
 * trades on-chain today — never presented as a Robacha pool or reward lineup.
 * On failure it resolves to an empty list so the caller shows honest copy.
 */
export function useStockTokens() {
  const query = useQuery({
    queryKey: ["robacha", "stock-tokens"],
    // The catalogue barely moves; the route caches for an hour anyway.
    staleTime: 30 * 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/stock-tokens", { signal });
      if (!res.ok) throw new Error("stock tokens unavailable");
      return (await res.json()) as { ok: boolean; total: number; tokens: StockToken[] };
    },
  });

  return {
    tokens: query.data?.tokens ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError || query.data?.ok === false,
  };
}
