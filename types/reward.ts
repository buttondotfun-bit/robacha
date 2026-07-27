import type { Rarity } from "./token";

/**
 * A reward the gacha contract has assigned to a wallet.
 *
 * Produced by the contract's `RewardAssigned` event and reconciled against
 * `RewardClaimed`. Every field is on-chain state; nothing is inferred.
 */
export interface WalletReward {
  /** `rewardId` from the contract. */
  rewardId: string;
  poolId: number;
  roundId: number;
  spinEntryId: string;
  /** Reward token contract address. */
  token: string;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  /** Assigned amount, raw. */
  amountRaw: string;
  rarity: Rarity | null;
  claimed: boolean;
  assignedTxHash: string;
  assignedAt: number;
  claimedTxHash: string | null;
  claimedAt: number | null;
}

export interface WalletRewardsResponse {
  rewards: WalletReward[];
  indexedBlock: number | null;
  headBlock: number | null;
  synced: boolean;
}

/**
 * Phases of a real spin. Each is entered only on a wallet response, an RPC
 * response, a confirmed receipt or an indexed event — never on a timer.
 */
export type SpinPhase =
  | "idle"
  | "simulating"
  | "confirming"
  | "broadcast"
  | "round-open"
  | "round-closed"
  | "randomness-pending"
  | "settled"
  | "refundable"
  | "error";
