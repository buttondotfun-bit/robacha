import { MACHINES } from "@/data/machines";
import { PROJECTS, projectHref } from "@/data/projects";

/**
 * The universal-search index.
 *
 * Built entirely from real, static/derived data already in the app — the
 * machine registry, the curated project registry, and the fixed set of
 * destinations. Nothing is fabricated and nothing is fetched: search stays fast
 * and honest, matching only things that genuinely exist. Live counts (pool
 * assets, etc.) are deliberately left off here so a result can never claim a
 * number the palette hasn't read.
 */

export type SearchKind = "machine" | "project" | "page";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** Extra terms to match on beyond the title. */
  keywords: string;
  /** Live machines/projects sort above coming-soon ones. */
  priority: number;
  status?: "live" | "coming-soon";
}

const PAGES: Omit<SearchItem, "kind" | "priority">[] = [
  { id: "page-discover", title: "Discover", subtitle: "Projects moving through the machine", href: "/discover", keywords: "explore projects trending" },
  { id: "page-machines", title: "Machines", subtitle: "The machine directory", href: "/machines", keywords: "genesis nft stock directory" },
  { id: "page-pools", title: "Pools", subtitle: "Reward pools and odds", href: "/pools", keywords: "rewards odds inventory" },
  { id: "page-app", title: "Token Spins", subtitle: "Spin the live Genesis Machine", href: "/app", keywords: "spin play gacha genesis" },
  { id: "page-leaderboard", title: "Leaderboard", subtitle: "Records from inside the machine", href: "/leaderboard", keywords: "records explorers biggest pulls" },
  { id: "page-transparency", title: "Transparency", subtitle: "Live status, totals and contracts", href: "/transparency", keywords: "status health contracts burn onchain" },
  { id: "page-mint", title: "Mint Capsules", subtitle: "The Robacha Capsules drop", href: "/mint", keywords: "nft capsule mint drop grail" },
  { id: "page-raffle", title: "Raffles", subtitle: "Trustless NFT raffles", href: "/raffle", keywords: "meebit win raffle" },
  { id: "page-rob", title: "$ROB", subtitle: "The official $ROB utility token", href: "/rob", keywords: "token rob utility" },
  { id: "page-passport", title: "Passport", subtitle: "Your badges, derived from chain", href: "/passport", keywords: "achievements badges you" },
  { id: "page-receipts", title: "Receipts", subtitle: "Your spend and pull ledger", href: "/receipts", keywords: "history ledger spent" },
  { id: "page-how", title: "How It Works", subtitle: "Pools, odds, rounds and randomness", href: "/how-it-works", keywords: "learn explainer" },
  { id: "page-faq", title: "FAQ", subtitle: "Common questions", href: "/faq", keywords: "questions help" },
  { id: "page-verify", title: "Verify a round", subtitle: "Reproduce any settled draw", href: "/verify", keywords: "proof fairness verify" },
];

export function buildSearchItems(): SearchItem[] {
  const machines: SearchItem[] = MACHINES.map((m) => ({
    id: `machine-${m.slug}`,
    kind: "machine",
    title: m.name,
    subtitle: `${m.rewardType} · ${m.status === "live" ? "Live" : "Coming soon"}`,
    href: m.href,
    keywords: `${m.slug} ${m.type} ${m.rewardType} machine ${m.status}`,
    priority: m.status === "live" ? 3 : 2,
    status: m.status,
  }));

  const projects: SearchItem[] = PROJECTS.map((p) => ({
    id: `project-${p.slug}`,
    kind: "project",
    title: p.name,
    subtitle: `$${p.ticker} · Project`,
    href: projectHref(p),
    keywords: `${p.ticker} ${p.slug} project token`,
    priority: 1,
  }));

  const pages: SearchItem[] = PAGES.map((p) => ({ ...p, kind: "page", priority: 0 }));

  return [...machines, ...projects, ...pages];
}

/** Substring match over title + keywords, ranked by priority then match position. */
export function searchItems(all: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...all].sort((a, b) => b.priority - a.priority).slice(0, 8);

  return all
    .map((item) => {
      const hay = `${item.title} ${item.keywords}`.toLowerCase();
      const idx = hay.indexOf(q);
      if (idx === -1) return null;
      // Title-start matches rank highest, then earlier matches, then priority.
      const titleIdx = item.title.toLowerCase().indexOf(q);
      const score = (titleIdx === 0 ? 100 : titleIdx > 0 ? 60 : 30) + item.priority * 5 - Math.min(idx, 20);
      return { item, score };
    })
    .filter((x): x is { item: SearchItem; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
    .slice(0, 10);
}
