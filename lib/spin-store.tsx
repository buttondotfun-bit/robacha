"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ROBACHA_GACHA_ABI } from "./abi";
import { ACTIVE_POOL_ID, chainConfig, contracts, isGachaConfigured } from "./config";
import { SPIN_MAX, SPIN_MIN } from "./constants";
import { clamp } from "./utils";
import type { SpinPhase } from "@/types/reward";

/**
 * Spin transaction state.
 *
 * A spin is a real contract call. Phases track an actual transaction —
 * signature, broadcast, receipt — and are only advanced by wallet or RPC
 * responses, never by a timer. The reward itself is assigned on chain in the
 * randomness callback and read back from events; nothing is chosen here.
 */

interface SpinContextValue {
  quantity: number;
  setQuantity: (next: number) => void;
  phase: SpinPhase;
  error: string | null;
  txHash: `0x${string}` | null;
  /** True once a gacha address is configured. */
  configured: boolean;
  /**
   * Send a spin.
   *
   * @param perEntryWei Base price plus randomness surcharge, per entry, read
   *   from the pool contract by the caller and passed at call time rather than
   *   held in this store — a cached price could go stale between a pool version
   *   change and the signature, and the contract rejects any mismatch.
   */
  spin: (perEntryWei: bigint) => Promise<void>;
  reset: () => void;
}

const SpinContext = createContext<SpinContextValue | null>(null);

export function SpinProvider({ children }: { children: React.ReactNode }) {
  const [quantity, setQuantityState] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const {
    writeContractAsync,
    data: txHash,
    reset: resetWrite,
    isPending,
  } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: chainConfig.id,
    confirmations: 1,
    query: { enabled: Boolean(txHash) },
  });

  const setQuantity = useCallback((next: number) => {
    setQuantityState(clamp(Math.round(next), SPIN_MIN, SPIN_MAX));
  }, []);

  const spin = useCallback(
    async (perEntryWei: bigint) => {
      setError(null);

      if (!isGachaConfigured || !contracts.gacha) {
        setError("ROBACHA contract is not configured for this deployment.");
        return;
      }
      if (perEntryWei <= 0n) {
        setError("Spin price could not be read from the contract.");
        return;
      }

      try {
        await writeContractAsync({
          address: contracts.gacha,
          abi: ROBACHA_GACHA_ABI,
          functionName: "spin",
          args: [ACTIVE_POOL_ID, quantity],
          // The contract requires exactly (base + surcharge) * quantity and
          // reverts on anything else, so an interface that has fallen out of
          // date fails loudly rather than overpaying.
          value: perEntryWei * BigInt(quantity),
          chainId: chainConfig.id,
        });
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "The spin was not sent.";
        if (process.env.NODE_ENV !== "production") {
          console.error("[robacha] spin failed", caught);
        }
        // A wallet rejection is a normal outcome, not a system failure.
        setError(
          /user rejected|denied|rejected the request/i.test(message)
            ? "Transaction rejected in wallet."
            : message.split("\n")[0],
        );
      }
    },
    [quantity, writeContractAsync],
  );

  const reset = useCallback(() => {
    setError(null);
    resetWrite();
  }, [resetWrite]);

  // Phases only advance on wallet or RPC responses. Anything past the receipt
  // (round closure, randomness, settlement) is owned by the round watcher,
  // which reads contract state — this store never guesses at it.
  const phase: SpinPhase = error
    ? "error"
    : receipt.isSuccess
      ? "round-open"
      : receipt.isLoading
        ? "broadcast"
        : isPending
          ? "confirming"
          : "idle";

  const value = useMemo<SpinContextValue>(
    () => ({
      quantity,
      setQuantity,
      phase,
      error,
      txHash: txHash ?? null,
      configured: isGachaConfigured,
      spin,
      reset,
    }),
    [quantity, setQuantity, phase, error, txHash, spin, reset],
  );

  return <SpinContext.Provider value={value}>{children}</SpinContext.Provider>;
}

export function useSpin(): SpinContextValue {
  const ctx = useContext(SpinContext);
  if (!ctx) throw new Error("useSpin must be used inside <SpinProvider>");
  return ctx;
}
