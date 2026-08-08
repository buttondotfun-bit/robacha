"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search } from "lucide-react";
import { RobachaLogo } from "@/components/brand/RobachaLogo";
import { XIcon } from "@/components/brand/XIcon";
import { APP_NAV, SOCIAL_LINKS } from "@/lib/constants";
import { useVisibleNav } from "@/lib/use-visible-nav";
import { useScrolled } from "@/lib/use-scrolled";
import { cn } from "@/lib/utils";
import { MobileNavigation } from "./MobileNavigation";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { RobTokenPopover } from "@/components/rob/RobTokenPopover";
import { NetworkBadge } from "./NetworkBadge";
import { WalletButton } from "./WalletButton";

// APP_NAV already leads with Home, so it isn't appended again here.
// $ROB rides in the mobile menu at phone widths (the header row can't fit its
// chip next to a full-width "Connect Wallet"); on sm+ the chip shows inline.
const MOBILE_ITEMS = [
  ...APP_NAV,
  { label: "Machines", href: "/machines" },
  { label: "Pools", href: "/pools" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "$ROB", href: "/rob" },
  { label: "FAQ", href: "/faq" },
  { label: "Help", href: "/support" },
];

/** Floating product navigation — same material as the site header, denser. */
export function AppHeader() {
  const pathname = usePathname();
  const nav = useVisibleNav(APP_NAV);
  const mobileItems = useVisibleNav(MOBILE_ITEMS);
  const scrolled = useScrolled();

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
          <span className="hidden sm:block">
            <RobachaLogo size={25} />
          </span>
          <span className="block sm:hidden">
            <RobachaLogo size={25} variant="mark" />
          </span>
        </Link>

        <nav
          aria-label="Product"
          className="ml-1 hidden items-center gap-0.5 md:flex"
        >
          {nav.map((item) => {
            const isHome = item.href === "/";
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-[rgb(var(--edge-rgb)_/_0.82)] text-ink shadow-[0_1px_0_rgb(var(--edge-rgb)_/_0.9)_inset,0_2px_6px_-2px_rgb(var(--ink-rgb)_/_0.12)]"
                    : "text-ink-2 hover:bg-[rgb(var(--edge-rgb)_/_0.55)] hover:text-ink",
                )}
              >
                {isHome ? <Home className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Search"
            title="Search (⌘K)"
            onClick={() => window.dispatchEvent(new CustomEvent("robacha:search"))}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          {/* Siblings in the flex row. Nesting the toggle inside the badge's
              wrapper made them stack, because that wrapper is block. */}
          <span className="hidden md:block">
            <ThemeToggle />
          </span>
          <span className="hidden sm:block">
            <NetworkBadge />
          </span>
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
