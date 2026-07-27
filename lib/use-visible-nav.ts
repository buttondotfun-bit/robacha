"use client";

import { useAccount } from "wagmi";
import type { NavLink } from "@/lib/constants";
import { useMounted } from "@/lib/use-mounted";

/**
 * Filters `walletOnly` entries out of a nav list until a wallet is connected.
 *
 * Gated on `useMounted` as well as connection state so the server render and
 * the first client render both produce the disconnected list. Reading wagmi's
 * connection status during hydration would otherwise flip the markup between
 * the two passes and trip a hydration mismatch.
 *
 * This is presentation only. Every route stays reachable by URL — hiding a
 * link tidies the menu, it does not protect anything.
 */
export function useVisibleNav(items: readonly NavLink[]): NavLink[] {
  const mounted = useMounted();
  const { isConnected } = useAccount();
  const connected = mounted && isConnected;

  return items.filter((item) => !item.walletOnly || connected);
}
