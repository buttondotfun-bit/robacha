"use client";

import { useMemo } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { chainConfig } from "./config";
import { usePool, type PoolRewardEntry } from "./use-pool";

export interface Holding {
  /** The pool slot this balance corresponds to. */
  token: PoolRewardEntry;
  /** Raw on-chain balance. */
  raw: bigint;
  /** Human-readable balance. */
  amount: number;
}

/**
 * Live ERC-20 balances for the reward tokens of the active pool, read straight
 * from Robinhood Chain in a single multicall.
 *
 * The token set comes from the pool contract — there is no authored roster — so
 * with no active pool there is nothing to read and the hook reports that rather
 * than inventing a list.
 */
export function useHoldings() {
  const { address, isConnected, chainId } = useAccount();
  const { pool, unavailableReason } = usePool();

  // De-duplicate: one token can occupy several tiers.
  const tokens = useMemo(() => {
    if (!pool) return [] as PoolRewardEntry[];
    const seen = new Map<string, PoolRewardEntry>();
    for (const entry of pool.entries) {
      if (!seen.has(entry.token.toLowerCase())) {
        seen.set(entry.token.toLowerCase(), entry);
      }
    }
    return [...seen.values()];
  }, [pool]);

  const enabled =
    Boolean(address) &&
    isConnected &&
    chainId === chainConfig.id &&
    tokens.length > 0;

  const contracts = useMemo(
    () =>
      tokens.map((entry) => ({
        address: entry.token,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`],
        chainId: chainConfig.id,
      })),
    [tokens, address],
  );

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts,
    allowFailure: true,
    query: { enabled, refetchInterval: 30_000 },
  });

  const holdings = useMemo<Holding[]>(() => {
    if (!data) return [];
    return tokens
      .map((entry, index) => {
        const result = data[index];
        if (!result || result.status !== "success") return null;
        const raw = result.result as bigint;
        if (raw === BigInt(0)) return null;
        if (entry.decimals === null) return null;
        return {
          token: entry,
          raw,
          amount: Number(formatUnits(raw, entry.decimals)),
        } satisfies Holding;
      })
      .filter((holding): holding is Holding => holding !== null)
      .sort((a, b) => b.amount - a.amount);
  }, [data, tokens]);

  return {
    holdings,
    isLoading: enabled && isLoading,
    isError,
    enabled,
    /** Why there is nothing to read, when there is nothing to read. */
    unavailableReason: pool ? null : unavailableReason,
    refetch,
  };
}
