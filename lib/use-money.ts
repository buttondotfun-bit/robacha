"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import type { EthPrice } from "@/app/api/eth-price/route";
import { chainConfig } from "./config";

/**
 * Showing amounts in dollars as well as ETH.
 *
 * "0.0006 ETH" tells most people nothing about whether they are about to spend
 * pocket change or a meaningful amount, and that is the single figure every
 * spin decision turns on. This lets the interface answer the question in a
 * currency people actually think in.
 *
 * The ETH figure is never replaced, only accompanied. Every amount on this site
 * is settled on chain in the native token, so that is the real number; the
 * dollar value is a convenience computed from an external spot feed and is
 * always presented as secondary. When the feed is unreachable the dollar half
 * simply disappears rather than showing a remembered rate.
 */

const KEY = "robacha.currency";

export type CurrencyPreference = "native" | "usd";

/** Module-level so every component re-renders together on a toggle. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changing the preference should move this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(): CurrencyPreference {
  try {
    return window.localStorage.getItem(KEY) === "usd" ? "usd" : "native";
  } catch {
    return "native";
  }
}

/** The server has no preference to read; both renders must agree. */
function serverSnapshot(): CurrencyPreference {
  return "native";
}

export function useEthPrice() {
  const query = useQuery({
    queryKey: ["robacha", "eth-price"],
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/eth-price", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("price unavailable");
      return (await response.json()) as EthPrice;
    },
  });
  return query.data?.price ?? null;
}

export function useMoney() {
  const preference = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const price = useEthPrice();

  const setPreference = useCallback((next: CurrencyPreference) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* private mode; the toggle just will not persist */
    }
    listeners.forEach((listener) => listener());
  }, []);

  /** The canonical amount. Always available, always the real one. */
  const native = useCallback((wei: bigint, decimals = 4) => {
    const value = Number(formatEther(wei));
    // Small amounts need their significant digits; 0.0006 must not print 0.00.
    const shown = value === 0 ? "0" : value < 0.001 ? value.toFixed(6) : value.toFixed(decimals);
    return `${shown} ${chainConfig.nativeSymbol}`;
  }, []);

  /** The dollar equivalent, or null when no price is known. */
  const usd = useCallback(
    (wei: bigint) => {
      if (price === null) return null;
      const value = Number(formatEther(wei)) * price;
      if (value > 0 && value < 0.01) return "<$0.01";
      return `$${value.toFixed(2)}`;
    },
    [price],
  );

  /**
   * Whichever the reader asked for, falling back to ETH when there is no rate.
   * Callers wanting both should use `native` and `usd` directly.
   */
  const format = useCallback(
    (wei: bigint) => {
      if (preference === "usd") {
        const dollars = usd(wei);
        if (dollars) return dollars;
      }
      return native(wei);
    },
    [preference, usd, native],
  );

  return {
    preference,
    setPreference,
    /** True when a dollar figure can be shown at all. */
    hasPrice: price !== null,
    price,
    native,
    usd,
    format,
  };
}
