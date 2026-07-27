export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type TokenTag =
  | "Trending"
  | "Community Pick"
  | "New"
  | "High Reward"
  | "Meme"
  | "Sponsored"
  | "Ecosystem";

/** Shape of one entry in data/tokens.generated.json (see scripts/fetch-tokens.mjs). */
export interface LiveTokenSnapshot {
  address: string;
  name: string;
  symbol: string;
  /** Hosted logo from the indexer. Null means fall back to drawn artwork. */
  logoUrl: string | null;
  priceUsd: number;
  liquidityUsd: number;
  fdvUsd: number;
  volume24hUsd: number;
  change24h: number;
  /** Explorer / chart deep link for this token. */
  url: string | null;
}

export interface RewardToken {
  id: string;
  name: string;
  symbol: string;
  rarity: Rarity;
  tags: TokenTag[];
  /** Reward range, whole token units. Derived from live price per band. */
  rewardMin: number;
  rewardMax: number;
  /**
   * Relative weight inside its rarity band. Displayed odds are derived from
   * this in lib/pool.ts — never author odds by hand.
   */
  weight: number;
  recentPulls: number;
  /** Live unit price, used for indicative reward values. */
  usdPerToken: number;
  /** Real Robinhood Chain contract address. */
  contract: string;
  /** Hosted logo. Null falls back to locally drawn artwork. */
  logoUrl: string | null;
  /** Chart / explorer link for this token, when the indexer supplied one. */
  chartUrl: string | null;
  blurb: string;
  sponsor?: string;
  addedDaysAgo: number;
  trendScore: number;
  /** Live 24h price change, percent. */
  change24h: number;
  liquidityUsd: number;
}
