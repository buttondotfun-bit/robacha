/**
 * Assets the operator has genuinely confirmed for the (coming-soon) Stock
 * Machine.
 *
 * This is the ONLY place a stock asset is treated as confirmed rather than "part
 * of the universe on Robinhood Chain". Everything here must be a real, verified
 * tokenized stock: the address is checked against Robinhood's own asset API and
 * must have real on-chain liquidity before it goes in. Confirming an asset flips
 * its reveal card from a sealed slot to a real logo, name and ticker.
 *
 * What confirming an asset does NOT do: it does not publish odds, pool
 * composition, pricing, a spin, or a launch date — none of that exists yet, and
 * the machine stays locked. "Confirmed" means "this asset is slated for the
 * machine", not "this is a live reward". Odds and pool are still published only
 * before launch.
 */
export interface ConfirmedStockAsset {
  symbol: string;
  name: string;
  /** Verified against Robinhood's rhj/assets — the canonical tokenized-stock contract. */
  address: `0x${string}`;
  /** The token's market page, so anyone can verify it independently. */
  marketUrl: string;
}

export const CONFIRMED_STOCK_ASSETS: ConfirmedStockAsset[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
    marketUrl: "https://dexscreener.com/robinhood/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
    marketUrl:
      "https://dexscreener.com/robinhood/0x8517f8071ae5b831b738052f12125e8e3d6c158b78728aa44ce3b25e5104d32e",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
    marketUrl: "https://dexscreener.com/robinhood/0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    address: "0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8",
    marketUrl: "https://dexscreener.com/robinhood/0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35",
    marketUrl: "https://dexscreener.com/robinhood/0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35",
  },
];
