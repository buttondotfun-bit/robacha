"use client";

import { useQuery } from "@tanstack/react-query";
import type { CollectionStats } from "@/app/api/collection/[address]/route";

/**
 * On-chain provenance for an NFT collection (holders, supply, contract-verified,
 * scam flag), from our cached Blockscout proxy. A real collection's numbers are
 * a legitimacy signal a counterfeit can't fake. Resolves to nulls on failure so
 * the caller shows "unavailable", never a fabricated figure.
 */
export function useCollectionStats(address: string | null | undefined) {
  const query = useQuery({
    queryKey: ["robacha", "collection-stats", address?.toLowerCase() ?? null],
    enabled: Boolean(address),
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/collection/${address}`, { signal });
      if (!res.ok) throw new Error("collection stats unavailable");
      return (await res.json()) as CollectionStats;
    },
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError || query.data?.ok === false,
  };
}
