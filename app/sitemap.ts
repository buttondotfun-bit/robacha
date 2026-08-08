import type { MetadataRoute } from "next";
import { LEGAL_SLUGS } from "@/data/legal";
import { contracts } from "@/lib/config";
import { canonicalUrl, INDEXABLE } from "@/lib/seo";

/**
 * The sitemap — canonical, indexable pages only.
 *
 * Excludes every noindex surface (admin, My Bag, the wallet-specific win
 * pages, the create-raffle flow) and all data API routes. The featured Meebit
 * raffle is a real, standing public page and is included; per-creator hub
 * raffles would be appended here once the launchpad hub is deployed (it isn't
 * yet, so none are invented).
 *
 * Preview/staging builds return an empty sitemap so their URLs never enter an
 * index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!INDEXABLE) return [];

  const now = new Date();

  const core: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/app", changeFrequency: "weekly", priority: 0.9 },
    { path: "/rob", changeFrequency: "weekly", priority: 0.9 },
    { path: "/raffle", changeFrequency: "daily", priority: 0.8 },
    { path: "/mint", changeFrequency: "weekly", priority: 0.8 },
    { path: "/nft-spins", changeFrequency: "weekly", priority: 0.7 },
    { path: "/launchpad", changeFrequency: "weekly", priority: 0.7 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
    { path: "/docs", changeFrequency: "monthly", priority: 0.6 },
    { path: "/verify", changeFrequency: "weekly", priority: 0.6 },
    { path: "/activity", changeFrequency: "daily", priority: 0.6 },
    { path: "/leaderboard", changeFrequency: "weekly", priority: 0.5 },
    { path: "/support", changeFrequency: "monthly", priority: 0.4 },
  ];

  const entries: MetadataRoute.Sitemap = core.map((c) => ({
    url: canonicalUrl(c.path),
    lastModified: now,
    changeFrequency: c.changeFrequency,
    priority: c.priority,
  }));

  // The standing featured raffle — only when its contract is actually pinned.
  if (contracts.raffle) {
    entries.push({
      url: canonicalUrl("/raffle/meebit"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    });
  }

  // Legal pages — indexable, low priority.
  for (const slug of LEGAL_SLUGS) {
    entries.push({
      url: canonicalUrl(`/legal/${slug}`),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    });
  }

  return entries;
}
