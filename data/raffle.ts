/**
 * The Chimpers raffle, before its ticket mechanism exists.
 *
 * Everything here is a rule, in one file, the same discipline the NFT drop
 * follows: the terms are fixed and quotable, and no number appears that a
 * contract cannot yet stand behind. In particular there is no live countdown
 * and no ticket counter, because tickets are not on sale — a timer counting
 * down to a date nothing enforces, or a "0 / 200 sold" that can never move, is
 * exactly the manufactured-progress trick this project does not use.
 *
 * The prize lives on Ethereum and the platform on Robinhood Chain, so whatever
 * mechanism sells tickets, the Chimper itself is delivered by hand across
 * chains. That is stated plainly on the page rather than buried — it is the
 * one part of this that cannot be made trustless, and pretending otherwise
 * would be worse than owning it.
 */

export interface RaffleRule {
  label: string;
  value: string;
  hint?: string;
}

/**
 * The prize — one specific Chimper (token #2272), not a stand-in for the
 * collection. Its actual token artwork is shown on the page.
 */
export const RAFFLE_PRIZE = {
  name: "Chimper #2272",
  collection: "Chimpers",
  chain: "Ethereum",
  /** The exact token being raffled. */
  tokenId: "2272",
  /** The real artwork for token #2272, the prize itself. */
  image: "/chimper-2272.png",
  /** The canonical Chimpers contract on Ethereum, for anyone verifying the collection. */
  contract: "0x307af7d28afee82092aa95d35644898311ca5360",
} as const;

/**
 * Collection facts. Supply is a fixed property of the collection (5,555) and is
 * stated. Floor, volume and owners move by the minute and this file is not a
 * price feed, so rather than quote a stale snapshot they are left null and the
 * page links to OpenSea for the live numbers. The same honesty the rest of the
 * site keeps by reading from chain; here the chain is Ethereum, so only what is
 * genuinely fixed is quoted, and everything live is linked, not faked.
 */
export const RAFFLE_PRIZE_STATS: {
  asOf: string | null;
  floor: string | null;
  totalVolume: string | null;
  owners: string | null;
  supply: string | null;
} = {
  asOf: null,
  floor: null,
  totalVolume: null,
  owners: null,
  supply: "5,555",
};

/** Official Chimpers links, verified against the collection's own channels. */
export const RAFFLE_PRIZE_LINKS: {
  opensea: string;
  website: string;
  x: string;
  discord: string | null;
} = {
  opensea: "https://opensea.io/collection/chimpers",
  website: "https://chimpers.xyz/",
  x: "https://twitter.com/ChimpersNFT",
  // No verified public invite to link, so it stays null rather than guessed.
  discord: null,
};

export const RAFFLE_RULES: readonly RaffleRule[] = [
  { label: "Ticket price", value: "$10", hint: "Paid on Robinhood Chain when tickets open." },
  { label: "Max per wallet", value: "25 tickets" },
  { label: "Total tickets", value: "200" },
  { label: "Window", value: "24 hours", hint: "Runs for 24 hours once ticket sales open." },
  { label: "Winners", value: "1", hint: "Drawn only if all 200 tickets sell." },
] as const;

/**
 * The two outcomes, stated as a promise the page has to keep. The refund line
 * is the important one: it is the only protection a buyer has before a
 * trustless contract exists, so it is written as a guarantee, not a maybe.
 */
export const RAFFLE_OUTCOMES = {
  soldOut:
    "If all 200 tickets sell, one entry is drawn and that wallet receives Chimper #2272.",
  notSoldOut:
    "If fewer than 200 sell inside the 24 hours, every ticket is refunded in full. No draw, no deductions.",
} as const;
