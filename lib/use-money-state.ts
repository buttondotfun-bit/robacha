"use client";

import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { ROBACHA_GACHA_ABI } from "@/lib/abi/robacha-gacha";
import { contracts } from "@/lib/config";

/**
 * The connected wallet's money position, read from the gacha contract.
 *
 * This exists so the assistant never has to *describe* someone's funds from a
 * general rule — it reads the actual number the contract holds for them. A
 * refund figure that is guessed, cached or inferred is worse than none, so an
 * unreadable state reports `null` and the assistant says it cannot see rather
 * than quoting a stale value.
 */
export interface MoneyState {
  /** ETH the contract owes this wallet from refunded entries. Null if unreadable. */
  refundableWei: bigint | null;
  refundableDisplay: string | null;
  hasRefund: boolean;
  /** Seconds after a round closes before it can be marked refundable. */
  randomnessTimeoutSeconds: number | null;
  isLoading: boolean;
  /** True when the contract could not be reached at all. */
  unavailable: boolean;
}

export function useMoneyState(): MoneyState {
  const { address, isConnected } = useAccount();
  const gacha = contracts.gacha;

  const query = useReadContracts({
    allowFailure: true,
    query: {
      enabled: Boolean(gacha),
      refetchInterval: 15_000,
    },
    contracts: gacha
      ? [
          {
            address: gacha,
            abi: ROBACHA_GACHA_ABI,
            functionName: "randomnessTimeout",
          },
          // Only meaningful with a wallet; the zero address keeps the batch
          // shape stable so indexes never shift between renders.
          {
            address: gacha,
            abi: ROBACHA_GACHA_ABI,
            functionName: "refundable",
            args: [address ?? "0x0000000000000000000000000000000000000000"],
          },
        ]
      : [],
  });

  const [timeoutResult, refundResult] = query.data ?? [];

  const timeoutSeconds =
    timeoutResult?.status === "success" ? Number(timeoutResult.result) : null;

  const refundableWei =
    isConnected && address && refundResult?.status === "success"
      ? (refundResult.result as bigint)
      : null;

  return {
    refundableWei,
    refundableDisplay: refundableWei === null ? null : formatEther(refundableWei),
    hasRefund: refundableWei !== null && refundableWei > 0n,
    randomnessTimeoutSeconds: timeoutSeconds,
    isLoading: query.isLoading,
    unavailable: !gacha || (!query.isLoading && query.data === undefined),
  };
}
