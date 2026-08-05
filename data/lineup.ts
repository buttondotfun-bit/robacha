import type { Address } from "viem";

/**
 * Tokens lined up for the machine that are not in it yet.
 *
 * What is *already* in the machine is never listed here — that half is read
 * live from the pool contract, so it cannot drift out of date or claim a token
 * the machine does not actually hold. This file is only for the ones we intend
 * to add, which is a statement about the future and therefore cannot be read
 * from anywhere.
 *
 * Two rules keep that honest:
 *
 *   1. Every address here has had `symbol()` checked against its ticker on
 *      Robinhood Chain. Several tickers have multiple contracts using them —
 *      HOODRAT alone has six — and shipping the wrong one would mean the
 *      AutoBuyer buying an impostor and handing it out as a prize.
 *   2. No odds, amounts or dates. Those do not exist until a pool version is
 *      published with the token in it, and inventing them to make a card look
 *      finished would put fabricated product values on a site whose whole
 *      promise is that every figure comes from a contract.
 *
 * `allowlisted` reflects `allowlistedTokens()` on the registry at the time of
 * writing and is re-read live by the component, never trusted from here.
 */
export interface LineupToken {
  symbol: string;
  name: string;
  address: Address;
  /**
   * Where the contract at `address` actually lives.
   *
   * Defaults to Robinhood Chain because that is the only chain the machine
   * reads or pays on. A token from anywhere else cannot be a reward at that
   * address — the vault holds Robinhood Chain tokens and pays them out — so
   * anything marked otherwise is announced as watched rather than as next in,
   * and the interface says which chain it is on rather than letting a valid
   * looking address imply it is ready.
   */
  chain?: "robinhood" | "bsc";
  /**
   * Path to a locally stored logo.
   *
   * Only needed for tokens the DEX index cannot resolve. Robinhood Chain
   * tokens get their artwork from the live token index by address; anything on
   * another chain is invisible to it, so its logo is stored here instead —
   * served from our own origin rather than hotlinked, the same as the
   * testimonial avatar.
   */
  logo?: string;
}

export const LINEUP: LineupToken[] = [
  {
    symbol: "PONS",
    name: "Pons",
    address: "0x39dBED3a2bd333467115dE45665cC57F813C4571",
  },
  {
    symbol: "TENDIES",
    name: "Tendies",
    address: "0x45242320DBB855EeA8Fd36804C6487E10E97FCF9",
  },
  {
    // Verified on BNB Chain, not Robinhood Chain: symbol() and name() both read
    // PIZZA, 18 decimals, 1bn supply, about $92k of liquidity on PancakeSwap.
    // There is no contract at this address on Robinhood Chain — eth_getCode
    // returns empty — so it cannot be a reward here as it stands. It needs a
    // Robinhood Chain representation first, and until one exists this is
    // listed as something we are watching rather than something arriving.
    symbol: "PIZZA",
    name: "Pizza",
    address: "0x8554D38b95E4F7Ca11D391008627Df30B2b07777",
    chain: "bsc",
    // Official artwork, taken from the token's own listing and stored locally.
    // Cross-checked against the project it belongs to before being used:
    // pizzabtc.meme and @PizzaBTC7777, matching the contract's 7777 tail.
    logo: "/tokens/pizza.jpg",
  },
  {
    // symbol() reads DICE and name() reads Dice Protocol on this contract,
    // 18 decimals, 1bn supply. Its market is a Uniswap V3 pool at the 1% tier
    // holding 7.7 WETH against 152m tokens — the deepest V3 pool of any
    // candidate here, ROB included — plus 21.7m more in the V4 singleton. It
    // has no V2 pair at all, which matters only because that is the venue the
    // AutoBuyer reaches first; the V3 route it needs is already supported.
    symbol: "DICE",
    name: "Dice Protocol",
    address: "0x3F9f0b6073Ee8c495Aed96869AF31850fED40FeB",
  },
  {
    // Chosen deliberately from six contracts on this chain sharing the ticker.
    // symbol() reads HOODRAT and name() reads Hoodrat on this one, and unlike
    // PONS and TENDIES its pair on the AutoBuyer's router is deep enough to
    // restock through — about 88 ETH against 34.9m tokens, keeping ~99.7% of
    // market value on a test buy.
    symbol: "HOODRAT",
    name: "Hoodrat",
    address: "0x8e62F281f282686fCa6dCB39288069a93fC23F1c",
  },
];
