"use client";

import Link from "next/link";
import type { NavLink } from "@/lib/constants";
import { useVisibleNav } from "@/lib/use-visible-nav";

/**
 * The footer's link columns.
 *
 * Split out of the footer purely so `walletOnly` filtering can run on the
 * client — the footer itself stays a server component, and only this list
 * ships as JS.
 */
export function FooterNav({
  title,
  links,
}: {
  title: string;
  links: readonly NavLink[];
}) {
  const visible = useVisibleNav(links);

  // A column whose every entry is wallet-gated should not leave a stray
  // heading behind when disconnected.
  if (visible.length === 0) return null;

  return (
    <ul className="space-y-2.5" aria-label={title}>
      {visible.map((link) => (
        <li key={link.label}>
          <Link
            href={link.href}
            className="text-[13.5px] text-ink-2 transition-colors hover:text-ink"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
