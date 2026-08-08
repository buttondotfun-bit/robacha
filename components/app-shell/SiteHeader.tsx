"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { RobachaLogo } from "@/components/brand/RobachaLogo";
import { XIcon } from "@/components/brand/XIcon";
import { RobTokenPopover } from "@/components/rob/RobTokenPopover";
import { GlassChip } from "@/components/ui/Glass";
import { WalletButton } from "./WalletButton";
import { SITE_NAV, SOCIAL_LINKS } from "@/lib/constants";
import { useScrolled } from "@/lib/use-scrolled";
import { useVisibleNav } from "@/lib/use-visible-nav";
import { cn } from "@/lib/utils";
import { RobinhoodChainMark } from "@/components/brand/RobinhoodChainMark";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NETWORK_LABEL } from "@/lib/web3";
import { MobileNavigation } from "./MobileNavigation";

// SITE_NAV now leads with Home, so the mobile list no longer prepends its own.
// $ROB rides in the mobile menu because the header row can't fit its chip next
// to a full-width "Connect Wallet" at phone widths — on sm+ the chip shows in
// the header instead (see below).
const MOBILE_ITEMS = [
  ...SITE_NAV,
  { label: "Machines", href: "/machines" },
  { label: "Pools", href: "/pools" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "$ROB", href: "/rob" },
  // My Bag lives in the wallet dropdown ("View My Bag"), so it's not repeated
  // in the header menu.
];

/**
 * Floating capsule navigation. Detached from the viewport edge so the
 * environmental background reads underneath it, and compressed slightly once
 * the page scrolls.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const nav = useVisibleNav(SITE_NAV);
  const mobileItems = useVisibleNav(MOBILE_ITEMS);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={cn(
          "glass-nav glass-highlight pointer-events-auto flex w-full max-w-[1360px] items-center gap-2.5 rounded-full px-3",
          "transition-[height,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled ? "h-[52px]" : "h-[58px]",
        )}
      >
        <Link
          href="/"
          aria-label="ROBACHA home"
          className="shrink-0 rounded-full pl-0.5 transition-opacity hover:opacity-80"
        >
          <RobachaLogo size={25} />
        </Link>

        <nav
          aria-label="Primary"
          className="ml-1 hidden items-center gap-0.5 md:flex"
        >
          {nav.map((item) => {
            const isHome = item.href === "/";
            // Home matches only the exact root — `startsWith("/")` is true on
            // every page, which would light Home up everywhere.
            const active = isHome
              ? pathname === "/"
              : item.href.startsWith("/") &&
                !item.href.includes("#") &&
                pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                  active
                    ? "text-ink"
                    : "text-ink-2 hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink",
                )}
              >
                {isHome ? (
                  <Home className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={SOCIAL_LINKS[0].href}
            target="_blank"
            rel="noreferrer"
            aria-label={`ROBACHA on X (${SOCIAL_LINKS[0].handle})`}
            title={`ROBACHA on X · ${SOCIAL_LINKS[0].handle}`}
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink sm:grid"
          >
            <XIcon />
          </a>

          <span className="hidden lg:block">
            <ThemeToggle />
          </span>

          {/* Wrapped in a span so `hidden` actually hides it: `.glass-chip`
              sets its own display, which beats Tailwind's `hidden` when applied
              to the chip directly — the same reason ThemeToggle above is
              wrapped rather than classed. */}
          <span className="hidden lg:block">
            <GlassChip dot className="h-9">
              <RobinhoodChainMark className="h-3.5 w-auto opacity-80" title={null} />
              {NETWORK_LABEL}
            </GlassChip>
          </span>

          <span className="hidden sm:block">
            <RobTokenPopover />
          </span>

          <WalletButton />

          <span className="block md:hidden">
            <MobileNavigation items={mobileItems} />
          </span>
        </div>
      </div>
    </header>
  );
}
