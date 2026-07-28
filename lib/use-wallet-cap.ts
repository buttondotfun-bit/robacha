"use client";

import { useAccount, useReadContract } from "wagmi";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";
import type { ActivePool } from "@/lib/use-pool";

/**
 * How many spins this wallet has left on the running pool version.
 *
 * `maxQuantityPerWallet` is a lifetime cap per pool *version*, not per round or
 * per day. Without surfacing it, a wallet at its limit sees a live button, an
 * enabled quantity selector and a confirmation dialog, signs, and the contract
 * reverts `WalletCapExceeded` — costing gas for a transaction that could never
 * have succeeded. Reading the cap up front turns that into a disabled button
 * with a reason.
 *
 * The key matches `_poolVersionKey` on chain: `(poolId << 128) | version`. It
 * is a packed integer rather than a hash, which is easy to get wrong — hashing
 * the pair returns a key nothing has ever been written to, so every wallet
 * reads back zero and looks like it has its full allowance.
 */
export interface WalletCap {
  /** Lifetime cap for this pool version. 0 means uncapped. */
  cap: number;
  used: number;
  remaining: number;
  /** True only when a cap exists and it has been reached. */
  exhausted: boolean;
  isLoading: boolean;
}

export function useWalletCap(pool: ActivePool | null): WalletCap {
  const { address, isConnected } = useAccount();
  const gacha = contracts.gacha;

  const cap = pool?.maxQuantityPerWallet ?? 0;
  const enabled = Boolean(gacha && address && isConnected && pool && cap > 0);

  const key =
    pool !== null ? (BigInt(pool.poolId) << 128n) | BigInt(pool.version) : 0n;

  const query = useReadContract({
    address: gacha ?? undefined,
    abi: ROBACHA_GACHA_ABI,
    functionName: "entriesByWallet",
    args: enabled ? [key, address!] : undefined,
    query: { enabled, refetchInterval: 30_000 },
  });

  const used = query.data !== undefined ? Number(query.data as bigint) : 0;
  const remaining = cap === 0 ? Number.POSITIVE_INFINITY : Math.max(0, cap - used);

  return {
    cap,
    used,
    remaining,
    exhausted: cap > 0 && remaining === 0,
    isLoading: query.isLoading,
  };
}
