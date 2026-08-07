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
  supply: "20,000",
  /** Reference only, and labelled as such — a floor moves, and this file is not a price feed. */
  floorReference: "~0.36 ETH",
  openseaUrl: "https://opensea.io/collection/meebits",
  /** The canonical Meebits contract on Ethereum, for anyone verifying the collection. */
  contract: "0x7Bd29408f11D2bFC23c34f18275bBf23bB716Bc7",
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
