/**
 * The platform's standalone raffles — one entry per deployed `RobachaRaffle`.
 *
 * Everything here is a rule, in one file, the same discipline the NFT drop
 * follows: the terms are fixed and quotable, and no number appears that a
 * contract cannot stand behind. Each prize lives on Ethereum and the platform
 * on Robinhood Chain, so whatever sells the tickets, the NFT itself is
 * delivered by hand across chains — stated plainly rather than dressed up as
 * on-chain custody, because that is the one part that cannot be made trustless.
 *
 * There can be more than one live at once (e.g. a new featured raffle while an
 * earlier one is still winding down to its refunds), so this is a registry, not
 * a singleton: the address comes from `lib/config.ts`, and a raffle with no
 * address pinned simply doesn't appear.
 */

import type { Address } from "viem";
import { contracts } from "@/lib/config";

export interface RaffleRule {
  label: string;
  value: string;
  hint?: string;
}

export interface RafflePrize {
  /** Display name, e.g. "Chimper #2272" or "1 Meebit". */
  name: string;
  collection: string;
  chain: string;
  /** The exact token id when a specific token is the prize; null when the
   *  winning token is only revealed at the draw. */
  tokenId: string | null;
  image: string;
  /** The collection's Ethereum contract, for verifying the collection. */
  contract: string;
}

export interface RaffleStats {
  asOf: string | null;
  floor: string | null;
  totalVolume: string | null;
  owners: string | null;
  supply: string | null;
}

export interface RaffleLinks {
  opensea: string;
  website: string;
  x: string;
  discord: string | null;
}

export interface RaffleConfig {
  slug: string;
  /** The platform's headline raffle — leads the market and the cross-site promo. */
  featured: boolean;
  /** The RobachaRaffle contract, or null until one is pinned. */
  address: Address | null;
  /** Hero heading, e.g. "Win a Chimper." */
  headline: string;
  /** "Chimper" in "Win a Chimper". */
  shortName: string;
  /** Hero paragraph. */
  blurb: string;
  /** Mid-sentence noun phrase for the prize: "Chimper #2272" / "the Meebit". */
  prizePhrase: string;
  /** The collection's X handle label, e.g. "@ChimpersNFT". */
  xHandle: string;
  prize: RafflePrize;
  stats: RaffleStats;
  links: RaffleLinks;
  outcomes: { soldOut: string; notSoldOut: string };
  /** Prize-status body explaining the cross-chain hand-delivery. */
  deliveryNote: string;
}

/**
 * Chimper #2272 — the featured raffle. The prize is one specific token, so its
 * actual artwork is shown; supply (5,555) is a fixed fact and the live floor /
 * volume / owners are linked to OpenSea rather than snapshotted here.
 */
const CHIMPERS: RaffleConfig = {
  slug: "chimpers",
  featured: true,
  address: contracts.raffle,
  headline: "Win a Chimper.",
  shortName: "Chimper",
  blurb:
    "One sold-out draw. One wallet receives Chimper #2272 — a pixel-art character from the 5,555-piece Chimpers collection on Ethereum.",
  prizePhrase: "Chimper #2272",
  xHandle: "@ChimpersNFT",
  prize: {
    name: "Chimper #2272",
    collection: "Chimpers",
    chain: "Ethereum",
    tokenId: "2272",
    image: "/chimper-2272.png",
    contract: "0x307af7d28afee82092aa95d35644898311ca5360",
  },
  stats: {
    asOf: null,
    floor: null,
    totalVolume: null,
    owners: null,
    supply: "5,555",
  },
  links: {
    opensea: "https://opensea.io/collection/chimpers",
    website: "https://chimpers.xyz/",
    x: "https://twitter.com/ChimpersNFT",
    discord: null,
  },
  outcomes: {
    soldOut:
      "If all 200 tickets sell, one entry is drawn and that wallet receives Chimper #2272.",
    notSoldOut:
      "If fewer than 200 sell inside the 24 hours, every ticket is refunded in full. No draw, no deductions.",
  },
  deliveryNote:
    "Chimper #2272 is an Ethereum NFT, so the winner receives it by hand from the team after the draw — the one step the contract can't perform itself.",
};

/**
 * The Meebit — the earlier featured raffle, kept live on the site while it
 * winds down. Its own contract still sells and, if it doesn't sell out, refunds
 * every ticket in full. The winning token is revealed at the draw, so a dated
 * OpenSea snapshot (labelled as one) stands in for the collection.
 */
const MEEBIT: RaffleConfig = {
  slug: "meebit",
  featured: false,
  address: contracts.raffleMeebit,
  headline: "Win a Meebit.",
  shortName: "Meebit",
  blurb:
    "One sold-out draw. One wallet receives the Meebit — a voxel character from the 20,000-piece Meebits collection on Ethereum.",
  prizePhrase: "the Meebit",
  xHandle: "@MeebitsNFTs",
  prize: {
    name: "1 Meebit",
    collection: "Meebits",
    chain: "Ethereum",
    tokenId: null,
    image: "/meebit-logo.png",
    contract: "0x7Bd29408f11D2bFC23c34f18275bBf23bB716Bc7",
  },
  stats: {
    asOf: "8 Aug 2026",
    floor: "0.36 ETH",
    totalVolume: "189.3K ETH",
    owners: "6,343",
    supply: "20,000",
  },
  links: {
    opensea: "https://opensea.io/collection/meebits",
    website: "https://meebits.app/",
    x: "https://twitter.com/MeebitsNFTs",
    discord: "https://discord.com/invite/meebits",
  },
  outcomes: {
    soldOut:
      "If all 200 tickets sell, one entry is drawn and that wallet receives the Meebit.",
    notSoldOut:
      "If fewer than 200 sell inside the 24 hours, every ticket is refunded in full. No draw, no deductions.",
  },
  deliveryNote:
    "The Meebit is an Ethereum NFT, so the winner receives it by hand from the team after the draw — the one step the contract can't perform itself.",
};

/** Every platform raffle, featured first. */
export const RAFFLES: readonly RaffleConfig[] = [CHIMPERS, MEEBIT];

/** The headline raffle — what the cross-site promo and defaults point at. */
export const FEATURED_RAFFLE: RaffleConfig = CHIMPERS;

export function getRaffle(slug: string): RaffleConfig | undefined {
  return RAFFLES.find((r) => r.slug === slug);
}

/** The standalone raffles that actually have a contract pinned. */
export function configuredRaffles(): RaffleConfig[] {
  return RAFFLES.filter((r) => r.address !== null);
}

/**
 * The ticket terms, identical for every RobachaRaffle because the contract
 * hard-codes them (TICKET_CAP 200, MAX_PER_WALLET 25, WINDOW 24h, one winner).
 */
export const RAFFLE_RULES: readonly RaffleRule[] = [
  { label: "Ticket price", value: "$10", hint: "Paid on Robinhood Chain." },
  { label: "Max per wallet", value: "25 tickets" },
  { label: "Total tickets", value: "200" },
  { label: "Window", value: "24 hours", hint: "Runs for 24 hours from open." },
  { label: "Winners", value: "1", hint: "Drawn only if all 200 tickets sell." },
] as const;
