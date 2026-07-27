import type { Rarity } from "@/types/token";

export const BRAND = {
  name: "ROBACHA",
  wordmark: "robacha",
  descriptor: "The memecoin gacha on Robinhood Chain.",
  claim: "The first dedicated memecoin reward gacha built for Robinhood Chain.",
  tagline: "Spin. Pull. Earn.",
  chain: "Robinhood Chain",
  builtOn: "Built on Robinhood Chain",
} as const;

export const SITE_NAV = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Rewards", href: "/rewards" },
  { label: "Activity", href: "/activity" },
  { label: "FAQ", href: "/faq" },
] as const;

export const APP_NAV = [
  { label: "Spin", href: "/app" },
  { label: "Rewards", href: "/rewards" },
  { label: "My Bag", href: "/bag" },
  { label: "Activity", href: "/activity" },
] as const;

export const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/** Rank used for "Rare+" filters and rarity sorting. */
export const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/** Spin quantity bounds used by the selector and the spin transaction. */
export const SPIN_MIN = 1;
export const SPIN_MAX = 10;
export const SPIN_SHORTCUTS = [1, 3, 5] as const;

export const RISK_NOTICE =
  "Token rewards may fluctuate in value. Review the active Robacha reward pool, published probabilities and transaction details before participating.";

/** Local UI preferences only. No balances or rewards are stored client-side. */
export const STORAGE_KEY = "robacha.prefs.v1";
