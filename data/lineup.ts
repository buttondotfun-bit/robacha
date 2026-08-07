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
  chain?: "robinhood" | "bsc" | "ethereum";
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
    // Verified on Ethereum, not Robinhood Chain: symbol() reads FWA, name()
    // reads Fake World Assets, 18 decimals, ~999m supply, about $621k of
    // liquidity. eth_getCode at this address on Robinhood Chain returns empty,
    // so there is nothing here to hold or pay — the vault custodies Robinhood
    // Chain tokens and pays them out, and an address that is a real token on
    // one chain is nothing at all on another.
    //
    // Listed as watched rather than arriving, for the same reason as PIZZA. It
    // needs a Robinhood Chain representation before it can be a reward.
    symbol: "FWA",
    name: "Fake World Assets",
    address: "0xa0Df17B5aC76ABaBA36E1450E2cbCd18A620C845",
    chain: "ethereum",
    // The DEX index only resolves Robinhood Chain contracts, so a token on
    // another chain is invisible to it. Stored locally and served from our own
    // origin, as with PIZZA and SUSHI.
    logo: "/tokens/fwa.jpg",
  },
  {
    // symbol() and name() both read THROBBIN, 18 decimals, 1bn supply, and it
    // is a plain contract rather than a proxy. No V2 pair and nothing on the
    // Sushi V3 factory; its market is the 1% tier on the Gekko V3 factory,
    // holding 12.4 WETH — comparable to DERP and STONKBROKER, and reachable by
    // the route support already built. The V4 singleton holds another 334k
    // across sixteen pools, most of them junk fee tiers.
    symbol: "THROBBIN",
    name: "Throbbin",
    address: "0xe8fB470E0685437d7739BD2AacBA60b228800335",
  },
  {
    // symbol() reads MANCER and name() reads Mancer, 18 decimals, 2.5bn supply,
    // a plain contract rather than a proxy.
    //
    // The deepest market of anything queued or live: 95.8 WETH against 95.7m
    // tokens in the 1% tier on the Gekko V3 factory, where the next best is
    // STONKBROKER at 15.9. No V2 pair; the V4 singleton holds another 6.4m.
    // Same route shape as THROBBIN, so nothing new is needed to reach it.
    symbol: "MANCER",
    name: "Mancer",
    address: "0xc72F232a6869e6CF34dC06129AfFD07F8a2a246A",
  },
  {
    // Chosen deliberately from six contracts on this chain sharing the ticker.
    // symbol() reads HOODRAT and name() reads Hoodrat on this one, and its pair
    // on the AutoBuyer's default router is deep enough to restock through on
    // its own — about 88 ETH against 34.9m tokens, keeping ~99.7% of market
    // value on a test buy. It is also in the V4 singleton, which holds 4.1m of
    // it, so it can be reached either way.
    //
    // This card once said that made it better than PONS and TENDIES. It did
    // not: those two had deep V4 pools all along and are in the machine now.
    // The difference was never the token, only which venues had been looked at.
    symbol: "HOODRAT",
    name: "Hoodrat",
    address: "0x8e62F281f282686fCa6dCB39288069a93fC23F1c",
  },
];
