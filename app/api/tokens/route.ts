import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { chainConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Market metadata for reward tokens, keyed by contract address.
 *
 * Resolved from DexScreener's on-chain pair index. The contract address is the
 * identity — nothing is ever matched by ticker, because two tokens can share a
 * symbol and only one of them is in the pool.
 *
 * For each token the deepest pair on this chain wins, and its liquidity is
 * reported alongside the price so the caller can decide whether to trust it.
 * A token below `MIN_LIQUIDITY_USD` returns `price: null` with
 * `priceReliable: false` rather than a number the UI would display as fact.
 *
 * The logo is treated separately from the price: an illiquid token still has a
 * real logo, and showing it is honest even when quoting its price is not.
 */

/** Below this, a spot price is too easily moved to display. Configurable. */
const MIN_LIQUIDITY_USD = Number(
  process.env.ROBACHA_MIN_LIQUIDITY_USD ?? "25000",
);

/** DexScreener's identifier for Robinhood Chain. */
const DEX_CHAIN_ID = "robinhood";

export interface TokenMarket {
  address: string;
  symbol: string | null;
  name: string | null;
  logoUrl: string | null;
  /** USD price, or null when no sufficiently liquid pair backs it. */
  price: number | null;
  priceReliable: boolean;
  liquidityUsd: number | null;
  /**
   * Rolling 24h stats and valuation from the same deepest pair. Present only
   * when the pair backs a reliable price and the upstream actually reported the
   * field — never inferred, so the caller renders "—" on null rather than a
   * fabricated figure. `change24h` is a signed percent; the rest are USD.
   */
  volume24h: number | null;
  change24h: number | null;
  fdv: number | null;
  marketCap: number | null;
  dex: string | null;
  pairAddress: string | null;
  /** Why a price is missing, when it is. */
  unavailableReason: "no-pair" | "insufficient-liquidity" | "upstream-error" | null;
}

interface DexPair {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  priceUsd?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  fdv?: number;
  marketCap?: number;
  info?: { imageUrl?: string };
}

/** A finite number or null — used to keep unreported upstream fields honest. */
function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get("addresses") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const addresses = [...new Set(raw.map((a) => a.toLowerCase()))].filter((a) =>
    isAddress(a),
  ) as Address[];

  if (addresses.length === 0) {
    return NextResponse.json({ tokens: [], minLiquidityUsd: MIN_LIQUIDITY_USD });
  }
  if (addresses.length > 30) {
    return NextResponse.json({ error: "too many addresses" }, { status: 400 });
  }

  try {
    // Asked for in small chunks, not one batch, because the response caps the
    // number of *pairs* it returns rather than the number of tokens. Each of
    // these tokens now trades in several pools — V2, V3 and V4 — so a single
    // request for the whole pool blew through that cap and the tokens late in
    // the list came back as though they had no pairs at all. They then rendered
    // the generated placeholder instead of their real logo, which looked like
    // missing artwork and was really a truncated response.
    //
    // Three at a time keeps each response well inside the cap while still
    // costing only a handful of round trips, and they run concurrently so the
    // wall-clock cost is one request.
    const CHUNK = 3;
    const chunks: Address[][] = [];
    for (let i = 0; i < addresses.length; i += CHUNK) {
      chunks.push(addresses.slice(i, i + CHUNK));
    }

    const responses = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`,
          { headers: { accept: "application/json" }, cache: "no-store" },
        );
        if (!response.ok) throw new Error(`upstream ${response.status}`);
        const body = (await response.json()) as { pairs?: DexPair[] | null };
        return body.pairs ?? [];
      }),
    );

    const pairs = responses
      .flat()
      .filter((p) => p.chainId === DEX_CHAIN_ID && p.baseToken?.address);

    // Keep only the deepest pair per token — the shallow ones are noise and
    // their prices are the easiest to push around.
    const deepest = new Map<string, DexPair>();
    for (const pair of pairs) {
      const key = pair.baseToken!.address!.toLowerCase();
      const current = deepest.get(key);
      if (!current || (pair.liquidity?.usd ?? 0) > (current.liquidity?.usd ?? 0)) {
        deepest.set(key, pair);
      }
    }

    const tokens: TokenMarket[] = addresses.map((address) => {
      const pair = deepest.get(address.toLowerCase());

      if (!pair) {
        return {
          address,
          symbol: null,
          name: null,
          logoUrl: null,
          price: null,
          priceReliable: false,
          liquidityUsd: null,
          volume24h: null,
          change24h: null,
          fdv: null,
          marketCap: null,
          dex: null,
          pairAddress: null,
          unavailableReason: "no-pair",
        };
      }

      const liquidityUsd = pair.liquidity?.usd ?? 0;
      const parsed = Number(pair.priceUsd);
      const reliable = liquidityUsd >= MIN_LIQUIDITY_USD && Number.isFinite(parsed);

      return {
        address,
        symbol: pair.baseToken?.symbol ?? null,
        name: pair.baseToken?.name ?? null,
        // The logo stands on its own: it is real regardless of pool depth.
        logoUrl: pair.info?.imageUrl ?? null,
        price: reliable ? parsed : null,
        priceReliable: reliable,
        liquidityUsd,
        // Tied to the same reliability gate as the price: a pair too thin to
        // quote is too thin for its volume or valuation to mean anything either.
        volume24h: reliable ? finiteOrNull(pair.volume?.h24) : null,
        change24h: reliable ? finiteOrNull(pair.priceChange?.h24) : null,
        fdv: reliable ? finiteOrNull(pair.fdv) : null,
        marketCap: reliable ? finiteOrNull(pair.marketCap) : null,
        dex: pair.dexId ?? null,
        pairAddress: pair.pairAddress ?? null,
        unavailableReason: reliable ? null : "insufficient-liquidity",
      };
    });

    return NextResponse.json({
      tokens,
      chainId: chainConfig.id,
      minLiquidityUsd: MIN_LIQUIDITY_USD,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    // Upstream failure returns every token as unresolved rather than partially
    // filled, so the UI never mixes fresh and missing data in one row.
    return NextResponse.json(
      {
        tokens: addresses.map<TokenMarket>((address) => ({
          address,
          symbol: null,
          name: null,
          logoUrl: null,
          price: null,
          priceReliable: false,
          liquidityUsd: null,
          volume24h: null,
          change24h: null,
          fdv: null,
          marketCap: null,
          dex: null,
          pairAddress: null,
          unavailableReason: "upstream-error",
        })),
        minLiquidityUsd: MIN_LIQUIDITY_USD,
        error: error instanceof Error ? error.message : "market data unavailable",
      },
      { status: 200 },
    );
  }
}
