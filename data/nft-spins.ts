/**
 * Collections shown in the NFT-spins teaser reel.
 *
 * Every entry is a real ERC-721 on Robinhood Chain, picked by the operator:
 * the collections behind tokens already in the live machine (MANCER,
 * STONKBROKER, CASHCAT) plus PitBoys. Each was named via its OpenSea page,
 * resolved to an address, and then verified against this chain before being
 * written down — name(), symbol() and the ERC-721 interface all read back
 * from the contract itself.
 *
 * These are candidates, not confirmed prizes, and the page says so. The rule
 * is the same one the upcoming-token lineup follows: names may be listed
 * before a contract exists, numbers may not. No floor prices, holder counts,
 * odds or amounts here — the moment a real machine exists, its actual prize
 * list and odds get published from the contract, and this file stops being
 * the source of anything.
 *
 * Addresses are the identity; names are display only. If a collection needs
 * to be dropped or added, this is the only place to touch.
 */
export interface NftSpinCandidate {
  address: `0x${string}`;
  name: string;
  symbol: string;
  /**
   * A sample of the collection's own artwork, stored locally.
   *
   * Each image is what the collection's contract itself serves: tokenURI was
   * read on chain, the metadata followed to its image — on-chain SVG, IPFS,
   * or the project's own API — and the result saved here, downscaled where
   * raster. Stored rather than hotlinked for the usual two reasons: the
   * artwork cannot change under us, and no third party learns who is looking.
   * The SVGs were checked for script vectors before being committed.
   */
  image: string;
  /** The collection's OpenSea page, as supplied by the operator. */
  opensea: string;
}

export const NFT_SPIN_CANDIDATES: readonly NftSpinCandidate[] = [
  {
    address: "0x797A2e030b7E49107C8F07Bf0300EA9caE88ca57",
    name: "Chain Mancers",
    opensea: "https://opensea.io/collection/chain-mancers",
    image: "/nft-collections/chain-mancers.svg",
    symbol: "MANCERS",
  },
  {
    address: "0x539CDd042C2F3d93eBC5bE7DFfF0c79F3b4FABf0",
    name: "StonkBrokers",
    opensea: "https://opensea.io/collection/stonkbrokers-434284142",
    image: "/nft-collections/stonkbrokers.svg",
    symbol: "STONK",
  },
  {
    address: "0xE3b34C4bb0F12C82143745eEe6A6CF4E3154b1fa",
    name: "CASHCAT",
    opensea: "https://opensea.io/collection/cashcatss",
    image: "/nft-collections/cashcat.png",
    symbol: "CASHCAT",
  },
  {
    address: "0x57069d845701B50F41327362C1c23789043f8DEc",
    name: "PitBoys",
    opensea: "https://opensea.io/collection/pitboys",
    image: "/nft-collections/pitboys.svg",
    symbol: "PITBOY",
  },
] as const;
