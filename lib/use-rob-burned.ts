"use client";

import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { chainConfig } from "./config";
import { ROB_TOKEN } from "./rob-payment";

/**
 * How much ROB the platform has burned, read straight from the dead address.
 *
 * There is nothing to trust here: "burned" means the tokens sit at
 * 0x…dEaD, an address no one holds the key to, and this is simply that
 * address's ROB balance. The same number anyone can read on the explorer, so
 * the counter is a convenience, not a claim — the verify link points at the
 * exact address it counts.
 *
 * Returns 0 until the first buyback fires, which is the honest state: the
 * mechanism is live but has removed nothing yet. Nothing is estimated or
 * accumulated in the app.
 */
export const ROB_BURN_ADDRESS =
  "0x000000000000000000000000000000000000dEaD" as const;

export function useRobBurned(): { burned: bigint | null; isLoading: boolean } {
  const query = useReadContract({
    address: ROB_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [ROB_BURN_ADDRESS],
    chainId: chainConfig.id,
    query: { refetchInterval: 30_000 },
  });

  return {
    burned: query.data !== undefined ? (query.data as bigint) : null,
    isLoading: query.isLoading,
  };
}
