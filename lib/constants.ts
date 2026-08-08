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

/**
 * `walletOnly` links are hidden until a wallet is connected.
 *
 * Filtering happens only after mount, so the server and the first client
 * render agree on "not connected" and hydration stays clean. The pages
 * themselves are never gated — hiding a link is a navigation choice, not
 * access control, and every route stays reachable by URL.
 */
export interface NavLink {
  label: string;
  href: string;
  walletOnly?: boolean;
}

export const SITE_NAV: readonly NavLink[] = [
  { label: "Home", href: "/" },
  { label: "NFTs", href: "/nft" },
  { label: "NFT Spins", href: "/nft-spins" },
  { label: "Raffle", href: "/raffle" },
  { label: "Launchpad", href: "/launchpad" },
  { label: "Rewards", href: "/rewards", walletOnly: true },
  { label: "Activity", href: "/activity", walletOnly: true },
];

export const APP_NAV: readonly NavLink[] = [
  { label: "Spin", href: "/app" },
  { label: "NFT Spins", href: "/nft-spins" },
  { label: "Raffle", href: "/raffle" },
  { label: "Launchpad", href: "/launchpad" },
  { label: "Rewards", href: "/rewards", walletOnly: true },
  { label: "My Bag", href: "/bag", walletOnly: true },
  { label: "Activity", href: "/activity", walletOnly: true },
];

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

/**
 * Social destinations. Only accounts that actually exist are listed — an
 * unlinked icon is worse than no icon.
 */
export const SOCIAL_LINKS = [
  { label: "X", handle: "@robachadotfun", href: "https://www.x.com/robachadotfun" },
] as const;
