"use client";

import { useReadContracts } from "wagmi";
import { ROBACHA_POOL_REGISTRY_ABI } from "@/lib/abi";
import { LINEUP, type LineupToken } from "@/data/lineup";
import { chainConfig, contracts } from "./config";

/**
 * Whether each lined-up token is actually listed on the registry yet.
 *
 * "Listed on Robacha" is not a marketing phrase — it is `allowlistedTokens()`
 * returning true, which anyone can check themselves. So it is read from the
 * contract rather than asserted in a data file, and a token that has not been
 * allowlisted says so plainly instead of being described as listed because we
 * intend to list it.
 */
export interface LineupStatus extends LineupToken {
  /** True only when the registry says so. Null while unknown. */
  allowlisted: boolean | null;
}

export function useLineup(): { tokens: LineupStatus[]; isLoading: boolean } {
  const registry = contracts.poolRegistry ?? undefined;
  const enabled = Boolean(registry) && LINEUP.length > 0;

  const query = useReadContracts({
    allowFailure: true,
    query: { enabled, refetchInterval: 120_000 },
    contracts: enabled
      ? LINEUP.map((token) => ({
          address: registry!,
          abi: ROBACHA_POOL_REGISTRY_ABI,
          functionName: "allowlistedTokens" as const,
          args: [token.address] as const,
          chainId: chainConfig.id,
        }))
      : [],
  });

  return {
    tokens: LINEUP.map((token, index) => {
      const result = query.data?.[index];
      return {
        ...token,
        // A failed read is unknown, not false — and certainly not true.
        allowlisted:
          result?.status === "success" ? Boolean(result.result) : null,
      };
    }),
    isLoading: enabled && query.isLoading,
  };
}
