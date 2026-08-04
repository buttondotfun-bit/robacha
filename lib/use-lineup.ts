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
 *
 * Tokens from another chain are not asked about at all. Calling
 * `allowlistedTokens` with a BNB Chain address would return a perfectly honest
 * `false` for a question that does not apply, and rendering that next to the
 * others would suggest it is merely awaiting approval rather than awaiting a
 * contract on this chain.
 */
export interface LineupStatus extends LineupToken {
  /**
   * True only when the registry says so, null while unknown, and null for
   * anything not on this chain — where the question is not meaningful.
   */
  allowlisted: boolean | null;
  /** False when the contract lives on another chain. */
  onThisChain: boolean;
}

export function useLineup(): { tokens: LineupStatus[]; isLoading: boolean } {
  const registry = contracts.poolRegistry ?? undefined;
  const local = LINEUP.filter((token) => (token.chain ?? "robinhood") === "robinhood");
  const enabled = Boolean(registry) && local.length > 0;

  const query = useReadContracts({
    allowFailure: true,
    query: { enabled, refetchInterval: 120_000 },
    contracts: enabled
      ? local.map((token) => ({
          address: registry!,
          abi: ROBACHA_POOL_REGISTRY_ABI,
          functionName: "allowlistedTokens" as const,
          args: [token.address] as const,
          chainId: chainConfig.id,
        }))
      : [],
  });

  return {
    tokens: LINEUP.map((token) => {
      const onThisChain = (token.chain ?? "robinhood") === "robinhood";
      if (!onThisChain) {
        return { ...token, allowlisted: null, onThisChain: false };
      }
      // Index into the filtered results, not the full list.
      const result = query.data?.[local.indexOf(token)];
      return {
        ...token,
        // A failed read is unknown, not false — and certainly not true.
        allowlisted: result?.status === "success" ? Boolean(result.result) : null,
        onThisChain: true,
      };
    }),
    isLoading: enabled && query.isLoading,
  };
}
