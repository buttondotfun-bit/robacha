import type { Address } from "viem";
import { ROB_TOKEN } from "./rob-token";

/**
 * A curated overlay of project identity, keyed by contract address.
 *
 * This is deliberately thin and honest. Symbol, logo and live market data are
 * already resolved per address from the token index (`useTokenMarket`); this
 * file only adds the things a machine can't read from a token contract —
 * a canonical slug, a category, and *verified* links/copy. Where a link or
 * blurb isn't substantiated it is simply omitted rather than invented (the spec
 * is explicit: never invent project copy).
 *
 * Reward tokens that appear in Robacha but are NOT listed here still surface as
 * projects — derived from their symbol/logo/market and their real discovery
 * stats — just without a curated blurb or links. So this registry is an
 * enhancement layer, never a gate on what counts as a project.
 *
 * Addresses are the identity (tickers are shared — HOODRAT alone has six
 * contracts on this chain), and each below was verified on chain in the lineup
 * it came from (`data/lineup.ts`) or is the platform's own token.
 */
export interface Project {
  slug: string;
  address: Address;
  name: string;
  /** Ticker without the leading "$". */
  ticker: string;
  /** Machine slug this project is associated with. */
  machine: string;
  category?: string;
  /** Verified project copy only — omitted when not substantiated. */
  blurb?: string;
  website?: string;
  x?: string;
  /** The one official Robacha token. */
  official?: boolean;
  /**
   * A dedicated hub page that supersedes the generic /projects/[slug] page
   * (e.g. $ROB already has /rob). When set, cards link here.
   */
  href?: string;
}

export const PROJECTS: Project[] = [
  {
    slug: "rob",
    address: ROB_TOKEN.address,
    name: "Robacha",
    ticker: "ROB",
    machine: "genesis",
    category: "Utility token",
    official: true,
    blurb:
      "Robacha's official utility token on Robinhood Chain. Spend it to spin, win it from live reward pools, and watch protocol fees buy it back and burn it.",
    href: "/rob",
  },
  {
    slug: "mancer",
    address: "0xc72F232a6869e6CF34dC06129AfFD07F8a2a246A" as Address,
    name: "Mancer",
    ticker: "MANCER",
    machine: "genesis",
    category: "Memecoin",
  },
  {
    slug: "throbbin",
    address: "0xe8fB470E0685437d7739BD2AacBA60b228800335" as Address,
    name: "Throbbin",
    ticker: "THROBBIN",
    machine: "genesis",
    category: "Memecoin",
  },
  {
    slug: "hoodrat",
    address: "0x8e62F281f282686fCa6dCB39288069a93fC23F1c" as Address,
    name: "Hoodrat",
    ticker: "HOODRAT",
    machine: "genesis",
    category: "Memecoin",
  },
  {
    // Verified on BNB Chain in the lineup; links cross-checked to the project
    // that owns the contract (the 7777 tail matches @PizzaBTC7777).
    slug: "pizza",
    address: "0x8554D38b95E4F7Ca11D391008627Df30B2b07777" as Address,
    name: "Pizza",
    ticker: "PIZZA",
    machine: "genesis",
    category: "Memecoin",
    website: "https://pizzabtc.meme",
    x: "https://x.com/PizzaBTC7777",
  },
];

const BY_ADDRESS = new Map(PROJECTS.map((p) => [p.address.toLowerCase(), p]));
const BY_SLUG = new Map(PROJECTS.map((p) => [p.slug, p]));

export function projectByAddress(address: string | null | undefined): Project | undefined {
  if (!address) return undefined;
  return BY_ADDRESS.get(address.toLowerCase());
}

/** Resolve by curated slug OR by raw address (so any reward token has a page). */
export function projectBySlug(slug: string): Project | undefined {
  return BY_SLUG.get(slug) ?? projectByAddress(slug);
}

/** Where a project card should link — its dedicated hub, else the generic page. */
export function projectHref(project: Pick<Project, "slug" | "href">): string {
  return project.href ?? `/projects/${project.slug}`;
}
