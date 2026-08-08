import type { Address } from "viem";

/**
 * The project's own token — the single source of truth for $ROB.
 *
 * Every identity field here was read from the contract on Robinhood Chain
 * rather than copied from a listing: `symbol()` returns ROB, `name()` returns
 * Robacha, `decimals()` returns 18, and `totalSupply()` returns 1e27, which at
 * 18 decimals is one billion whole tokens. Nothing is rounded or restated.
 *
 * The reason the address is published so plainly is impersonation. A ticker is
 * not ownable, and a memecoin with any attention gets copies deployed under the
 * same symbol within hours — this codebase already carries the scars, since
 * HOODRAT alone has six contracts on this chain sharing its ticker and the
 * lineup had to name the right one explicitly. The only thing that
 * distinguishes the real token from a copy is the address, so the address is
 * stated in full, from our own origin, next to a link that lets someone check
 * it against the explorer instead of taking our word for it. That is what
 * `isOfficialRobToken` is for: nothing in the app should render another
 * address as $ROB.
 *
 * What $ROB actually does in the product, all verifiable on chain and none of
 * it asserted here as a value or a promise:
 *   - it can be spent to spin — the player's own wallet swaps ROB for exactly
 *     the ETH a spin costs, then spins (see `lib/use-rob-zap.ts`); the machine
 *     itself is still priced in native ETH;
 *   - it can be a reward a pool pays out, when a live pool's reward slots
 *     include this address;
 *   - protocol margin funds a keeper buyback that sends ROB to a dead address
 *     (see `lib/server/rob-burn.ts`), a running total anyone can read.
 *
 * What stays deliberately absent from this file: price, market cap, holder
 * count, 24h volume — live market values this module has no business
 * asserting. Those are fetched at the edge, shown only when a liquid pair backs
 * them, and rendered as "—" otherwise.
 */
export const ROB_TOKEN = {
  symbol: "ROB",
  name: "Robacha",
  address: "0x7B7D785a2BA95d39F97FCe44f5B2169895855b7E" as Address,
  decimals: 18,
  /** Whole tokens. `totalSupply()` reads 1e27 against 18 decimals. */
  totalSupply: 1_000_000_000,
  /**
   * The ROB/WETH pool that is $ROB's market — Gekko V3 at the 1% tier, the same
   * pool the pay-in-ROB swap and the keeper buyback trade against. Its price and
   * liquidity are what the market modules read; there is no other ROB pool.
   */
  pairAddress: "0x1490b8cB62e567F862DeC48E4C100e2DBFb10092" as Address,
  /** This site's own $ROB hub. */
  route: "/rob",
} as const;

/**
 * Just the address as a bare `Address`, for the swap layer and contract reads
 * that want the literal rather than the whole descriptor. Re-exported by
 * `lib/rob-payment.ts` as `ROB_TOKEN` so the address exists in exactly one
 * place.
 */
export const ROB_TOKEN_ADDRESS: Address = ROB_TOKEN.address;

/** DexScreener's slug for Robinhood Chain — matches the API route's chain id. */
const DEXSCREENER_CHAIN = "robinhood";

/**
 * The live chart + market page for the ROB/WETH pair. DexScreener rather than a
 * DEX deep link because it is the one URL that reliably exists, shows the real
 * market, and routes on to a swap — inventing a swap-UI link that may 404 would
 * be worse than sending someone somewhere that works.
 */
export const ROB_MARKET_URL = `https://dexscreener.com/${DEXSCREENER_CHAIN}/${ROB_TOKEN.pairAddress}`;

/**
 * Whether `address` is the one official $ROB contract. Case-insensitive, and
 * safe on null/undefined so callers can pass a possibly-missing reward-slot
 * address straight in. This is the only sanctioned way to decide that a token
 * on screen is $ROB — never compare by ticker, since copies share it.
 */
export function isOfficialRobToken(
  address: string | null | undefined,
): boolean {
  return (
    typeof address === "string" &&
    address.toLowerCase() === ROB_TOKEN.address.toLowerCase()
  );
}
