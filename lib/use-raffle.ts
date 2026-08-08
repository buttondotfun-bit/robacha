"use client";

import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { ROBACHA_RAFFLE_ABI, RaffleState } from "./abi/robacha-raffle";
import { chainConfig, contracts } from "./config";
import { useRaffleConfig } from "./raffle-context";

/**
 * Live state of the deployed raffle, plus the two things a visitor can do:
 * buy tickets and, if it doesn't sell out, take their money back.
 *
 * Every figure is read from the contract — the count sold, the price, the caps,
 * the wallet's own tickets and refundable amount — so the page can never show a
 * number the chain would not confirm. When no raffle address is configured the
 * hook reports `configured: false` and the page falls back to its announcement,
 * which is the honest state before a raffle is deployed.
 */

export type RaffleTxPhase = "idle" | "buying" | "refunding" | "opening" | "error";

export interface RaffleView {
  configured: boolean;
  isLoading: boolean;
  /** 0 Open · 1 AwaitingDraw · 2 Complete · 3 Refundable */
  state: number | null;
  ticketsSold: number | null;
  cap: number | null;
  maxPerWallet: number | null;
  priceWei: bigint | null;
  closesAt: number | null;
  winner: `0x${string}` | null;
  /** This wallet's tickets and refundable amount. */
  myTickets: number;
  myPaidWei: bigint;
  myRefunded: boolean;
  phase: RaffleTxPhase;
  error: string | null;
  buy: (quantity: number) => Promise<void>;
  refund: () => Promise<void>;
  /** Permissionless: open refunds once the window has elapsed unsold. */
  openRefunds: () => Promise<void>;
  reset: () => void;
  refetch: () => void;
}

const REFRESH = 8_000;

/**
 * @param addressOverride read a specific raffle contract; defaults to the
 *   `RaffleProvider` context (and then the featured raffle in config).
 */
export function useRaffle(addressOverride?: Address | null): RaffleView {
  const cfg = useRaffleConfig();
  const raffle = (addressOverride ?? cfg.address ?? contracts.raffle) ?? undefined;
  const configured = Boolean(raffle);
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: chainConfig.id });
  const { writeContractAsync } = useWriteContract();

  const [phase, setPhase] = useState<RaffleTxPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const base = { address: raffle, abi: ROBACHA_RAFFLE_ABI, chainId: chainConfig.id } as const;
  const live = { enabled: configured, refetchInterval: REFRESH } as const;
  const perWallet = { enabled: configured && Boolean(address), refetchInterval: REFRESH } as const;

  const soldQ = useReadContract({ ...base, functionName: "ticketsSold", query: live });
  const stateQ = useReadContract({ ...base, functionName: "state", query: live });
  const priceQ = useReadContract({ ...base, functionName: "ticketPriceWei", query: { enabled: configured } });
  const capQ = useReadContract({ ...base, functionName: "TICKET_CAP", query: { enabled: configured } });
  const maxQ = useReadContract({ ...base, functionName: "MAX_PER_WALLET", query: { enabled: configured } });
  const closesQ = useReadContract({ ...base, functionName: "closesAt", query: { enabled: configured } });
  const winnerQ = useReadContract({ ...base, functionName: "winner", query: live });
  const myTixQ = useReadContract({
    ...base,
    functionName: "ticketsOf",
    args: address ? [address] : undefined,
    query: perWallet,
  });
  const myPaidQ = useReadContract({
    ...base,
    functionName: "paidWei",
    args: address ? [address] : undefined,
    query: perWallet,
  });
  const myRefundedQ = useReadContract({
    ...base,
    functionName: "refunded",
    args: address ? [address] : undefined,
    query: perWallet,
  });

  const refetch = useCallback(() => {
    void soldQ.refetch();
    void stateQ.refetch();
    void winnerQ.refetch();
    void myTixQ.refetch();
    void myPaidQ.refetch();
    void myRefundedQ.refetch();
  }, [soldQ, stateQ, winnerQ, myTixQ, myPaidQ, myRefundedQ]);

  const buy = useCallback(
    async (quantity: number) => {
      setError(null);
      if (!raffle) {
        setError("The raffle is not open yet.");
        return;
      }
      const price = priceQ.data as bigint | undefined;
      if (!price || quantity <= 0) {
        setError("Could not read the ticket price. Try again in a moment.");
        return;
      }
      try {
        setPhase("buying");
        const hash = await writeContractAsync({
          address: raffle,
          abi: ROBACHA_RAFFLE_ABI,
          functionName: "buyTicket",
          args: [quantity],
          // The contract requires exactly quantity x price and reverts on any
          // other amount, so a stale price fails loudly instead of overpaying.
          value: price * BigInt(quantity),
          chainId: chainConfig.id,
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        setPhase("idle");
        refetch();
      } catch (caught) {
        setPhase("error");
        setError(cleanError(caught));
      }
    },
    [raffle, priceQ.data, writeContractAsync, publicClient, refetch],
  );

  const refund = useCallback(async () => {
    setError(null);
    if (!raffle) return;
    try {
      setPhase("refunding");
      const hash = await writeContractAsync({
        address: raffle,
        abi: ROBACHA_RAFFLE_ABI,
        functionName: "withdrawRefund",
        args: [],
        chainId: chainConfig.id,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setPhase("idle");
      refetch();
    } catch (caught) {
      setPhase("error");
      setError(cleanError(caught));
    }
  }, [raffle, writeContractAsync, publicClient, refetch]);

  const openRefunds = useCallback(async () => {
    setError(null);
    if (!raffle) return;
    try {
      setPhase("opening");
      const hash = await writeContractAsync({
        address: raffle,
        abi: ROBACHA_RAFFLE_ABI,
        functionName: "markRefundable",
        args: [],
        chainId: chainConfig.id,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setPhase("idle");
      refetch();
    } catch (caught) {
      setPhase("error");
      setError(cleanError(caught));
    }
  }, [raffle, writeContractAsync, publicClient, refetch]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
  }, []);

  const num = (v: unknown): number | null =>
    typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : null;

  return useMemo<RaffleView>(
    () => ({
      configured,
      isLoading: soldQ.isLoading || stateQ.isLoading,
      state: stateQ.data !== undefined ? Number(stateQ.data) : null,
      ticketsSold: num(soldQ.data),
      cap: num(capQ.data),
      maxPerWallet: num(maxQ.data),
      priceWei: (priceQ.data as bigint | undefined) ?? null,
      closesAt: closesQ.data !== undefined ? Number(closesQ.data) : null,
      winner:
        winnerQ.data && winnerQ.data !== "0x0000000000000000000000000000000000000000"
          ? (winnerQ.data as `0x${string}`)
          : null,
      myTickets: num(myTixQ.data) ?? 0,
      myPaidWei: (myPaidQ.data as bigint | undefined) ?? 0n,
      myRefunded: Boolean(myRefundedQ.data),
      phase,
      error,
      buy,
      refund,
      openRefunds,
      reset,
      refetch,
    }),
    [
      configured,
      soldQ.isLoading,
      soldQ.data,
      stateQ.isLoading,
      stateQ.data,
      capQ.data,
      maxQ.data,
      priceQ.data,
      closesQ.data,
      winnerQ.data,
      myTixQ.data,
      myPaidQ.data,
      myRefundedQ.data,
      phase,
      error,
      buy,
      refund,
      openRefunds,
      reset,
      refetch,
    ],
  );
}

export { RaffleState };

function cleanError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : "The transaction was not sent.";
  if (/user rejected|denied|rejected the request/i.test(message)) {
    return "Transaction rejected in wallet.";
  }
  return message.split("\n")[0];
}
