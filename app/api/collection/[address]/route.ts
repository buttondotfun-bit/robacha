import { NextResponse } from "next/server";
import { isAddress } from "viem";

export const runtime = "nodejs";
// Provenance barely moves minute to minute; cache hard so the explorer isn't
// hit per viewer.
export const revalidate = 900;

/**
 * On-chain provenance for an NFT collection, from Robinhood Chain's own
 * Blockscout explorer.
 *
 * This is the liquidity/legitimacy signal that complements the verified-collection
 * allowlist: even for a collection that isn't on the list, real numbers tell the
 * story a counterfeit can't fake — a genuine collection has hundreds of holders
 * and a long transfer history; a fresh fake has ~1 holder and none. Blockscout's
 * own `is_scam` and `reputation` flags are surfaced too. Everything here is read
 * from the explorer, nothing is inferred; on failure the fields are null and the
 * UI shows "unavailable" rather than a fabricated number.
 */

const EXPLORER = "https://robinhoodchain.blockscout.com";

export interface CollectionStats {
  ok: boolean;
  holders: number | null;
  totalSupply: number | null;
  transfers: number | null;
  /** Blockscout verified the contract's source. */
  contractVerified: boolean | null;
  /** Blockscout flagged the address as a scam. */
  isScam: boolean | null;
  /** Blockscout reputation string, e.g. "ok". */
  reputation: string | null;
}

const EMPTY: CollectionStats = {
  ok: false,
  holders: null,
  totalSupply: null,
  transfers: null,
  contractVerified: null,
  isScam: null,
  reputation: null,
};

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) return NextResponse.json(EMPTY, { status: 200 });

  // Blockscout is fronted by a WAF that blocks the default Node/undici
  // User-Agent, so present a browser-like one. `accept` keeps it to JSON.
  const headers = {
    accept: "application/json",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };

  async function getJson(path: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`${EXPLORER}${path}`, { headers, next: { revalidate }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  try {
    // Independent so one slow/blocked endpoint can't take the other down.
    const [token, addr] = await Promise.all([
      getJson(`/api/v2/tokens/${address}`),
      getJson(`/api/v2/addresses/${address}`),
    ]);

    if (!token && !addr) return NextResponse.json(EMPTY, { status: 200 });

    const stats: CollectionStats = {
      ok: true,
      holders: num(token?.holders_count),
      totalSupply: num(token?.total_supply),
      transfers: null,
      contractVerified: typeof addr?.is_verified === "boolean" ? addr.is_verified : null,
      isScam: typeof addr?.is_scam === "boolean" ? addr.is_scam : null,
      reputation: typeof token?.reputation === "string" ? token.reputation : null,
    };

    return NextResponse.json(stats, {
      headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(EMPTY, { status: 200 });
  }
}
