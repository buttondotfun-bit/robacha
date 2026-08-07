/**
 * Collections shown in the NFT-spins teaser reel.
 *
 * Every entry is a real ERC-721 on Robinhood Chain, verified by reading
 * `name()` and `symbol()` from the contract before being written down.
 * Selection is the top collections by holder count on the chain's own
 * explorer, minus two categories that would be dishonest to show:
 * infrastructure NFTs (Uniswap position tokens — huge holder counts, not
 * collectibles) and obvious spam (a collection literally named
 * "# IMPORTANT ALERT" does not go on our site).
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
}

export const NFT_SPIN_CANDIDATES: readonly NftSpinCandidate[] = [
  // ---- Operator-picked, first in the reel. ----
  // The collections behind tokens already in the live machine (MANCER,
  // STONKBROKER, CASHCAT) plus PitBoys. Named by the operator via their
  // OpenSea pages; the addresses were resolved from those pages and then
  // verified on this chain — name(), symbol() and the ERC-721 interface all
  // read back from the contract before being written down.
  {
    address: "0x797A2e030b7E49107C8F07Bf0300EA9caE88ca57",
    name: "Chain Mancers",
    symbol: "MANCERS",
  },
  {
    address: "0x539CDd042C2F3d93eBC5bE7DFfF0c79F3b4FABf0",
    name: "StonkBrokers",
    symbol: "STONK",
  },
  {
    address: "0xE3b34C4bb0F12C82143745eEe6A6CF4E3154b1fa",
    name: "CASHCAT",
    symbol: "CASHCAT",
  },
  {
    address: "0x57069d845701B50F41327362C1c23789043f8DEc",
    name: "PitBoys",
    symbol: "PITBOY",
  },
  // ---- Top of the chain's explorer by holders, after the partners. ----
  {
    address: "0x6Ca58412EcA6F46E0A423a43B7E3ECdb2dE578A9",
    name: "/dev/daemons",
    symbol: "DAEMON",
  },
  {
    address: "0xAFE255DB0cf73a96977297C9F421EC5676050711",
    name: "'Much Good for Poor Dogs' by Hood Inu",
    symbol: "HOODINU",
  },
  {
    address: "0x2ef6501dd3b8Dc4Ffc5F3385902b9E7B3dBead25",
    name: "Monsters",
    symbol: "MONSTER",
  },
  {
    address: "0x505Ff588f148721867a8dc61C79DdfD4B22ec318",
    name: "Green Market Operators",
    symbol: "GMOP",
  },
  {
    address: "0x34B4Cf2fB036247058c7154499127DD951D47Eaa",
    name: "Robinhood Distorted",
    symbol: "RHD",
  },
  {
    address: "0x10D17578E519015A671A553377eA33bf90066f8e",
    name: "MechVoid",
    symbol: "MECH",
  },
] as const;
