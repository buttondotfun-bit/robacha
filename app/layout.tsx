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

export const metadata: Metadata = {
  // Placeholder origin. Replace once the real domain is registered — no
  // domain is invented here beyond a clearly non-routable example host.
  metadataBase: new URL("https://robacha.example"),
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:border focus:border-[rgba(20,24,18,0.08)] focus:bg-white/70 focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
