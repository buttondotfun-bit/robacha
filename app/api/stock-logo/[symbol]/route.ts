import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Logos change almost never; cache hard so the upstream is hit once per symbol.
export const revalidate = 86400;

/**
 * A cached, same-origin proxy for real company logos of tokenized stocks, keyed
 * by ticker. Robinhood's own asset CDN serves an identical generic mark for
 * every token (verified: AAPL and NVDA return byte-identical images), so it's
 * useless for telling assets apart. This instead pulls the genuine company logo
 * from FinancialModelingPrep's public image endpoint.
 *
 * Proxying (rather than hotlinking from the browser) means one cached fetch per
 * symbol instead of one per visitor, no client-side rate limiting, and a clean
 * 404 the UI can fall back from to a ticker monogram. Logos identify real,
 * on-chain-listed assets descriptively — not an endorsement, and the page says
 * so.
 */

const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const clean = (symbol ?? "").toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 8);
  if (!clean) return new NextResponse(null, { status: 404 });

  try {
    const upstream = await fetch(
      `https://financialmodelingprep.com/image-stock/${clean}.png`,
      { next: { revalidate }, signal: AbortSignal.timeout(10_000) },
    );
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return new NextResponse(null, { status: 404 });
    }
    const body = await upstream.arrayBuffer();
    // Guard against tiny placeholder/error images the upstream sometimes returns.
    if (body.byteLength < 300) return new NextResponse(null, { status: 404 });

    return new NextResponse(body, {
      status: 200,
      headers: { "content-type": contentType, "cache-control": CACHE },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
