/**
 * Robacha machines — the first-class "product objects" a reward experience runs
 * on. A small curated registry, not fabricated: the Genesis Machine is live
 * (the deployed gacha + Genesis Pool), the NFT Machine is honestly coming-soon
 * (no contract yet). Live pool/round state is always read from chain at render;
 * this only carries identity + intent.
 */
export interface Machine {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  type: "token" | "nft" | "stock";
  /** Deployed & operating vs. announced. Real per-config, never a claim. */
  status: "live" | "coming-soon";
  rewardType: string;
  /** Where to actually use it. */
  href: string;
  /** The pool this machine draws from, when live. */
  poolSlug?: string;
}

export const MACHINES: Machine[] = [
  {
    slug: "genesis",
    name: "Genesis Machine",
    tagline: "The original Robacha token machine.",
    description:
      "Robacha's first reward machine. Spin the Genesis Pool and pull a random token from a transparent, published set of reward assets on Robinhood Chain.",
    type: "token",
    status: "live",
    rewardType: "ERC-20 tokens",
    href: "/app",
    poolSlug: "genesis",
  },
  {
    slug: "nft",
    name: "NFT Machine",
    tagline: "Pull collectibles from curated NFT pools.",
    description:
      "The next Robacha machine: spin and the capsule holds an NFT instead of a token, drawn from a transparent NFT reward pool. Not live yet — it will say so plainly until a contract makes it real.",
    type: "nft",
    status: "coming-soon",
    rewardType: "NFTs",
    href: "/nft-spins",
  },
  {
    slug: "tokenized-stocks",
    name: "Stock Machine",
    tagline: "Tokenized-stock discovery, coming soon.",
    description:
      "A future Robacha machine built around tokenized-stock reward assets on Robinhood Chain. Not live yet — supported assets, pool composition, pricing and probabilities will be published before the first spin. Robacha does not provide investment advice.",
    type: "stock",
    status: "coming-soon",
    rewardType: "Tokenized stocks",
    href: "/machines/tokenized-stocks",
  },
];

export function machineBySlug(slug: string): Machine | undefined {
  return MACHINES.find((m) => m.slug === slug);
}

export function liveMachines(): Machine[] {
  return MACHINES.filter((m) => m.status === "live");
}
