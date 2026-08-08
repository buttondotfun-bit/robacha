import type { MetadataRoute } from "next";
import { LEGAL_SLUGS } from "@/data/legal";
import { MACHINES } from "@/data/machines";
import { PROJECTS } from "@/data/projects";
import { configuredRaffles } from "@/data/raffle";
import { canonicalUrl, INDEXABLE } from "@/lib/seo";

/**
 * The sitemap — canonical, indexable pages only.
 *
 * Excludes every noindex surface (admin, My Bag, the wallet-specific win
 * pages, the create-raffle flow) and all data API routes. Each standalone
 * platform raffle with a pinned contract (Chimpers, Meebit) is a real, standing
 * public page and is included; per-creator hub raffles would be appended here
 * once the launchpad hub is deployed (it isn't yet, so none are invented).
 *
 * Preview/staging builds return an empty sitemap so their URLs never enter an
 * index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!INDEXABLE) return [];

  const now = new Date();

  const core: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/discover", changeFrequency: "daily", priority: 0.9 },
    { path: "/app", changeFrequency: "weekly", priority: 0.9 },
    { path: "/rob", changeFrequency: "weekly", priority: 0.9 },
    { path: "/machines", changeFrequency: "weekly", priority: 0.8 },
    { path: "/pools", changeFrequency: "weekly", priority: 0.8 },
    { path: "/raffle", changeFrequency: "daily", priority: 0.8 },
    { path: "/mint", changeFrequency: "weekly", priority: 0.8 },
    { path: "/nft-spins", changeFrequency: "weekly", priority: 0.7 },
    { path: "/launchpad", changeFrequency: "weekly", priority: 0.7 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
    { path: "/transparency", changeFrequency: "daily", priority: 0.6 },
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

  // Every standalone platform raffle whose contract is actually pinned.
  for (const r of configuredRaffles()) {
    entries.push({
      url: canonicalUrl(`/raffle/${r.slug}`),
      lastModified: now,
      changeFrequency: "hourly",
      priority: r.featured ? 0.7 : 0.6,
    });
  }

  // Machine detail pages + the Genesis pool.
  for (const m of MACHINES) {
    entries.push({
      url: canonicalUrl(`/machines/${m.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }
  entries.push({
    url: canonicalUrl("/pools/genesis"),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  });

  // Curated project pages ($ROB is excluded — it redirects to its /rob hub).
  for (const p of PROJECTS.filter((p) => !p.href)) {
    entries.push({
      url: canonicalUrl(`/projects/${p.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
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
