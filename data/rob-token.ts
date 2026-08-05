import type { Address } from "viem";

/**
 * The project's own token.
 *
 * Every field here was read from the contract on Robinhood Chain rather than
 * copied from a listing: `symbol()` returns ROB, `name()` returns Robacha,
 * `decimals()` returns 18, and `totalSupply()` returns 1e27, which at 18
 * decimals is one billion whole tokens. Nothing is rounded or restated.
 *
 * The reason this is published at all is impersonation. A ticker is not
 * ownable, and a memecoin with any attention gets copies deployed under the
 * same symbol within hours — this codebase already carries the scars, since
 * HOODRAT alone has six contracts on this chain sharing its ticker and the
 * lineup had to name the right one explicitly. The only thing that
 * distinguishes the real token from a copy is the address, so the address is
 * stated plainly, in full, from our own origin, next to a link that lets
 * someone check it against the explorer instead of taking our word for it.
 *
 * What is deliberately absent: price, market cap, holder count, and any claim
 * about what the token will do. Those are either live market values this file
 * has no business asserting, or promises about the future. $ROB currently has
 * no function inside the product — the gacha is priced in native ETH and the
 * contract has no ERC-20 payment path — so describing it as powering anything
 * would be a claim the contracts do not support.
 */
export const ROB_TOKEN = {
  symbol: "ROB",
  name: "Robacha",
  address: "0x7B7D785a2BA95d39F97FCe44f5B2169895855b7E" as Address,
  decimals: 18,
  /** Whole tokens. `totalSupply()` reads 1e27 against 18 decimals. */
  totalSupply: 1_000_000_000,
} as const;
