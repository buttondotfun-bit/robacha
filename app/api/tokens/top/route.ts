import { NextResponse } from "next/server";
import { chainConfig } from "@/lib/config";
import { topRobinhoodTokens } from "@/lib/server/robinhood-tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The trending tokens on Robinhood Chain, ranked by holder count.
 *
 * Sourced from the chain's own Blockscout instance and filtered to exclude
 * stablecoins, wrapped natives and liquid-staking receipts, plus anything below
 * a minimum holder count — a bridged token can carry a large global market cap
 * while barely being held on this chain, and it is not trending here.
 *
 * This is ecosystem data, not pool data. Nothing here implies a token is in a
 * reward pool.
 */
export async function GET(request: Request) {
  const limit = Math.min(
    Math.max(
      Number.parseInt(new URL(request.url).searchParams.get("limit") ?? "12", 10) || 12,
      1,
    ),
    50,
  );

  const { tokens, fetchedAt, stale } = await topRobinhoodTokens(limit);

  return NextResponse.json(
    {
      tokens,
      chainId: chainConfig.id,
      source: "blockscout",
      fetchedAt,
      stale,
    },
    {
      headers: {
        // Let the edge hold it briefly and serve the old copy while revalidating.
        "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
