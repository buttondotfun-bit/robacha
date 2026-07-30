import { THEME_INIT_SCRIPT } from "@/lib/use-theme";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/app-shell/Providers";
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

const TITLE = "ROBACHA — Rob the Gacha on Robinhood Chain";
const DESCRIPTION =
  "Spin live reward pools and receive trending memecoin rewards across Robinhood Chain with ROBACHA.";
const OG_TITLE = "ROBACHA — Rob the Gacha";

/**
 * Origin that relative metadata URLs resolve against.
 *
 * This was a non-routable placeholder from before the domain existed, which
 * was right at the time and is now a bug: shared pulls resolve their card
 * image against it, so every unfurl would point at a host that does not exist
 * and no preview would ever render.
 *
 * Env first so preview deployments describe themselves rather than production.
 * VERCEL_PROJECT_PRODUCTION_URL comes without a scheme, hence the prefix.
 */
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://www.robacha.fun");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: TITLE,
    template: "%s — ROBACHA",
  },
  description: DESCRIPTION,
  applicationName: "ROBACHA",
  appleWebApp: {
    capable: true,
    title: "ROBACHA",
    statusBarStyle: "default",
  },
  keywords: [
    "ROBACHA",
    "Robacha",
    "Rob the Gacha",
    "Robinhood Chain",
    "memecoin",
    "gacha",
    "token rewards",
    "reward pool",
  ],
  openGraph: {
    type: "website",
    siteName: "ROBACHA",
    title: OG_TITLE,
    description: "The memecoin gacha built for Robinhood Chain.",
    url: "/",
    // Replace with a rendered 1200×630 card before launch.
    images: [{ url: "/brand/og.svg", width: 1200, height: 630, alt: "ROBACHA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: "Spin, pull and discover trending tokens across Robinhood Chain.",
    images: ["/brand/og.svg"],
    // Add the project handle once a real account exists. None is invented here.
  },
  robots: { index: true, follow: true },
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
