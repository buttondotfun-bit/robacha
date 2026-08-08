import { NextResponse } from "next/server";
import { isAddress } from "viem";

export const runtime = "nodejs";
// Cached, not live: the tokenized-stock catalogue changes rarely, and this
// only ever feeds a marketing rail. An hour-old list is fine, and the cache
// keeps Robinhood's endpoint from being hit per visitor.
export const revalidate = 3600;

/**
 * The real catalogue of tokenized stocks live on Robinhood Chain.
 *
 * Proxied from Robinhood's public, read-only asset API
 * (https://api.robinhood.com/rhj/assets) so the Stock Machine preview can show
 * what genuinely trades on-chain today — real symbols, names, logos and
 * contracts — rather than inventing any. Nothing here implies these assets are
 * in a Robacha pool: they are the chain's universe, not a reward lineup, and the
 * page says so. On upstream failure this returns an empty list with `ok: false`
 * so the UI degrades to honest copy instead of stale or faked data.
 */

const UPSTREAM = "https://api.robinhood.com/rhj/assets";
const ROBINHOOD_CHAIN_ID = 4663;

export interface StockToken {
  symbol: string;
  /** Cleaned display name (the " • Robinhood Token" suffix removed). */
  name: string;
  /**
   * Real company logo, via our cached /api/stock-logo proxy keyed by ticker.
   * Robinhood's own asset CDN serves an identical generic mark for every token,
   * so it can't distinguish assets; the proxy pulls the genuine company logo and
   * 404s cleanly when there's none (ETFs, obscure names), letting the UI fall
   * back to a ticker monogram.
   */
  logoUrl: string;
  address: string;
}

interface UpstreamAsset {
  tokenSymbol?: string;
  tokenName?: string;
  logoUrl?: string;
  status?: string;
  deployments?: { contractAddress?: string; chainId?: number }[];
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s*•\s*Robinhood Token\s*$/i, "")
    .replace(/\s+Common Stock$/i, "")
    .trim();
}

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, {
      headers: { accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const body = (await res.json()) as { assets?: UpstreamAsset[] };
    const tokens: StockToken[] = [];

    for (const a of body.assets ?? []) {
      if (a.status && a.status !== "ASSET_STATUS_ACTIVE") continue;
      const symbol = a.tokenSymbol?.trim();
      if (!symbol) continue;
      const deployment = a.deployments?.find((d) => d.chainId === ROBINHOOD_CHAIN_ID) ?? a.deployments?.[0];
      const address = deployment?.contractAddress;
      if (!address || !isAddress(address)) continue;
      tokens.push({
        symbol,
        name: cleanName(a.tokenName ?? symbol),
        logoUrl: `/api/stock-logo/${encodeURIComponent(symbol)}`,
        address,
      });
    }

    // Stable, deterministic order: alphabetical by symbol.
    tokens.sort((x, y) => x.symbol.localeCompare(y.symbol));

    return NextResponse.json(
      { ok: true, total: tokens.length, tokens },
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ ok: false, total: 0, tokens: [] as StockToken[] }, { status: 200 });
  }
}
