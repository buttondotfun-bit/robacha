import type { Rarity } from "./token";

export interface RarityBand {
  rarity: Rarity;
  label: string;
  /** Probability of drawing this band, percent. Sums to 100. */
  probability: number;
  description: string;
  exampleRange: string;
  sampleTokenId: string;
}

export interface Pool {
  id: string;
  name: string;
  version: string;
  /** Total indicative value of remaining reward inventory, USD. */
  totalValueUsd: number;
  rewardSlots: number;
  /** Minutes until the next scheduled rotation, from page load. */
  refreshInMinutes: number;
  status: "live" | "refreshing" | "paused";
  /** Spin price in the chain's native currency. */
  pricePerSpinNative: number;
  networkFeeNote: string;
  randomnessStatus: string;
  contractStatus: string;
  inventoryStatus: string;
  probabilityUpdated: string;
}
