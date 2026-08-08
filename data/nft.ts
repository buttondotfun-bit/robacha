/**
 * The capsule drop, before it exists.
 *
 * Everything here is a plan. There is no contract, no artwork on chain and no
 * vault behind the spendable tiers, so unlike every other figure on this site
 * none of it can be read from anywhere. That is why it lives in one file: the
 * speculative numbers stay quarantined from the ones the chain answers for.
 *
 * Two rules for anything added here:
 *
 *   1. The date below is a real target, not a rolling one. Nothing renders
 *      it any more — the site says "follow X" and the date gets announced
 *      once, when it is certain. It stays here as the internal target so the
 *      plan has a written-down instant, and the old rule still applies the
 *      day it is published: a fixed date, changed loudly or not at all. A
 *      timer that quietly resets is the oldest trick in this category and it
 *      is worth more to be the project that does not do it.
 *   2. No prize values on the spendable tiers until a vault exists to pay
 *      them. Odds and ranges get published before minting opens, from the
 *      contract, exactly as every pool's are.
 */

import { ROB_TOKEN_ADDRESS } from "./rob-token";

/** Planned open of the mint window, internal only — see rule 1 above. */
export const NFT_MINT_OPENS_AT = "2026-08-14T16:00:00Z";

/** Planned mint price in US dollars. */
export const NFT_MINT_PRICE_USD = 50;

/** Planned total supply. Every tier count below sums to exactly this. */
export const NFT_TOTAL_SUPPLY = 500;

/**
 * Share of mint revenue going into the prize vault.
 *
 * Not invented for this page: 85% is the split the live pool publishes and has
 * been running on since launch — `rewardReserveBps` reads 8500 on chain today,
 * with 12% to the protocol and 3% to running costs. The mint is planned to use
 * the same one, which is why the funding figures below can be shown as
 * arithmetic rather than asserted.
 */
export const NFT_VAULT_SHARE = 0.85;

/** What a given sell-through puts into the prize vault. */
export function vaultAt(fractionSold: number): number {
  return Math.round(
    NFT_TOTAL_SUPPLY * fractionSold * NFT_MINT_PRICE_USD * NFT_VAULT_SHARE,
  );
}

/** Sell-through scenarios shown on the page. */
export const NFT_FUNDING_SCENARIOS = [0.25, 0.5, 1] as const;

/**
 * Tokens the mint is planned to accept.
 *
 * Addresses verified on chain — `symbol()` read back against the ticker before
 * being written here, which matters on a chain where several tickers have more
 * than one contract using them. The native token is listed separately because
 * it has no contract address.
 *
 * Prices are read live from the token index at render, so the page never
 * hardcodes a conversion. Any of these whose price cannot be read reliably
 * shows as accepted without an amount rather than with a guessed one.
 */
export interface NftPaymentToken {
  symbol: string;
  /** Null for the chain's native token. */
  address: `0x${string}` | null;
}

export const NFT_PAYMENT_TOKENS: NftPaymentToken[] = [
  { symbol: "ETH", address: null },
  // $ROB is the only listed-token payment path the mint accepts. Address pulled
  // from the canonical descriptor so it lives in exactly one place.
  { symbol: "ROB", address: ROB_TOKEN_ADDRESS },
];

export interface NftTier {
  key: "common" | "rare" | "legendary" | "grail";
  name: string;
  supply: number;
  blurb: string;
  /** True where the capsule can be spent in the machine rather than only held. */
  spendable?: boolean;
}

/**
 * Supply split.
 *
 * Deliberately laid over the machine's own 70 / 25 / 5 ladder, so a capsule
 * reads exactly the way a pull does. The top 5% — twenty-five capsules — is
 * then split again: twenty-two Legendary and the three Grails.
 *
 * 350 + 125 + 22 + 3 = 500.
 */
export const NFT_TIERS: NftTier[] = [
  {
    key: "common",
    name: "Common",
    supply: 350,
    blurb:
      "The everyday capsule, and most of the collection. Yours to hold, trade, or sit on until the floor decides otherwise.",
  },
  {
    key: "rare",
    name: "Rare",
    supply: 125,
    blurb:
      "A quarter of the run. Scarcer artwork, and the tier most likely to actually move on the market.",
  },
  {
    key: "legendary",
    name: "Legendary",
    supply: 22,
    spendable: true,
    blurb:
      "Twenty-two exist. A legendary can be handed back to the machine and spun, drawing from a bigger pool than a standard spin reaches.",
  },
  {
    key: "grail",
    name: "Grail",
    supply: 3,
    spendable: true,
    blurb:
      "Three. That is the entire supply, and there will never be more. A Grail spins against the deepest pool the machine can hold — the tier the whole collection is built around.",
  },
];

export interface NftPhase {
  label: string;
  title: string;
  body: string;
}

export const NFT_PHASES: NftPhase[] = [
  {
    label: "Phase 01",
    title: "Mint",
    body: `Capsules open at $${NFT_MINT_PRICE_USD}. Same wallet, same chain, no account to make — you mint straight from the page and it lands in your wallet.`,
  },
  {
    label: "Phase 02",
    title: "Trade",
    body: "They're ordinary NFTs on Robinhood Chain from the moment they're yours. Sell, buy, gift or hold — none of it needs our permission and none of it routes through us.",
  },
  {
    label: "Phase 03",
    title: "Spend a Legendary or a Grail",
    body: "Feed one back into the machine and it becomes a pull from a deeper pool than a standard spin draws on. The odds and the prize range go on chain before minting opens, so you can read them before you decide.",
  },
];

export interface NftFact {
  question: string;
  answer: string;
}

export const NFT_FACTS: NftFact[] = [
  {
    question: "How many capsules are there?",
    answer: `${NFT_TOTAL_SUPPLY} in total, and the number is fixed in the contract — 350 Common, 125 Rare, 22 Legendary and 3 Grails. Once it's deployed we'll link you straight at it rather than asking you to take the split on trust.`,
  },
  {
    question: "What actually is a Robacha capsule?",
    answer:
      "An NFT on Robinhood Chain that lives in your wallet. We can't move it, freeze it or take it back — the same way the tokens the machine pays out are yours the moment they're assigned.",
  },
  {
    question: "What makes a Grail different from a Legendary?",
    answer:
      "Both can be spent in the machine. A Legendary draws from a bigger pool than a normal spin; a Grail draws from the deepest one there is. With three in existence, spending one is a decision — the capsule is gone and the pull is what you're left with.",
  },
  {
    question: "How much does a Grail pull pay?",
    answer:
      "Work it out from the mint. Half the collection selling puts about $10,600 into the prize vault, and only 25 capsules can be spent against it — three of them Grails. That is what makes four-figure Grail pulls reachable rather than aspirational. The exact odds and ranges still go on chain before minting opens, and those are the numbers that bind, not this page.",
  },
  {
    question: "What happens to the mint proceeds?",
    answer:
      "The same split the machine already publishes: the majority goes into the prize vault that backs payouts, with the rest covering the protocol and running costs. It'll be visible on chain like the current one.",
  },
  {
    question: "Can I still spin without one?",
    answer:
      "Yes. The machine is live now and works exactly as it does today. Capsules add a route in, they don't gate the one that already exists.",
  },
];
