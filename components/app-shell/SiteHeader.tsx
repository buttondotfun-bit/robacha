"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RobachaLogo } from "@/components/brand/RobachaLogo";
import { XIcon } from "@/components/brand/XIcon";
import { ButtonLink } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/Glass";
import { SITE_NAV, SOCIAL_LINKS } from "@/lib/constants";
import { useScrolled } from "@/lib/use-scrolled";
import { cn } from "@/lib/utils";
import { NETWORK_LABEL } from "@/lib/web3";
import { MobileNavigation } from "./MobileNavigation";

const MOBILE_ITEMS = [
  { label: "Home", href: "/" },
  ...SITE_NAV.map((item) => ({ ...item })),
  { label: "My Bag", href: "/bag" },
];

/**
 * Floating capsule navigation. Detached from the viewport edge so the
 * environmental background reads underneath it, and compressed slightly once
 * the page scrolls.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolled();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5">
      <div
        className={cn(
          "glass-nav glass-highlight pointer-events-auto flex w-full max-w-[1120px] items-center gap-3 rounded-full",
          "transition-[height,padding,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled ? "h-14 px-3 pr-3" : "h-16 px-4 pr-4",
        )}
      >
        <Link
          href="/"
          aria-label="ROBACHA home"
          className="shrink-0 rounded-full pl-1 transition-opacity hover:opacity-80"
        >
          <RobachaLogo size={scrolled ? 25 : 28} />
        </Link>

        <nav
          aria-label="Primary"
          className="ml-2 hidden items-center gap-0.5 md:flex"
        >
          {SITE_NAV.map((item) => {
            const active =
              item.href.startsWith("/") &&
              !item.href.includes("#") &&
              pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "text-ink"
                    : "text-ink-2 hover:bg-[rgba(255,255,255,0.6)] hover:text-ink",
                )}
              >
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
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-[rgba(255,255,255,0.6)] hover:text-ink sm:grid"
          >
            <XIcon />
          </a>

          <GlassChip dot className="hidden h-9 lg:inline-flex">
            {NETWORK_LABEL}
          </GlassChip>

          <span className="hidden sm:block">
            <ButtonLink
              href="/app"
              variant="primary"
              size={scrolled ? "md" : "lg"}
            >
              Launch App
            </ButtonLink>
          </span>

          <span className="block md:hidden">
            <MobileNavigation
              items={MOBILE_ITEMS}
              cta={{ label: "Launch App", href: "/app" }}
            />
          </span>
        </div>
      </div>
    </header>
  );
}
