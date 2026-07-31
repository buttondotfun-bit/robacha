import { RobachaLogo } from "@/components/brand/RobachaLogo";
import { FooterNav } from "./FooterNav";
import { GlassChip } from "@/components/ui/Glass";
import { BRAND, RISK_NOTICE, SOCIAL_LINKS } from "@/lib/constants";
import { RobinhoodChainMark } from "@/components/brand/RobinhoodChainMark";
import { NETWORK_LABEL } from "@/lib/web3";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Spin", href: "/app" },
      { label: "Reward Pool", href: "/rewards", walletOnly: true },
      { label: "My Bag", href: "/bag", walletOnly: true },
      { label: "Activity", href: "/activity", walletOnly: true },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "NFTs", href: "/nft" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "FAQ", href: "/faq" },
      { label: "Help", href: "/support" },
      { label: "Check a round", href: "/verify" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Risk Disclosure", href: "/legal/risk" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative px-4 pb-6 pt-16 sm:px-6">
      {/* Environmental glow behind the footer slab */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_100%,rgba(204,255,0,0.14),transparent_70%)]"
      />

      <div className="glass-panel glass-reflection glass-highlight relative mx-auto w-full max-w-[1360px] overflow-hidden rounded-[32px] px-6 py-10 sm:px-9 sm:py-12">
        <span className="noise-overlay" aria-hidden="true" />

        <div className="relative grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <RobachaLogo size={32} />
            <p className="mt-4 max-w-[32ch] text-[13.5px] leading-relaxed text-ink-2">
              {BRAND.descriptor} Spin live reward pools and discover trending
              tokens across the ecosystem.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <GlassChip dot className="h-8">
                <RobinhoodChainMark className="h-3.5 w-auto opacity-80" title={null} />
                {NETWORK_LABEL} · Live
              </GlassChip>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="micro mb-4">{column.title}</p>
              <FooterNav title={column.title} links={column.links} />
              {column.title === "Resources" ? (
                <>
                  <p className="micro mb-3 mt-7">Social</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {SOCIAL_LINKS.map((social) => (
                      <li key={social.label}>
                        <a
                          href={social.href}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-quiet inline-flex h-7 items-center rounded-full px-2.5 text-[11.5px] text-ink-2 transition-colors hover:text-ink"
                        >
                          {social.label}
                          <span className="sr-only"> — {social.handle}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </nav>
          ))}
        </div>

        <div className="relative mt-10 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-6">
          <p className="max-w-[80ch] text-[12px] leading-relaxed text-ink-3">
            {RISK_NOTICE} ROBACHA is an independent project built for{" "}
            {NETWORK_LABEL}. It is not affiliated with, endorsed by, or operated
            by Robinhood.
          </p>
          <p className="mt-4 text-[12px] text-ink-3">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
