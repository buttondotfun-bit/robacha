"use client";

import { useAccount, useReadContracts } from "wagmi";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";

/**
 * Whether the connected wallet actually holds admin rights, read from chain.
 *
 * The check is `hasRole` on the contracts themselves — never an allowlist in
 * config, an env var, or anything the browser could assert about itself. The
 * page it guards shows treasury figures and offers privileged writes, so the
 * only answer worth trusting is the one the contract gives.
 *
 * Worth being clear about what this is and is not: hiding a panel is a courtesy
 * to whoever is looking, not a security boundary. Every privileged write here
 * is enforced by `onlyRole` on chain, so a stranger who reconstructs this page
 * still cannot execute anything. The gate exists so an operator sees a useful
 * console and a visitor sees a closed door — not to be the thing standing
 * between an attacker and the treasury.
 */
export const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export interface AdminRole {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  /** True only when the chain says this wallet is admin on the gacha. */
  isAdmin: boolean;
  /** True while the answer is genuinely unknown — never treated as allowed. */
  isLoading: boolean;
  /** The role could not be read at all; fail closed rather than assume. */
  unreadable: boolean;
}

export function useAdminRole(): AdminRole {
  const { address, isConnected } = useAccount();
  const gacha = contracts.gacha;

  const enabled = Boolean(gacha && address && isConnected);

  const query = useReadContracts({
    allowFailure: true,
    query: { enabled, refetchInterval: 60_000 },
    contracts: enabled
      ? [
          {
            address: gacha!,
            abi: ROBACHA_GACHA_ABI,
            functionName: "hasRole" as const,
            args: [DEFAULT_ADMIN_ROLE, address!] as const,
          },
        ]
      : [],
  });

  const result = query.data?.[0];
  const unreadable = enabled && !query.isLoading && result?.status !== "success";

  return {
    address,
    isConnected,
    // Anything other than an explicit `true` from chain is not admin.
    isAdmin: result?.status === "success" && result.result === true,
    isLoading: query.isLoading,
    unreadable,
  };
}
