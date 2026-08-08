"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Image as ImageIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Switches between the two machines — the token spinner (/app) and the NFT
 * spinner (/nft-spins) — as a segmented control rather than two nav items to
 * hunt for. It's route-based, not stateful: each tab is a real link, so the
 * page it points at owns its own content and the browser back button works.
 * Shared by both pages so the control sits identically on each.
 */
const TABS = [
  { href: "/app", label: "Token Spins", icon: Coins, live: true },
  { href: "/nft-spins", label: "NFT Spins", icon: ImageIcon, live: false },
  { href: "/machines/tokenized-stocks", label: "Stocks", icon: TrendingUp, live: true },
] as const;

export function SpinTabs({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      aria-label="Choose a spinner"
      className={cn("glass-quiet inline-flex items-center gap-1 rounded-full p-1", className)}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors",
              active
                ? "bg-surface/85 text-ink shadow-[0_1px_0_rgb(var(--edge-rgb)_/_0.9)_inset,0_2px_6px_-2px_rgb(var(--ink-rgb)_/_0.12)]"
                : "text-ink-2 hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tab.label}
            {tab.live ? (
              <span
                className="pulse-dot ml-0.5 h-1.5 w-1.5 rounded-full bg-[#8ec500]"
                aria-hidden="true"
                title="Live"
              />
            ) : (
              <span className="ml-0.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Soon
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
