"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RobachaLogo } from "@/components/brand/RobachaLogo";
import { APP_NAV } from "@/lib/constants";
import { useScrolled } from "@/lib/use-scrolled";
import { cn } from "@/lib/utils";
import { MobileNavigation } from "./MobileNavigation";
import { NetworkBadge } from "./NetworkBadge";
import { WalletButton } from "./WalletButton";

const MOBILE_ITEMS = [
  ...APP_NAV.map((item) => ({ ...item })),
  { label: "FAQ", href: "/faq" },
  { label: "Home", href: "/" },
];

/** Floating product navigation — same material as the site header, denser. */
export function AppHeader() {
  const pathname = usePathname();
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
          {APP_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-[rgba(255,255,255,0.82)] text-ink shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_6px_-2px_rgba(16,17,15,0.12)]"
                    : "text-ink-2 hover:bg-[rgba(255,255,255,0.55)] hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:block">
            <NetworkBadge />
          </span>
          <WalletButton />
          <span className="block md:hidden">
            <MobileNavigation items={MOBILE_ITEMS} />
          </span>
        </div>
      </div>
    </header>
  );
}
