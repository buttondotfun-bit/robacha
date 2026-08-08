"use client";

import { erc20Abi } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ROB_TOKEN } from "@/data/rob-token";
import { chainConfig } from "./config";
import { formatAmount } from "./formatters";
import { useRobBurned } from "./use-rob-burned";
import { useTokenMarket } from "./use-token-market";

/**
 * The shared $ROB data layer.
 *
 * Every $ROB surface — the header indicator, the /rob page, the footer, the
 * homepage section — reads through these three hooks rather than each fetching
 * its own way, so there is one definition of "the price", "your balance" and
 * "how much has burned", and one place honesty lives. None of them ever invent
 * a number: market values are null unless a liquid pair backs them, the balance
 * is null unless a wallet is connected, and the burn total is null until it is
 * read.
 */

export interface RobMarketData {
  /** USD price, or null when no sufficiently liquid pair quotes it. */
  price: number | null;
  priceReliable: boolean;
  liquidityUsd: number | null;
  /** Rolling 24h stats and valuation — null when upstream did not report them. */
  volume24h: number | null;
  change24h: number | null;
  marketCap: number | null;
  fdv: number | null;
  dex: string | null;
  pairAddress: string | null;
  /** DexScreener image for the pair, when it has one. Falls back downstream. */
  logoUrl: string | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Live market for the official $ROB pair, keyed off the one canonical address.
 * A thin wrapper over `useTokenMarket` so ROB shares the same cached, chunked,
 * liquidity-gated source every reward token uses — no bespoke ROB fetch.
 */
export function useRobMarketData(): RobMarketData {
  const market = useTokenMarket([ROB_TOKEN.address]);
  const data = market.get(ROB_TOKEN.address);
  return {
    price: data?.price ?? null,
    priceReliable: data?.priceReliable ?? false,
    liquidityUsd: data?.liquidityUsd ?? null,
    volume24h: data?.volume24h ?? null,
    change24h: data?.change24h ?? null,
    marketCap: data?.marketCap ?? null,
    fdv: data?.fdv ?? null,
    dex: data?.dex ?? null,
    pairAddress: data?.pairAddress ?? null,
    logoUrl: data?.logoUrl ?? null,
    isLoading: market.isLoading,
    isError: market.isError,
  };
}

export interface RobBalance {
  /** Raw balance in base units, or null when disconnected / unread. */
  raw: bigint | null;
  /** Whole-token amount, or null. */
  amount: number | null;
  /** Compact display string ("18,500" / "1.24M"), or null. */
  formatted: string | null;
  isConnected: boolean;
  isLoading: boolean;
}

/**
 * The connected wallet's $ROB balance. Null — not zero — when no wallet is
 * connected, so a surface can tell "not connected" apart from "holds none".
 */
export function useRobBalance(): RobBalance {
  const { address } = useAccount();
  const query = useReadContract({
    address: ROB_TOKEN.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chainConfig.id,
    query: { enabled: Boolean(address), refetchInterval: 30_000 },
  });

  const raw = query.data !== undefined ? (query.data as bigint) : null;
  const amount = raw !== null ? Number(raw) / 10 ** ROB_TOKEN.decimals : null;

  return {
    raw,
    amount,
    formatted: amount !== null ? formatAmount(amount) : null,
    isConnected: Boolean(address),
    isLoading: Boolean(address) && query.isLoading,
  };
}

export interface RobBurnStats {
  /** Burned total in base units at the dead address, or null until read. */
  raw: bigint | null;
  /** Whole-token amount burned, or null. */
  amount: number | null;
  /** True only once a real buyback has removed something. */
  hasBurned: boolean;
  isLoading: boolean;
}

/**
 * The running buyback-and-burn total, read from the dead address. Thin wrapper
 * over `useRobBurned` that pre-divides to whole tokens and exposes the honest
 * zero state every burn surface shares.
 */
export function useRobBurnStats(): RobBurnStats {
  const { burned, isLoading } = useRobBurned();
  const amount = burned !== null ? Number(burned) / 10 ** ROB_TOKEN.decimals : null;
  return {
    raw: burned,
    amount,
    hasBurned: amount !== null && amount > 0,
    isLoading,
  };
}
