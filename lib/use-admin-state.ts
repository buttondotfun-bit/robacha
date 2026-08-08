"use client";

import { useMemo } from "react";
import { formatEther, formatUnits, erc20Abi, type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import {
  ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
  ROBACHA_FEE_ROUTER_ABI,
  ROBACHA_GACHA_ABI,
  ROBACHA_REWARD_VAULT_ABI,
} from "@/lib/abi";
import { ACTIVE_POOL_ID, contracts } from "@/lib/config";
import { useNow } from "@/lib/use-activity";

/**
 * Everything the operator console reads, in one place.
 *
 * The panels this feeds exist because of failures that actually happened: a
 * drained prize vault that only surfaced when a spin refunded, a commitment
 * queue nobody was watching, rounds stuck mid-flight with no view of them, and
 * fees that looked missing because they accrue rather than transfer.
 *
 * Every figure is read from a contract. Nothing is inferred from another value,
 * and anything unreadable stays null so the console can say "cannot read"
 * rather than draw a confident zero.
 */

export const ROUND_STATE = [
  "None", "Open", "Closed", "RandomnessRequested", "CrossChainPending",
  "VRFPending", "ResultReturning", "RandomnessReceived", "Settled",
  "Failed", "Refundable", "Cancelled",
] as const;

/** Rounds needing no further action. */
const TERMINAL = new Set(["None", "Settled", "Refundable", "Cancelled", "Failed"]);

export interface AdminRound {
  roundId: number;
  state: string;
  entryCount: number;
  settledCount: number;
  escrowWei: bigint;
  closesAt: number;
  closedAt: number;
  /** The single call that would move this round forward, if any. */
  nextAction: "closeRound" | "requestRoundRandomness" | "settleEntries" | null;
  waiting: string;
}

export interface VaultToken {
  address: Address;
  symbol: string | null;
  decimals: number;
  balance: bigint;
  reserved: bigint;
  available: bigint;
  solvent: boolean;
}

const LOOKBACK = 15;

/** Shape of one `allowFailure` result; the input casts erase this otherwise. */
type ReadResult = { status: "success" | "failure"; result?: unknown };

export function useAdminState(poolId: bigint = ACTIVE_POOL_ID) {
  // Clock from an external store rather than Date.now() during render, which
  // React treats as impure and which would make countdowns jitter on unrelated
  // re-renders.
  const nowMs = useNow();
  const gacha = contracts.gacha;
  const vault = contracts.rewardVault;
  const router = contracts.feeRouter;
  const randomness = contracts.randomnessSender;

  // ---- headline contract state -------------------------------------------
  const head = useReadContracts({
    allowFailure: true,
    query: { enabled: Boolean(gacha), refetchInterval: 15_000 },
    contracts: gacha
      ? [
          { address: gacha, abi: ROBACHA_GACHA_ABI, functionName: "nextRoundId" },
          { address: gacha, abi: ROBACHA_GACHA_ABI, functionName: "randomnessTimeout" },
          { address: gacha, abi: ROBACHA_GACHA_ABI, functionName: "paused" },
          { address: gacha, abi: ROBACHA_GACHA_ABI, functionName: "totalEscrow" },
          { address: gacha, abi: ROBACHA_GACHA_ABI, functionName: "totalRefundable" },
          {
            address: gacha,
            abi: ROBACHA_GACHA_ABI,
            functionName: "spinReadiness",
            args: [poolId],
          },
        ]
      : [],
  });

  const val = <T,>(i: number): T | null => {
    const r = head.data?.[i];
    return r?.status === "success" ? (r.result as T) : null;
  };

  const nextRoundId = Number(val<bigint>(0) ?? 0n);
  const randomnessTimeout = Number(val<number>(1) ?? 0);
  const paused = val<boolean>(2);
  const totalEscrow = val<bigint>(3);
  const totalRefundable = val<bigint>(4);
  const readiness = val<readonly [boolean, boolean, boolean, boolean, bigint, bigint, bigint, string]>(5);

  // ---- rounds -------------------------------------------------------------
  const roundIds = useMemo(() => {
    if (!nextRoundId) return [];
    const ids: number[] = [];
    for (let id = Math.max(1, nextRoundId - LOOKBACK); id < nextRoundId; id += 1) ids.push(id);
    return ids.reverse(); // newest first — that is where the action is
  }, [nextRoundId]);

  const roundsQuery = useReadContracts({
    allowFailure: true,
    query: { enabled: roundIds.length > 0, refetchInterval: 15_000 },
    contracts: roundIds.map((id) => ({
      address: gacha!,
      abi: ROBACHA_GACHA_ABI,
      functionName: "getRound" as const,
      args: [BigInt(id)] as const,
    })),
  });

  const rounds: AdminRound[] = useMemo(() => {
    if (!roundsQuery.data) return [];
    const now = Math.floor(nowMs / 1000);

    return roundIds
      .map((roundId, index): AdminRound | null => {
        const r = roundsQuery.data![index];
        if (r?.status !== "success") return null;
        const raw = r.result as {
          state: number; entryCount: number; settledCount: number;
          escrowWei: bigint; closesAt: bigint; closedAt: bigint;
        };
        const state = ROUND_STATE[Number(raw.state)] ?? String(raw.state);
        if (state === "None") return null;

        let nextAction: AdminRound["nextAction"] = null;
        let waiting = "";

        if (state === "Open" && raw.entryCount > 0) {
          if (now >= Number(raw.closesAt)) {
            nextAction = "closeRound";
            waiting = "window elapsed";
          } else {
            waiting = `closes in ${Math.max(0, Math.round((Number(raw.closesAt) - now) / 60))}m`;
          }
        } else if (state === "Closed" && raw.entryCount > 0) {
          nextAction = "requestRoundRandomness";
          waiting = "needs randomness";
        } else if (state === "RandomnessReceived") {
          nextAction = "settleEntries";
          waiting = "ready to pay out";
        } else if (!TERMINAL.has(state)) {
          const left = Number(raw.closedAt) + randomnessTimeout - now;
          waiting = `awaiting reveal — refundable in ${Math.max(0, Math.round(left / 60))}m`;
        }

        return {
          roundId,
          state,
          entryCount: Number(raw.entryCount),
          settledCount: Number(raw.settledCount),
          escrowWei: raw.escrowWei,
          closesAt: Number(raw.closesAt),
          closedAt: Number(raw.closedAt),
          nextAction,
          waiting,
        };
      })
      .filter((r): r is AdminRound => r !== null);
  }, [roundsQuery.data, roundIds, randomnessTimeout, nowMs]);

  // ---- randomness / commitment queue --------------------------------------
  const randomnessQuery = useReadContracts({
    allowFailure: true,
    query: { enabled: Boolean(randomness), refetchInterval: 30_000 },
    contracts: randomness
      ? ([
          "availableCommitments", "nextUnused", "totalRevealed",
          "totalMissed", "bond", "revealWindow", "gasReimbursementWei",
        ].map((fn) => ({
          address: randomness,
          abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
          functionName: fn as never,
        })) as never)
      : [],
  });

  const rv = <T,>(i: number): T | null => {
    const rows = randomnessQuery.data as ReadResult[] | undefined;
    const r = rows?.[i];
    return r?.status === "success" ? (r.result as T) : null;
  };

  // ---- vault inventory ----------------------------------------------------
  const tokenList = useReadContract({
    address: vault ?? undefined,
    abi: ROBACHA_REWARD_VAULT_ABI,
    functionName: "knownTokens",
    query: { enabled: Boolean(vault), refetchInterval: 60_000 },
  });

  const tokens = useMemo(
    () => (tokenList.data as Address[] | undefined) ?? [],
    [tokenList.data],
  );

  const vaultQuery = useReadContracts({
    allowFailure: true,
    query: { enabled: tokens.length > 0, refetchInterval: 30_000 },
    contracts: tokens.flatMap((token) => [
      { address: token, abi: erc20Abi, functionName: "symbol" as const },
      { address: token, abi: erc20Abi, functionName: "decimals" as const },
      { address: token, abi: erc20Abi, functionName: "balanceOf" as const, args: [vault!] as const },
      { address: vault!, abi: ROBACHA_REWARD_VAULT_ABI, functionName: "reserved" as const, args: [token] as const },
      { address: vault!, abi: ROBACHA_REWARD_VAULT_ABI, functionName: "available" as const, args: [token] as const },
      { address: vault!, abi: ROBACHA_REWARD_VAULT_ABI, functionName: "isSolvent" as const, args: [token] as const },
    ]),
  });

  const vaultTokens: VaultToken[] = useMemo(() => {
    if (!vaultQuery.data) return [];
    return tokens.map((address, i) => {
      const at = <T,>(offset: number): T | null => {
        const r = vaultQuery.data![i * 6 + offset];
        return r?.status === "success" ? (r.result as T) : null;
      };
      return {
        address,
        symbol: at<string>(0),
        decimals: Number(at<number>(1) ?? 18),
        balance: at<bigint>(2) ?? 0n,
        reserved: at<bigint>(3) ?? 0n,
        available: at<bigint>(4) ?? 0n,
        solvent: at<boolean>(5) ?? false,
      };
    });
  }, [vaultQuery.data, tokens]);

  // ---- fees ---------------------------------------------------------------
  const treasuries = useReadContracts({
    allowFailure: true,
    query: { enabled: Boolean(router), refetchInterval: 60_000 },
    contracts: router
      ? (["protocolTreasury", "operationsTreasury", "rewardReserveTreasury", "randomnessTreasury"].map(
          (fn) => ({ address: router, abi: ROBACHA_FEE_ROUTER_ABI, functionName: fn as never }),
        ) as never)
      : [],
  });

  /**
   * Deduplicated on purpose. Several treasuries commonly share one address, and
   * `accrued` is keyed by address — summing per role would count the same
   * balance more than once, which is exactly the trap `totalLiabilities()`
   * falls into on chain.
   */
  const treasuryAddresses = useMemo(() => {
    const seen = new Map<string, string[]>();
    const roles = ["protocol", "operations", "reward reserve", "randomness"];
    (treasuries.data as ReadResult[] | undefined)?.forEach((r, i) => {
      if (r?.status !== "success") return;
      const addr = (r.result as Address).toLowerCase();
      seen.set(addr, [...(seen.get(addr) ?? []), roles[i]]);
    });
    return [...seen.entries()].map(([address, forRoles]) => ({
      address: address as Address,
      roles: forRoles,
    }));
  }, [treasuries.data]);

  const accruedQuery = useReadContracts({
    allowFailure: true,
    query: { enabled: treasuryAddresses.length > 0, refetchInterval: 30_000 },
    contracts: treasuryAddresses.map((t) => ({
      address: router!,
      abi: ROBACHA_FEE_ROUTER_ABI,
      functionName: "accrued" as const,
      args: [t.address] as const,
    })),
  });

  const fees = useMemo(
    () =>
      treasuryAddresses.map((t, i) => {
        const r = accruedQuery.data?.[i];
        return {
          ...t,
          accrued: r?.status === "success" ? (r.result as bigint) : null,
        };
      }),
    [treasuryAddresses, accruedQuery.data],
  );

  return {
    isLoading: head.isLoading,
    paused,
    totalEscrow,
    totalRefundable,
    spinReady: readiness?.[0] ?? null,
    readinessReason: readiness?.[7] ?? "",
    nextRoundId,
    rounds,
    actionableRounds: rounds.filter((r) => r.nextAction !== null),
    randomness: {
      available: rv<bigint>(0),
      nextUnused: rv<bigint>(1),
      revealed: rv<bigint>(2),
      missed: rv<bigint>(3),
      bond: rv<bigint>(4),
      revealWindow: rv<bigint>(5),
      gasReimbursement: rv<bigint>(6),
    },
    vaultTokens,
    fees,
    refetch: () => {
      void head.refetch();
      void roundsQuery.refetch();
      void randomnessQuery.refetch();
      void vaultQuery.refetch();
      void accruedQuery.refetch();
    },
  };
}

export function fmtToken(value: bigint, decimals: number): string {
  const n = Number(formatUnits(value, decimals));
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 });
}

export function fmtEth(value: bigint | null): string {
  return value === null ? "—" : `${formatEther(value)} ETH`;
}
