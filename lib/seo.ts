import type { Metadata } from "next";

/**
 * The one place SEO strings and rules live.
 *
 * Every page's title, description, canonical, robots directive, Open Graph and
 * Twitter card is built from here so they can never drift apart. The canonical
 * host is fixed to the production www host (no preview domain) — search engines
 * should only ever be told about https://www.robacha.fun, whatever deployment
 * actually served the request. www is the platform's primary host: the apex
 * 308-redirects to it, so pointing canonicals at the apex would advertise a URL
 * that immediately redirects. Canonicalise to the host that actually serves.
 *
 * Honesty rules that hold across the whole layer: no fabricated metrics in
 * metadata, no price/market numbers in titles or descriptions (they move), and
 * every claim ("live", "coming soon") tracks what the product actually does.
 */

/** The canonical production origin. Every canonical/OG URL resolves to this. */
const CANONICAL_ORIGIN = "https://www.robacha.fun";

/**
 * Where relative metadata (the OG image) resolves for THIS deployment. Env
 * first so a preview describes itself, falling back to the apex. Preview builds
 * are forced noindex below, so a preview metadataBase never gets indexed.
 */
const DEPLOY_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : CANONICAL_ORIGIN);

/**
 * Only the production deployment is indexable. Preview and development builds
 * are noindex,nofollow across the board so Vercel preview URLs never compete
 * with the real domain in search.
 */
export const INDEXABLE = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : true;

export const SITE = {
  name: "Robacha",
  /** The uppercase wordmark used in the UI; metadata prefers "Robacha". */
  wordmark: "ROBACHA",
  canonicalOrigin: CANONICAL_ORIGIN,
  deployOrigin: DEPLOY_ORIGIN,
  defaultTitle: "Robacha — Onchain Rewards on Robinhood Chain",
  defaultDescription:
    "Spin transparent reward pools, discover ecosystem tokens, explore NFT raffles and claim onchain rewards with Robacha on Robinhood Chain.",
  locale: "en_US",
  network: "Robinhood Chain",
  xHandle: "@robachadotfun",
  xUrl: "https://x.com/robachadotfun",
  /** The one official $ROB contract — used for entity consistency in schema. */
  robContract: "0x7B7D785a2BA95d39F97FCe44f5B2169895855b7E",
  robPair: "0x1490b8cb62e567f862dec48e4c100e2dbfb10092",
  robMarketUrl:
    "https://dexscreener.com/robinhood/0x1490b8cb62e567f862dec48e4c100e2dbfb10092",
} as const;

/** Absolute canonical URL for a path. */
export function canonicalUrl(path: string): string {
  return `${SITE.canonicalOrigin}${path === "/" ? "" : path}` || SITE.canonicalOrigin;
}

/** The shared OG-card image URL, optionally tailored with a title + tag. */
export function ogCardUrl(title?: string, tag?: string): string {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (tag) params.set("tag", tag);
  const query = params.toString();
  return `${SITE.canonicalOrigin}/api/og-card${query ? `?${query}` : ""}`;
}

export type RobotsMode = "index" | "noindex,follow" | "noindex,nofollow";

function robotsFor(mode: RobotsMode): Metadata["robots"] {
  // Preview/dev deployments are never indexable, whatever the page asks for.
  if (!INDEXABLE) return { index: false, follow: false, nocache: true };
  if (mode === "index") return { index: true, follow: true };
  if (mode === "noindex,follow") return { index: false, follow: true };
  return { index: false, follow: false, noarchive: true, nocache: true };
}

export interface PageSeo {
  title: string;
  description: string;
  /** Route path, e.g. "/rob". Home is "/". */
  path: string;
  /** Headline drawn on the OG card; defaults to the site card. */
  ogTitle?: string;
  /** Small pill on the OG card. */
  ogTag?: string;
}

/**
 * Build a page's full Metadata from a PageSeo entry.
 *
 * Titles are absolute (they bypass the root "%s" template so the matrix reads
 * exactly as written). Canonical, OG and Twitter URLs all point at the apex.
 */
export function pageMeta(
  seo: PageSeo,
  opts?: { robots?: RobotsMode },
): Metadata {
  const url = canonicalUrl(seo.path);
  const image = ogCardUrl(seo.ogTitle, seo.ogTag);
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: url },
    robots: robotsFor(opts?.robots ?? "index"),
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: seo.title,
      description: seo.description,
      url,
      locale: SITE.locale,
      images: [{ url: image, width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.xHandle,
      title: seo.title,
      description: seo.description,
      images: [image],
    },
  };
}

/**
 * The central title + description matrix (spec §81–82).
 *
 * One record so the strings can be reviewed together and never repeat a
 * description across pages. Note the token-spins experience lives at /app in
 * this codebase, not /spin.
 */
export const PAGE_SEO = {
  home: {
    title: SITE.defaultTitle,
    description:
      "Robacha is an onchain discovery and reward machine on Robinhood Chain. Spin transparent pools, discover ecosystem tokens and claim rewards.",
    path: "/",
    ogTag: "Onchain rewards",
  },
  spin: {
    title: "Token Spins on Robinhood Chain | Robacha",
    description:
      "Spin Robacha reward pools to discover ecosystem tokens on Robinhood Chain. View live odds, pool inventory and verifiable round results.",
    path: "/app",
    ogTitle: "Token Spins",
    ogTag: "Reward pools",
  },
  nftSpins: {
    title: "NFT Spins on Robinhood Chain | Robacha",
    description:
      "Discover Robacha NFT Spins, an onchain machine for pulling collectibles from transparent NFT reward pools on Robinhood Chain. Coming soon.",
    path: "/nft-spins",
    ogTitle: "NFT Spins",
    ogTag: "Coming soon",
  },
  mint: {
    title: "Robacha Capsules — NFT Collection on Robinhood Chain",
    description:
      "Explore Robacha Capsules, a 500-piece NFT collection built for the Robacha ecosystem on Robinhood Chain, including three Grails.",
    path: "/mint",
    ogTitle: "Robacha Capsules",
    ogTag: "NFT collection",
  },
  raffle: {
    title: "NFT Raffles on Robinhood Chain | Robacha",
    description:
      "Explore transparent NFT raffles on Robacha with published terms, onchain settlement and verifiable results on Robinhood Chain.",
    path: "/raffle",
    ogTitle: "NFT Raffles",
    ogTag: "Transparent draws",
  },
  launchpad: {
    title: "NFT Raffle Launchpad on Robinhood Chain | Robacha",
    description:
      "Create transparent NFT raffles on Robinhood Chain with Robacha. Configure ticket terms, escrow an NFT and launch onchain.",
    path: "/launchpad",
    ogTitle: "Raffle Launchpad",
    ogTag: "Create a raffle",
  },
  createRaffle: {
    title: "Create an NFT Raffle | Robacha",
    description:
      "Choose an NFT, configure raffle terms and launch a transparent onchain raffle through Robacha on Robinhood Chain.",
    path: "/launchpad/create",
    ogTitle: "Create a raffle",
  },
  rob: {
    title: "$ROB — Robacha Utility Token on Robinhood Chain",
    description:
      "Explore $ROB, the official Robacha utility token on Robinhood Chain. Learn how it is used across Robacha and verify the official contract.",
    path: "/rob",
    ogTitle: "$ROB",
    ogTag: "Utility token",
  },
  activity: {
    title: "Onchain Activity | Robacha",
    description:
      "Explore recent Robacha spins, reward claims, round settlements and onchain activity on Robinhood Chain.",
    path: "/activity",
    ogTitle: "Onchain Activity",
  },
  howItWorks: {
    title: "How Robacha Works — Onchain Reward Pools",
    description:
      "Learn how Robacha reward pools, token spins, round settlement, published odds and claims work on Robinhood Chain.",
    path: "/how-it-works",
    ogTitle: "How Robacha Works",
    ogTag: "The machine, explained",
  },
  faq: {
    title: "Robacha FAQ — Spins, Rewards, Raffles and $ROB",
    description:
      "Get answers about Robacha spins, reward pools, claims, refunds, NFT raffles, Capsules, $ROB and Robinhood Chain.",
    path: "/faq",
    ogTitle: "Robacha FAQ",
  },
  docs: {
    title: "Robacha Documentation — Contracts, Odds and Settlement",
    description:
      "Read how Robacha resolves spins, where randomness comes from, how odds and fees are published, and every deployed contract on Robinhood Chain.",
    path: "/docs",
    ogTitle: "Documentation",
  },
  verify: {
    title: "Verify a Robacha Round on Robinhood Chain | Robacha",
    description:
      "Check the public inputs, settlement and reward outcome of any Robacha round on Robinhood Chain — verifiable from the contract.",
    path: "/verify",
    ogTitle: "Verify a round",
  },
  leaderboard: {
    title: "Robacha Leaderboard — Onchain Records & Explorers",
    description:
      "Explore verified Robacha records, reward milestones, top explorers and notable onchain pulls across Robinhood Chain.",
    path: "/leaderboard",
    ogTitle: "Leaderboard",
    ogTag: "Records from the machine",
  },
  support: {
    title: "Help & Support | Robacha",
    description:
      "Get help with Robacha spins, rewards, claims, refunds and $ROB on Robinhood Chain.",
    path: "/support",
    ogTitle: "Help",
  },
  bag: {
    title: "My Bag | Robacha",
    description:
      "View rewards, balances, claims and Robacha activity for your connected wallet.",
    path: "/bag",
    ogTitle: "My Bag",
  },
  discover: {
    title: "Discover Robinhood Chain Projects | Robacha",
    description:
      "Explore projects moving through Robacha reward machines on Robinhood Chain — inspect live pools, discovery activity and new ecosystem assets.",
    path: "/discover",
    ogTitle: "Discover",
    ogTag: "Inside the machine",
  },
  machines: {
    title: "Robacha Machines — Onchain Discovery on Robinhood Chain",
    description:
      "Explore Robacha machines — the reward machines that move projects through transparent pools on Robinhood Chain.",
    path: "/machines",
    ogTitle: "Machines",
    ogTag: "One machine, more ways to discover",
  },
  pools: {
    title: "Robacha Reward Pools on Robinhood Chain",
    description:
      "Explore Robacha reward pools, published odds, live inventory and the projects currently loaded into Robacha machines on Robinhood Chain.",
    path: "/pools",
    ogTitle: "Reward Pools",
    ogTag: "Inside the machine",
  },
  genesisPool: {
    title: "Genesis Pool | Robacha",
    description:
      "The original Robacha reward pool on Robinhood Chain — published odds, live reward inventory and verifiable round history.",
    path: "/pools/genesis",
    ogTitle: "Genesis Pool",
    ogTag: "Live reward pool",
  },
  passport: {
    title: "Your Passport | Robacha",
    description:
      "Your Robacha passport — badges derived from what your wallet has done on Robinhood Chain.",
    path: "/passport",
    ogTitle: "Passport",
    ogTag: "Your machine record",
  },
  receipts: {
    title: "Your Receipts | Robacha",
    description:
      "A plain-language ledger of everything your wallet has spent and pulled on Robacha, read live from Robinhood Chain.",
    path: "/receipts",
    ogTitle: "Receipts",
    ogTag: "Read live from chain",
  },
  transparency: {
    title: "Transparency — Robacha on Robinhood Chain",
    description:
      "Robacha's live system status, on-chain totals, contract addresses and $ROB burn — every figure read straight from Robinhood Chain, not a database.",
    path: "/transparency",
    ogTitle: "Transparency",
    ogTag: "Read live from chain",
  },
  stockMachine: {
    title: "Robacha Stock Machine — Tokenized Stock Rewards",
    description:
      "A preview of the Robacha Stock Machine: tokenized-stock discovery on Robinhood Chain. Not live yet — supported assets, pool composition, pricing and probabilities will be published before launch. Not investment advice.",
    path: "/machines/tokenized-stocks",
    ogTitle: "Stock Machine",
    ogTag: "Coming soon",
  },
} as const;

// ---------------------------------------------------------------- JSON-LD ----

type Json = Record<string, unknown>;

/** WebSite entity for the homepage. No SearchAction — there's no site search. */
export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.canonicalOrigin,
    inLanguage: "en",
    description: SITE.defaultDescription,
  };
}

/** Organization entity — only verified, public facts. */
export function organizationJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.canonicalOrigin,
    logo: `${SITE.canonicalOrigin}/logo.png`,
    sameAs: [SITE.xUrl],
    description:
      "Robacha is an independent onchain reward and discovery machine built for Robinhood Chain.",
  };
}

/** WebApplication entity for a product page. No ratings/offers (none are real). */
export function webApplicationJsonLd(input: {
  name: string;
  description: string;
  path: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: canonicalUrl(input.path),
    description: input.description,
    isAccessibleForFree: true,
    browserRequirements: "Requires a Web3 wallet on Robinhood Chain",
  };
}

/** FAQPage entity. Answers MUST match the visible page text passed in. */
export function faqPageJsonLd(items: { question: string; answer: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

/** BreadcrumbList entity from an ordered list of {name, path}. */
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: canonicalUrl(c.path),
    })),
  };
}
