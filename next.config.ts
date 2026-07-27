import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Some Robinhood Chain tokens publish SVG icons. These only ever reach the
    // optimizer via our own /api/token-icon proxy (never a third-party URL),
    // they are rendered in <img> where scripts cannot execute, and the CSP and
    // sandbox below are Next's documented hardening for this case.
    dangerouslyAllowSVG: true,
    // `inline`, not `attachment`: the optimizer's Content-Disposition applies to
    // every optimized image, and `attachment` makes the browser treat them as
    // downloads — <img> receives valid bytes and renders nothing.
    // SVG safety comes from the CSP below plus the fact that these only reach
    // the optimizer through our own /api/token-icon proxy, and an SVG in <img>
    // cannot execute script regardless.
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Token logos are served by the chain indexer's CDN. Kept to an explicit
    // allowlist so a compromised data file can't point <Image> at any host.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dexscreener.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dd.dexscreener.com",
        pathname: "/**",
      },
    ],
    // Must cover every width a call site can ask for: the optimizer rejects any
    // width absent from this list with a 400, and the request still returns 200
    // at the network layer, so the only visible symptom is an image that never
    // decodes. Ranges from the 24px activity row up to the ~380px carousel card
    // at 2x DPR.
    imageSizes: [24, 32, 48, 64, 96, 128, 160, 200, 256, 384],
    deviceSizes: [640, 828, 1080],
    minimumCacheTTL: 60 * 60 * 24,
  },
};

export default nextConfig;
