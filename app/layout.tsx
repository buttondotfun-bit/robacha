import { THEME_INIT_SCRIPT } from "@/lib/use-theme";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/app-shell/Providers";
import { INDEXABLE, ogCardUrl, SITE } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Site-wide defaults. Per-page titles/descriptions/canonicals are built from
 * the central matrix in lib/seo.ts; this only sets the fallback and the shared
 * OG/Twitter identity. `metadataBase` resolves relative asset URLs against the
 * deployment origin (env-driven so a preview describes itself), while canonical
 * and social URLs are pinned to the apex inside lib/seo.ts.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.deployOrigin),
  title: {
    default: SITE.defaultTitle,
    template: "%s | Robacha",
  },
  description: SITE.defaultDescription,
  applicationName: SITE.name,
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    url: SITE.canonicalOrigin,
    locale: SITE.locale,
    // Rendered by /api/og-card — a PNG, because X refuses SVG card images.
    images: [{ url: ogCardUrl(), width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.xHandle,
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    images: [ogCardUrl()],
  },
  robots: INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f8f3",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // The head script rewrites data-theme before React hydrates, so the
      // server's markup and the client's first render differ by design.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking, before first paint. Without it a dark-mode visitor sees a
            white flash on every navigation, which is the one thing that makes
            a dark mode feel broken. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:border focus:border-[rgb(var(--line-rgb)_/_0.08)] focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
