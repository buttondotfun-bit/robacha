"use client";

import { useMemo } from "react";
import { erc20Abi, formatEther, formatUnits, type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import {
  ROBACHA_GACHA_ABI,
  ROBACHA_POOL_REGISTRY_ABI,
  ROBACHA_REWARD_VAULT_ABI,
} from "./abi";
import { ACTIVE_POOL_ID, chainConfig, contracts, isGachaConfigured } from "./config";
import type { Rarity } from "@/types/token";

/**
 * The active reward pool, read entirely from the ROBACHA contracts.
 *
 * Nothing here is authored in the app. Pool identity, version, spin price,
 * randomness surcharge, tier probabilities, reward slots and live vault
 * inventory all come from chain state. When the contracts are not configured,
 * unreachable, or have no active pool, this returns an explicit unavailable
 * reason and every dependent action is disabled.
 */

export type PoolUnavailableReason =
  | "not-configured"
  | "rpc-unavailable"
  | "no-active-pool"
  | "loading";

export interface PoolRewardEntry {
  token: Address;
  /** ERC-20 metadata read from the token contract itself. */
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  minAmount: bigint;
  maxAmount: bigint;
  /** Human-readable bounds, once decimals are known. */
  minDisplay: number | null;
  maxDisplay: number | null;
  /** Vault inventory currently payable for this token. */
  available: bigint | null;
  availableDisplay: number | null;
  /** Absolute probability of drawing this exact slot, in percent. */
  oddsPercent: number;
  tierIndex: number;
  rarity: Rarity;
}

export interface PoolTier {
  index: number;
  probabilityBps: number;
  probabilityPercent: number;
  /** Display label derived from probability rank, not authored per token. */
  rarity: Rarity;
  entries: PoolRewardEntry[];
}

export interface PoolReadiness {
  ready: boolean;
  poolOpen: boolean;
  notPaused: boolean;
  randomnessAvailable: boolean;
  randomnessReason: string;
}

export interface ActivePool {
  poolId: bigint;
  name: string;
  version: number;
  active: boolean;
  closed: boolean;
  /** Base price per entry, before the randomness surcharge. */
  spinPriceWei: bigint;
  spinPriceDisplay: string;
  /** Cost of the randomness request per entry. Never protocol revenue. */
  surchargeWei: bigint;
  surchargeDisplay: string;
  /** Base + surcharge: the amount a wallet actually sends per entry. */
  totalPerEntryWei: bigint;
  totalPerEntryDisplay: string;
  /** The published fee split for this version, snapshotted at creation. */
  protocolFeeBps: number;
  operationsFeeBps: number;
  rewardReserveBps: number;
  maxEntriesPerRound: number;
  roundDurationSeconds: number;
  maxQuantityPerTx: number;
  maxQuantityPerWallet: number;
  startsAt: number;
  closesAt: number | null;
  /** Set once the version took its first paid spin and became immutable. */
  lockedAt: number | null;
  tiers: PoolTier[];
  entries: PoolRewardEntry[];
}

/**
 * Rarity is a presentation label, not pool data. The contract only knows tier
 * probabilities, so the rarest band (lowest probability) is labelled Legendary
 * and the most frequent Common. A pool with fewer than five tiers uses the
 * rarest labels available, so a 2-tier pool reads Common / Legendary.
 */
export function deriveRarityLabels(probabilities: number[]): Rarity[] {
  const order: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
  const count = probabilities.length;
  const ranked = probabilities
    .map((bps, index) => ({ bps, index }))
    .sort((a, b) => b.bps - a.bps);

  const labels: Rarity[] = new Array(count).fill("common");
  ranked.forEach(({ index }, rank) => {
    if (count >= order.length) {
      labels[index] = order[Math.min(rank, order.length - 1)];
      return;
    }
    const step = (order.length - 1) / Math.max(1, count - 1);
    labels[index] = order[Math.round(rank * step)];
  });
  return labels;
}

interface RawPoolVersion {
  poolId: bigint;
  version: bigint;
  name: string;
  baseSpinPriceWei: bigint;
  randomnessSurchargeWei: bigint;
  protocolFeeBps: number;
  operationsFeeBps: number;
  rewardReserveBps: number;
  maxEntriesPerRound: number;
  roundDuration: number;
  maxQuantityPerTx: number;
  maxQuantityPerWallet: number;
  startTime: bigint;
  endTime: bigint;
  active: boolean;
  closed: boolean;
  lockedAt: bigint;
  configured: boolean;
}

interface RawRewardSlot {
  token: Address;
  tierIndex: number;
  minAmount: bigint;
  maxAmount: bigint;
}

const REFETCH_MS = 20_000;

export function usePool() {
  const registryAddress = contracts.poolRegistry ?? undefined;
  const gachaAddress = contracts.gacha ?? undefined;
  const vaultAddress = contracts.rewardVault ?? undefined;
  const enabled = isGachaConfigured;

  // ---- 1. Which version is live right now? ----
  const versionQuery = useReadContract({
    address: registryAddress,
    abi: ROBACHA_POOL_REGISTRY_ABI,
    functionName: "currentPoolVersion",
    args: [ACTIVE_POOL_ID],
    chainId: chainConfig.id,
    query: { enabled, refetchInterval: REFETCH_MS },
  });

  const versionData = versionQuery.data as readonly [bigint, boolean] | undefined;
  const version = versionData?.[0] ?? 0n;
  const isOpen = versionData?.[1] ?? false;
  const hasVersion = version > 0n;

  // ---- 2. The version's definition, its odds and its slots ----
  const definitionQuery = useReadContracts({
    contracts: [
      {
        address: registryAddress,
        abi: ROBACHA_POOL_REGISTRY_ABI,
        functionName: "getVersion",
        args: [ACTIVE_POOL_ID, version],
        chainId: chainConfig.id,
      },
      {
        address: registryAddress,
        abi: ROBACHA_POOL_REGISTRY_ABI,
        functionName: "getProbabilities",
        args: [ACTIVE_POOL_ID, version],
        chainId: chainConfig.id,
      },
      {
        address: registryAddress,
        abi: ROBACHA_POOL_REGISTRY_ABI,
        functionName: "getRewards",
        args: [ACTIVE_POOL_ID, version],
        chainId: chainConfig.id,
      },
    ],
    allowFailure: true,
    query: { enabled: enabled && hasVersion, refetchInterval: REFETCH_MS },
  });

  // ---- 3. Whether a spin would actually go through ----
  const readinessQuery = useReadContract({
    address: gachaAddress,
    abi: ROBACHA_GACHA_ABI,
    functionName: "spinReadiness",
    args: [ACTIVE_POOL_ID],
    chainId: chainConfig.id,
    query: { enabled, refetchInterval: REFETCH_MS },
  });

  const raw = useMemo<RawPoolVersion | null>(() => {
    const entry = definitionQuery.data?.[0];
    return entry?.status === "success"
      ? (entry.result as unknown as RawPoolVersion)
      : null;
  }, [definitionQuery.data]);

  const probabilities = useMemo<number[] | null>(() => {
    const entry = definitionQuery.data?.[1];
    return entry?.status === "success"
      ? [...(entry.result as readonly number[])]
      : null;
  }, [definitionQuery.data]);

  const slots = useMemo<RawRewardSlot[] | null>(() => {
    const entry = definitionQuery.data?.[2];
    return entry?.status === "success"
      ? [...(entry.result as readonly RawRewardSlot[])]
      : null;
  }, [definitionQuery.data]);

  // ---- 4. Token metadata and live vault inventory ----
  const tokens = useMemo(() => {
    if (!slots) return [] as Address[];
    return [
      ...new Set(slots.map((slot) => slot.token.toLowerCase())),
    ] as Address[];
  }, [slots]);

  const tokenQuery = useReadContracts({
    contracts: tokens.flatMap((token) => {
      const metadata = [
        { address: token, abi: erc20Abi, functionName: "name" as const, chainId: chainConfig.id },
        { address: token, abi: erc20Abi, functionName: "symbol" as const, chainId: chainConfig.id },
        { address: token, abi: erc20Abi, functionName: "decimals" as const, chainId: chainConfig.id },
      ];
      if (!vaultAddress) return metadata;
      return [
        ...metadata,
        {
          address: vaultAddress,
          abi: ROBACHA_REWARD_VAULT_ABI,
          functionName: "available" as const,
          args: [token],
          chainId: chainConfig.id,
        },
      ];
    }),
    allowFailure: true,
    query: { enabled: tokens.length > 0, refetchInterval: REFETCH_MS },
  });

  const readiness = useMemo<PoolReadiness | null>(() => {
    const data = readinessQuery.data as
      | readonly [boolean, boolean, boolean, boolean, bigint, bigint, bigint, string]
      | undefined;
    if (!data) return null;
    return {
      ready: data[0],
      poolOpen: data[1],
      notPaused: data[2],
      randomnessAvailable: data[3],
      randomnessReason: data[7],
    };
  }, [readinessQuery.data]);

  const pool = useMemo<ActivePool | null>(() => {
    if (!raw || !probabilities || !slots || probabilities.length === 0) return null;

    const stride = vaultAddress ? 4 : 3;
    const tokenIndex = new Map(tokens.map((token, index) => [token, index]));

    const read = (token: Address, offset: number) => {
      const index = tokenIndex.get(token.toLowerCase() as Address);
      if (index === undefined) return undefined;
      const result = tokenQuery.data?.[index * stride + offset];
      return result?.status === "success" ? result.result : undefined;
    };

    const rarities = deriveRarityLabels(probabilities);

    // Slots within a tier share that tier's probability evenly, because the
    // contract picks a tier first and then a slot uniformly inside it.
    const slotsPerTier = probabilities.map(
      (_, tier) => slots.filter((slot) => slot.tierIndex === tier).length,
    );

    const entries: PoolRewardEntry[] = slots.map((slot) => {
      const decimalsRaw = read(slot.token, 2);
      const decimals = typeof decimalsRaw === "number" ? decimalsRaw : null;
      const availableRaw = vaultAddress ? read(slot.token, 3) : undefined;
      const available = typeof availableRaw === "bigint" ? availableRaw : null;

      const tierProbability = (probabilities[slot.tierIndex] ?? 0) / 100;
      const siblings = slotsPerTier[slot.tierIndex] || 1;

      return {
        token: slot.token,
        name: (read(slot.token, 0) as string | undefined) ?? null,
        symbol: (read(slot.token, 1) as string | undefined) ?? null,
        decimals,
        minAmount: slot.minAmount,
        maxAmount: slot.maxAmount,
        minDisplay:
          decimals === null ? null : Number(formatUnits(slot.minAmount, decimals)),
        maxDisplay:
          decimals === null ? null : Number(formatUnits(slot.maxAmount, decimals)),
        available,
        availableDisplay:
          available === null || decimals === null
            ? null
            : Number(formatUnits(available, decimals)),
        oddsPercent: tierProbability / siblings,
        tierIndex: slot.tierIndex,
        rarity: rarities[slot.tierIndex] ?? "common",
      };
    });

    const tiers: PoolTier[] = probabilities.map((bps, index) => ({
      index,
      probabilityBps: bps,
      probabilityPercent: bps / 100,
      rarity: rarities[index] ?? "common",
      entries: entries.filter((entry) => entry.tierIndex === index),
    }));

    const total = raw.baseSpinPriceWei + raw.randomnessSurchargeWei;

    return {
      poolId: raw.poolId,
      name: raw.name,
      version: Number(raw.version),
      active: raw.active,
      closed: raw.closed,
      spinPriceWei: raw.baseSpinPriceWei,
      spinPriceDisplay: formatEther(raw.baseSpinPriceWei),
      surchargeWei: raw.randomnessSurchargeWei,
      surchargeDisplay: formatEther(raw.randomnessSurchargeWei),
      totalPerEntryWei: total,
      totalPerEntryDisplay: formatEther(total),
      protocolFeeBps: raw.protocolFeeBps,
      operationsFeeBps: raw.operationsFeeBps,
      rewardReserveBps: raw.rewardReserveBps,
      maxEntriesPerRound: raw.maxEntriesPerRound,
      roundDurationSeconds: raw.roundDuration,
      maxQuantityPerTx: raw.maxQuantityPerTx,
      maxQuantityPerWallet: raw.maxQuantityPerWallet,
      startsAt: Number(raw.startTime) * 1000,
      closesAt: raw.endTime === 0n ? null : Number(raw.endTime) * 1000,
      lockedAt: raw.lockedAt === 0n ? null : Number(raw.lockedAt) * 1000,
      tiers,
      entries,
    };
  }, [raw, probabilities, slots, tokens, tokenQuery.data, vaultAddress]);

  const isLoading =
    enabled &&
    (versionQuery.isLoading ||
      (hasVersion && definitionQuery.isLoading) ||
      (tokens.length > 0 && tokenQuery.isLoading));

  const isError =
    enabled && (versionQuery.isError || (hasVersion && definitionQuery.isError));

  const unavailableReason = useMemo<PoolUnavailableReason | null>(() => {
    if (!enabled) return "not-configured";
    if (isError) return "rpc-unavailable";
    if (isLoading) return "loading";
    if (!hasVersion || !isOpen || !pool) return "no-active-pool";
    return null;
  }, [enabled, isError, isLoading, hasVersion, isOpen, pool]);

  return {
    pool: unavailableReason === null ? pool : null,
    readiness,
    unavailableReason,
    isLoading,
    isError,
    refetch: () => {
      void versionQuery.refetch();
      void definitionQuery.refetch();
      void readinessQuery.refetch();
      void tokenQuery.refetch();
    },
  };
}
