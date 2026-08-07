"use client";

import { useCallback, useMemo, useState } from "react";
import { encodeFunctionData, erc20Abi, type Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { chainConfig } from "./config";
import {
  estimateRobForEth,
  ROB_MAX_SLIPPAGE_BPS,
  ROB_POOL_FEE,
  ROB_TOKEN,
  ROB_WETH_POOL,
  SWAP_ROUTER,
  SWAP_ROUTER_ABI,
  V3_POOL_SLOT0_ABI,
  WETH_TOKEN,
} from "./rob-payment";

/**
 * Buys exactly the ETH a spin costs, paying in ROB, from the player's wallet.
 *
 * This is the swap half of "pay with ROB". It does not spin — the caller spins
 * afterwards, because the spin has to originate from the player so the prize is
 * theirs, and it needs the ETH this produces. Keeping the two apart also keeps
 * the spin path identical whether payment came in ETH or ROB, so nothing about
 * settlement, refunds or sharing has a second code path to keep honest.
 *
 * Phases advance only on real wallet and RPC responses. `approving` covers the
 * one-time (or slippage-ceiling) ERC-20 approval; `swapping` covers the swap
 * itself; on success the player holds precisely the requested ETH.
 */
export type RobZapPhase = "idle" | "approving" | "swapping" | "error";

export interface RobZapState {
  phase: RobZapPhase;
  error: string | null;
  /** Balance of ROB in the connected wallet, or null until read. */
  robBalance: bigint | null;
  /**
   * Spot estimate of the ROB a spin of `totalWei` would cost. The real cost is
   * settled by the swap and is normally a touch higher (fee + impact); this is
   * for display and is labelled approximate.
   */
  estimateRob: (totalWei: bigint) => bigint | null;
  /** True when a quote exists and the wallet cannot cover even the estimate. */
  insufficient: (totalWei: bigint) => boolean;
  /**
   * Approve if needed, then swap ROB for exactly `totalWei` ETH. Resolves once
   * the wallet holds that ETH; throws (and sets `error`) otherwise.
   */
  buyEth: (totalWei: bigint) => Promise<void>;
  reset: () => void;
}

export function useRobZap(): RobZapState {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: chainConfig.id });
  const { writeContractAsync } = useWriteContract();

  const [phase, setPhase] = useState<RobZapPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const balanceQuery = useReadContract({
    address: ROB_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chainConfig.id,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  const priceQuery = useReadContract({
    address: ROB_WETH_POOL,
    abi: V3_POOL_SLOT0_ABI,
    functionName: "slot0",
    chainId: chainConfig.id,
    query: { refetchInterval: 15_000 },
  });

  const sqrtPriceX96 = priceQuery.data ? (priceQuery.data[0] as bigint) : 0n;
  const robBalance =
    balanceQuery.data !== undefined ? (balanceQuery.data as bigint) : null;

  const estimateRob = useCallback(
    (totalWei: bigint): bigint | null => {
      if (!sqrtPriceX96 || totalWei <= 0n) return null;
      const est = estimateRobForEth(totalWei, sqrtPriceX96);
      return est > 0n ? est : null;
    },
    [sqrtPriceX96],
  );

  const insufficient = useCallback(
    (totalWei: bigint): boolean => {
      const est = estimateRob(totalWei);
      if (est === null || robBalance === null) return false;
      // Compare against the padded ceiling, not the bare estimate — a wallet
      // that can only cover spot would fail the swap the moment price ticks up.
      const ceiling = est + (est * ROB_MAX_SLIPPAGE_BPS) / 10_000n;
      return robBalance < ceiling;
    },
    [estimateRob, robBalance],
  );

  const buyEth = useCallback(
    async (totalWei: bigint) => {
      setError(null);

      if (!address) {
        setError("Connect a wallet to pay in ROB.");
        throw new Error("no wallet");
      }
      if (!publicClient) {
        setError("The network is unavailable right now.");
        throw new Error("no client");
      }

      const est = estimateRob(totalWei);
      if (est === null) {
        setError("Could not read the ROB price. Try again in a moment.");
        throw new Error("no quote");
      }
      const amountInMaximum = est + (est * ROB_MAX_SLIPPAGE_BPS) / 10_000n;

      try {
        // 1. Approve only up to the ceiling this swap could spend, read fresh
        //    so a standing allowance is not re-requested.
        const allowance = (await publicClient.readContract({
          address: ROB_TOKEN,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, SWAP_ROUTER],
        })) as bigint;

        if (allowance < amountInMaximum) {
          setPhase("approving");
          const approveHash = await writeContractAsync({
            address: ROB_TOKEN,
            abi: erc20Abi,
            functionName: "approve",
            args: [SWAP_ROUTER, amountInMaximum],
            chainId: chainConfig.id,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // 2. Swap ROB for exactly `totalWei` WETH, then unwrap it to native ETH
        //    straight to the player. One multicall so it is atomic: either the
        //    player ends up with the exact ETH, or nothing moved.
        setPhase("swapping");
        const swapCall = encodeFunctionData({
          abi: SWAP_ROUTER_ABI,
          functionName: "exactOutputSingle",
          args: [
            {
              tokenIn: ROB_TOKEN,
              tokenOut: WETH_TOKEN,
              fee: ROB_POOL_FEE,
              recipient: SWAP_ROUTER as Address,
              amountOut: totalWei,
              amountInMaximum,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });
        const unwrapCall = encodeFunctionData({
          abi: SWAP_ROUTER_ABI,
          functionName: "unwrapWETH9",
          args: [totalWei, address],
        });

        const swapHash = await writeContractAsync({
          address: SWAP_ROUTER,
          abi: SWAP_ROUTER_ABI,
          functionName: "multicall",
          args: [[swapCall, unwrapCall]],
          chainId: chainConfig.id,
        });
        await publicClient.waitForTransactionReceipt({ hash: swapHash });

        setPhase("idle");
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "The ROB swap did not go through.";
        setPhase("error");
        setError(
          /user rejected|denied|rejected the request/i.test(message)
            ? "Swap rejected in wallet."
            : message.split("\n")[0],
        );
        throw caught;
      }
    },
    [address, publicClient, estimateRob, writeContractAsync],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
  }, []);

  return useMemo(
    () => ({ phase, error, robBalance, estimateRob, insufficient, buyEth, reset }),
    [phase, error, robBalance, estimateRob, insufficient, buyEth, reset],
  );
}
