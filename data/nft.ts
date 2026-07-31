/**
 * The capsule drop, before it exists.
 *
 * Everything here is a plan. There is no contract, no artwork on chain and no
 * vault behind the legendary mechanic, so unlike every other figure on this
 * site none of it can be read from anywhere. That is why it lives in one file:
 * the speculative numbers stay quarantined from the ones the chain answers for.
 *
 * Two rules for anything added here:
 *
 *   1. The date below is a real target, not a rolling one. It is a fixed
 *      instant and the countdown does not restart when it passes — if the date
 *      slips, change it here and say so. A timer that quietly resets is the
 *      oldest trick in this category and it is worth more to be the project
 *      that does not do it.
 *   2. No prize values on the legendary mechanic until a vault exists to pay
 *      them. Odds and ranges get published before minting opens, from the
 *      contract, exactly as every pool's are.
 */

/** Planned open of the mint window. A fixed instant — see rule 1 above. */
export const NFT_MINT_OPENS_AT = "2026-08-07T16:00:00Z";

/** Planned mint price in US dollars. */
export const NFT_MINT_PRICE_USD = 50;

export interface NftTier {
  key: "common" | "rare" | "legendary";
  name: string;
  blurb: string;
}

/**
 * Tiers mirror the machine's, so a capsule reads the same way a pull does.
 * No supply figures: those are set in the contract, and quoting a number here
 * before one is deployed would be inventing it.
 */
export const NFT_TIERS: NftTier[] = [
  {
    key: "common",
    name: "Common",
    blurb: "The everyday capsule. Yours to hold, trade, or sit on.",
  },
  {
    key: "rare",
    name: "Rare",
    blurb: "Scarcer artwork, and the tier most likely to move on the market.",
  },
  {
    key: "legendary",
    name: "Legendary",
    blurb:
      "The one with a second life. Hand it back to the machine and spin it for a pull from a bigger pool.",
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
    title: "Spin a legendary",
    body: "Feed a legendary back into the machine and pull from a bigger pool than a standard spin draws on. The odds and the prize range go on chain before minting opens, so you can read them before you decide.",
  },
];

export interface NftFact {
  question: string;
  answer: string;
}

export const NFT_FACTS: NftFact[] = [
  {
    question: "What actually is a Robacha capsule?",
    answer:
      "An NFT on Robinhood Chain that lives in your wallet. We can't move it, freeze it or take it back — the same way the tokens the machine pays out are yours the moment they're assigned.",
  },
  {
    question: "What makes a legendary different?",
    answer:
      "Every capsule can be traded. A legendary can also be spent: hand it back to the machine and it becomes a pull from a bigger prize pool. That's the whole reason the tier exists.",
  },
  {
    question: "How much will a legendary pay out?",
    answer:
      "We'll publish the exact odds and prize range on chain before minting opens, and you'll be able to read them yourself the same way you can read every pool on this site today. We're not putting a figure on it before the vault behind it exists.",
  },
  {
    question: "How many are there?",
    answer:
      "Supply is fixed in the contract at deployment, and we'll point you straight at it rather than asking you to take a number on trust.",
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
