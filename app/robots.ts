import type { MetadataRoute } from "next";
import { INDEXABLE, SITE } from "@/lib/seo";

/**
 * Crawl rules. robots.txt is NOT access control — every private surface is
 * enforced elsewhere (admin by on-chain roles, wallet data by the wallet). This
 * only keeps thin/private URLs out of the index and points crawlers at the
 * sitemap.
 *
 * Preview/staging deployments disallow everything so a Vercel preview URL never
 * gets indexed alongside the real domain.
 */
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      // OG image + token-icon proxy stay crawlable so social/image indexing
      // can fetch them; the data APIs are blocked.
      allow: ["/", "/api/og-card", "/api/token-icon"],
      disallow: [
        "/admin",
        "/bag",
        "/win/",
        "/launchpad/create",
        "/api/",
      ],
    },
    sitemap: `${SITE.canonicalOrigin}/sitemap.xml`,
    host: SITE.canonicalOrigin,
  };
}
