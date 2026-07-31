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
 *   1. The date below is a real target, not a rolling one. It is a fixed
 *      instant and the countdown does not restart when it passes — if the date
 *      slips, change it here and say so. A timer that quietly resets is the
 *      oldest trick in this category and it is worth more to be the project
 *      that does not do it.
 *   2. No prize values on the spendable tiers until a vault exists to pay
 *      them. Odds and ranges get published before minting opens, from the
 *      contract, exactly as every pool's are.
 */

/** Planned open of the mint window. A fixed instant — see rule 1 above. */
export const NFT_MINT_OPENS_AT = "2026-08-14T16:00:00Z";

/** Planned mint price in US dollars. */
export const NFT_MINT_PRICE_USD = 50;

/** Planned total supply. Every tier count below sums to exactly this. */
export const NFT_TOTAL_SUPPLY = 500;

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
      "We'll publish the exact odds and prize range on chain before minting opens, and you'll be able to read them yourself the same way you can read every pool on this site today. We're not putting a figure on it before the vault behind it exists — that number has to be one you can check, not one we assert.",
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
