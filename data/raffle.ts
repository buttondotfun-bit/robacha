/**
 * The Meebit raffle, before its ticket mechanism exists.
 *
 * Everything here is a rule, in one file, the same discipline the NFT drop
 * follows: the terms are fixed and quotable, and no number appears that a
 * contract cannot yet stand behind. In particular there is no live countdown
 * and no ticket counter, because tickets are not on sale — a timer counting
 * down to a date nothing enforces, or a "0 / 200 sold" that can never move, is
 * exactly the manufactured-progress trick this project does not use.
 *
 * The prize lives on Ethereum and the platform on Robinhood Chain, so whatever
 * mechanism sells tickets, the Meebit itself is delivered by hand across
 * chains. That is stated plainly on the page rather than buried — it is the
 * one part of this that cannot be made trustless, and pretending otherwise
 * would be worse than owning it.
 */

export interface RaffleRule {
  label: string;
  value: string;
  hint?: string;
}

/** The prize. A real collection; the figures are marked as references, not quotes. */
export const RAFFLE_PRIZE = {
  name: "1 Meebit",
  collection: "Meebits",
  chain: "Ethereum",
  /**
   * The official Meebits brand mark, supplied by the operator. It stands for
   * the collection rather than claiming to be the specific prize token — the
   * exact Meebit is shown at the draw, which the page's caption says.
   */
  image: "/meebit-logo.png",
  /** The canonical Meebits contract on Ethereum, for anyone verifying the collection. */
  contract: "0x7Bd29408f11D2bFC23c34f18275bBf23bB716Bc7",
} as const;

/**
 * Collection stats, snapshotted from OpenSea with the date they were read.
 *
 * A floor and a volume move by the minute, and this file is not a price feed —
 * so each is stamped "as of" and the page links to OpenSea for the live number
 * rather than pretending this one is current. The same honesty the rest of the
 * site keeps by reading from chain; here the chain is Ethereum and the source
 * is OpenSea, so it is a dated snapshot, said to be one.
 */
export const RAFFLE_PRIZE_STATS = {
  asOf: "8 Aug 2026",
  floor: "0.36 ETH",
  totalVolume: "189.3K ETH",
  owners: "6,343",
  supply: "20,000",
} as const;

/** Official Meebits links, verified against the collection's own OpenSea page. */
export const RAFFLE_PRIZE_LINKS = {
  opensea: "https://opensea.io/collection/meebits",
  website: "https://meebits.app/",
  x: "https://twitter.com/MeebitsNFTs",
  discord: "https://discord.com/invite/meebits",
} as const;

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
    "If all 200 tickets sell, one entry is drawn and that wallet receives the Meebit.",
  notSoldOut:
    "If fewer than 200 sell inside the 24 hours, every ticket is refunded in full. No draw, no deductions.",
} as const;
