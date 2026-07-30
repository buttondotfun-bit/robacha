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
