"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useWallet } from "./use-wallet";

/**
 * A wallet-scoped project watchlist.
 *
 * Honest about what it is: with no backend, auth or database in this app (see
 * the architecture), a "follow" can only be a local preference. It is stored in
 * localStorage keyed by the connected wallet, so it persists on this device and
 * survives reloads, but it does NOT sync across devices and does NOT (yet)
 * generate server-side notifications — that arrives with the accounts layer.
 * The UI says "saved on this device" rather than implying more than exists.
 *
 * Following requires a connected wallet so the list has an owner to key on.
 */

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

function storageKey(wallet: string): string {
  return `robacha:watchlist:${wallet.toLowerCase()}`;
}

function readRaw(wallet: string | null): string {
  if (!wallet || typeof window === "undefined") return "[]";
  return window.localStorage.getItem(storageKey(wallet)) ?? "[]";
}

function parse(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as string[]) : [];
  } catch {
    return [];
  }
}

export interface Watchlist {
  /** Whether a follow can be saved (a wallet is connected). */
  canFollow: boolean;
  following: string[];
  count: number;
  isFollowing: (address: string) => boolean;
  /** Toggle follow; returns the new following state, or false if no wallet. */
  toggle: (address: string) => boolean;
}

export function useWatchlist(): Watchlist {
  const { address, isConnected } = useWallet();
  const wallet = address ?? null;

  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    // Cross-tab changes.
    const onStorage = () => cb();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const getSnapshot = useCallback(() => readRaw(wallet), [wallet]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");

  const list = parse(raw);
  const set = new Set(list.map((a) => a.toLowerCase()));

  const toggle = useCallback(
    (address: string): boolean => {
      if (!wallet) return false;
      const current = parse(readRaw(wallet));
      const key = address.toLowerCase();
      const has = current.some((a) => a.toLowerCase() === key);
      const next = has
        ? current.filter((a) => a.toLowerCase() !== key)
        : [...current, address];
      window.localStorage.setItem(storageKey(wallet), JSON.stringify(next));
      emit();
      return !has;
    },
    [wallet],
  );

  return {
    canFollow: isConnected,
    following: list,
    count: list.length,
    isFollowing: (address: string) => set.has(address.toLowerCase()),
    toggle,
  };
}
