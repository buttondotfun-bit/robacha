import type { Address } from "viem";
import { NFT_SPIN_CANDIDATES } from "./nft-spins";

/**
 * The verified-collections registry for the raffle hub.
 *
 * The hub is permissionless: anyone can escrow any ERC-721 and raffle it. The
 * escrow contract guarantees the winner receives *that exact token* — but not
 * that the token is from a genuine, valuable collection rather than a
 * counterfeit contract copying a famous one's name and art. That second half is
 * this file's job.
 *
 * The rule that makes it work: a collection's identity is its **contract
 * address**, never its name or image. A verified collection is one whose
 * canonical address on Robinhood Chain is listed here. Everything else is
 * unverified by default and the UI says so loudly. A collection whose on-chain
 * name mimics a verified one but sits at a different address is an impersonator,
 * flagged harder still.
 *
 * Seeded from the same real, on-chain-checked collections the NFT-spins reel
 * draws from (name(), symbol() and the ERC-721 interface all read back from the
 * contract). Add a collection only after resolving and checking its address —
 * this list is the difference between a green badge and a warning.
 */

export interface VerifiedCollection {
  /** Canonical contract address on Robinhood Chain. The identity. */
  address: Address;
  name: string;
  symbol: string;
  /** The collection's own marketplace page, for independent verification. */
  opensea?: string;
}

export const VERIFIED_COLLECTIONS: readonly VerifiedCollection[] = NFT_SPIN_CANDIDATES.map((c) => ({
  address: c.address,
  name: c.name,
  symbol: c.symbol,
  opensea: c.opensea,
}));

const BY_ADDRESS = new Map(VERIFIED_COLLECTIONS.map((c) => [c.address.toLowerCase(), c]));

/** Fold a display name/symbol to a comparable key: lowercase, alphanumerics only. */
function nameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const BY_NAMEKEY = new Map<string, VerifiedCollection>();
for (const c of VERIFIED_COLLECTIONS) {
  BY_NAMEKEY.set(nameKey(c.name), c);
  BY_NAMEKEY.set(nameKey(c.symbol), c);
}

export function verifiedCollection(address: string | null | undefined): VerifiedCollection | undefined {
  if (!address) return undefined;
  return BY_ADDRESS.get(address.toLowerCase());
}

export function isVerifiedCollection(address: string | null | undefined): boolean {
  return Boolean(verifiedCollection(address));
}

export type CollectionTrust = "verified" | "unverified" | "impersonator";

export interface CollectionCheck {
  trust: CollectionTrust;
  /** The matched verified collection, when `trust === "verified"`. */
  collection?: VerifiedCollection;
  /** The verified collection being mimicked, when `trust === "impersonator"`. */
  impersonates?: VerifiedCollection;
}

/**
 * Classify a raffle's collection.
 *
 * `onchainName` (from the contract's own name(), when known) enables
 * impersonation detection: a contract that isn't verified but whose name/symbol
 * collides with a verified collection is calling itself something it isn't.
 * Address is always the ground truth — a name match never upgrades trust, it
 * only downgrades it to a warning.
 */
export function checkCollection(
  address: string | null | undefined,
  onchainName?: string | null,
): CollectionCheck {
  const verified = verifiedCollection(address);
  if (verified) return { trust: "verified", collection: verified };

  if (onchainName) {
    const mimicked = BY_NAMEKEY.get(nameKey(onchainName));
    // Same name, different address → impersonator.
    if (mimicked && mimicked.address.toLowerCase() !== (address ?? "").toLowerCase()) {
      return { trust: "impersonator", impersonates: mimicked };
    }
  }

  return { trust: "unverified" };
}
