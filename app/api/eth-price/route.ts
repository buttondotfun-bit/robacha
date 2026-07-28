import { NextResponse } from "next/server";
import { chainConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * What one unit of the native token is worth in dollars.
 *
 * Everything priced on this site is quoted in ETH, which is close to
 * meaningless to most people deciding whether to spend six-tenths of a
 * thousandth of one. The reward tokens already have a USD price from the DEX
 * index; the native token does not, because it is the quote asset of every pair
 * rather than the base of any.
 *
 * So this comes from an external spot feed rather than from chain data. That is
 * a deliberate exception to reading everything from the contract, and it is
 * safe precisely because nothing depends on it: it is a display convenience
 * layered over amounts that are always also shown in ETH. No transaction, no
 * payout and no odds calculation uses this number.
 *
 * When the feed cannot be reached this returns a null price rather than a
 * remembered or estimated one, and the interface falls back to showing ETH
 * only. A stale exchange rate presented as current is worse than no exchange
 * rate at all.
 */

const SOURCE = "https://api.coinbase.com/v2/prices/ETH-USD/spot";

/** Long enough to be kind to the upstream, short enough to stay honest. */
const TTL_MS = 60_000;

let cache: { price: number; at: number } | null = null;

export interface EthPrice {
  /** USD per native unit, or null when the feed is unreachable. */
  price: number | null;
  symbol: string;
  source: string | null;
  fetchedAt: string | null;
}

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(
      {
        price: cache.price,
        symbol: chainConfig.nativeSymbol,
        source: "coinbase",
        fetchedAt: new Date(cache.at).toISOString(),
      } satisfies EthPrice,
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  }

  try {
    const response = await fetch(SOURCE, {
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);

    const body = (await response.json()) as { data?: { amount?: string } };
    const price = Number(body.data?.amount);

    // A zero, a negative or a NaN is not a price.
    if (!Number.isFinite(price) || price <= 0) throw new Error("unusable price");

    cache = { price, at: now };
    return NextResponse.json(
      {
        price,
        symbol: chainConfig.nativeSymbol,
        source: "coinbase",
        fetchedAt: new Date(now).toISOString(),
      } satisfies EthPrice,
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch {
    // Explicitly not falling back to the expired cache. If the feed is down,
    // the honest answer is that we do not currently know the price.
    return NextResponse.json(
      {
        price: null,
        symbol: chainConfig.nativeSymbol,
        source: null,
        fetchedAt: null,
      } satisfies EthPrice,
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
