import type { Rarity } from "./token";

export type ActivityKind =
  | "spin"
  | "round-settled"
  | "reward-assigned"
  | "claim"
  | "refund"
  | "pool-update";

/**
 * One indexed on-chain event, as returned by `/api/activity`.
 *
 * Every field originates from a log the indexer has confirmed. There is no
 * client-side enrichment and no synthetic row: if the indexer has nothing, the
 * feed is empty.
 */
export interface ActivityEvent {
  /** `${chainId}:${txHash}:${logIndex}` — the indexer's unique key. */
  id: string;
  kind: ActivityKind;
  wallet: string | null;
  /** Reward token contract address, when the event concerns one. */
  token?: string;
  tokenSymbol?: string | null;
  tokenName?: string | null;
  tokenDecimals?: number | null;
  /** Raw token amount as a decimal string; formatted with `tokenDecimals`. */
  amountRaw?: string;
  rarity?: Rarity;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  /** Block timestamp, epoch ms. */
  at: number;
  status: "confirmed" | "pending";
  poolId?: number;
  roundId?: number;
  note?: string;
}

export interface ActivityResponse {
  events: ActivityEvent[];
  /** Highest block the indexer has confirmed for this chain. */
  indexedBlock: number | null;
  /** Chain head at the time of the response. */
  headBlock: number | null;
  /** True when the indexer is within its confirmation depth of the head. */
  synced: boolean;
}
