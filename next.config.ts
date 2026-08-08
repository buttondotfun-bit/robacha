import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old paths kept alive so existing links/bookmarks don't 404:
  //  - the NFT/capsule page was renamed to /mint
  //  - the standalone reward-pool page was retired; the live pool is on /app
  async redirects() {
    return [
      { source: "/nft", destination: "/mint", permanent: true },
      { source: "/rewards", destination: "/app", permanent: true },
      // Friendly short path for the coming-soon Stock Machine preview, mirroring
      // /app (token) and /nft-spins (NFT).
      { source: "/stock-spins", destination: "/machines/tokenized-stocks", permanent: false },
      // One canonical host: www permanently folds into the apex, which is what
      // every canonical/OG URL points at (see lib/seo.ts). Host-scoped so it
      // only fires for the www hostname and never touches the apex or previews.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.robacha.fun" }],
        destination: "https://robacha.fun/:path*",
        permanent: true,
      },
    ];
  },
  // Baseline production hardening. Deliberately no strict Content-Security-Policy
  // here — the wallet SDKs (AppKit/WalletConnect) need inline/eval and many
  // origins, and a tight CSP would break connection flows; the image optimizer
  // already sandboxes remote SVGs (see `images` below).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  // AppKit's guide says to exclude pino-pretty, lokijs and encoding via a
  // webpack config. Not done here: this project builds with Turbopack, and
  // adding a `webpack` block makes Next fall back to webpack for the whole
  // build — which took it from seconds to over ten minutes. Turbopack resolves
  // those optional Node-only packages on its own, so the workaround is not
  // needed; if one of them ever does break a build, the fix is
  // `turbopack.resolveAlias`, not reintroducing webpack.
  turbopack: {
    // AppKit's wagmi adapter imports the whole `@wagmi/connectors` barrel,
    // which pulls in Coinbase's Base Account connector, which pulls in the CDP
    // SDK, which imports these `@x402/*` payment packages. They are optional
    // peers — not installed, and never reached by anything here, since the only
    // wallet paths this app uses are the injected connector and WalletConnect.
    // Turbopack still has to resolve every specifier it sees, so without these
    // aliases the build fails on five modules no code calls.
    resolveAlias: {
      "@x402/core/client": "./shims/empty-module.cjs",
      "@x402/evm": "./shims/empty-module.cjs",
      "@x402/evm/exact/client": "./shims/empty-module.cjs",
      "@x402/evm/upto/client": "./shims/empty-module.cjs",
      "@x402/svm/exact/client": "./shims/empty-module.cjs",
    },
  },
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
