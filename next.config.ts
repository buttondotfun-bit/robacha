import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Some Robinhood Chain tokens publish SVG icons. These only ever reach the
    // optimizer via our own /api/token-icon proxy (never a third-party URL),
    // they are rendered in <img> where scripts cannot execute, and the CSP and
    // sandbox below are Next's documented hardening for this case.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
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
    // Logos render small and square; no need to generate large variants.
    imageSizes: [32, 48, 64, 96, 128],
    deviceSizes: [640, 828, 1080],
    minimumCacheTTL: 60 * 60 * 24,
  },
};

export default nextConfig;
