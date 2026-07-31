/**
 * The NFT drop, before it exists.
 *
 * Everything here is intention. There is no contract, no mint, no artwork on
 * chain and no vault behind the legendary mechanic — so unlike every other
 * figure on this site, none of this can be read from anywhere. That is exactly
 * why it is quarantined in one file and labelled as a plan on the page.
 *
 * Two rules for anything added here:
 *
 *   1. No supply counts, no mint progress, no holder numbers, no countdown to
 *      a date nobody has committed to. A fake counter on an unlaunched drop is
 *      the single most common lie in this category.
 *   2. No prize values. The legendary mechanic is deliberately described by
 *      what it does rather than by what it pays, because the payout depends on
 *      a vault that does not exist yet. Odds and ranges get published before
 *      minting opens, the same way every pool's are — and at that point they
 *      come from the contract like everything else.
 *
 * The price is a stated plan and is marked as one. It is the operator's own
 * decision to publish, and it can change before launch.
 */

export interface NftStep {
  title: string;
  body: string;
}

/** Planned mint price, in US dollars. Stated as intent, not a commitment. */
export const NFT_MINT_PRICE_USD = 50;

export const NFT_STEPS: NftStep[] = [
  {
    title: "Mint a capsule",
    body: `Minting opens at $${NFT_MINT_PRICE_USD}. Every one is a Robacha capsule you own outright — it sits in your wallet, not in an account we control.`,
  },
  {
    title: "Trade them freely",
    body: "They're ordinary NFTs on Robinhood Chain. Sell one, buy one, hold it, send it to a friend — none of that needs our permission and none of it goes through us.",
  },
  {
    title: "Feed a legendary back in",
    body: "Legendary capsules can be handed back to the machine and spun. That pull draws from a bigger prize pool than a normal spin — and like every pool here, its odds and prize range get published before anyone can mint.",
  },
];
