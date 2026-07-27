import "server-only";
import { chainConfig } from "@/lib/config";

/**
 * Top tokens on Robinhood Chain, from the chain's own Blockscout instance,
 * ranked by holder count.
 *
 * Blockscout is the right source here rather than a DEX aggregator's discovery
 * feed: it is chain-native, stable, ranked, and it does not rotate its contents
 * between calls the way "latest profiles" endpoints do.
 *
 * The result is cached in-process with a last-good fallback, so a transient
 * upstream failure serves the previous list instead of an empty one. Nothing is
 * ever synthesised — an empty cache and a failed fetch return nothing at all.
 */

export interface RobinhoodToken {
  address: string;
  symbol: string;
  name: string;
  /** Circulating market cap in USD, as reported by the explorer. */
  marketCapUsd: number | null;
  holders: number | null;
  /** Served through our own proxy, never as a third-party URL. */
  iconPath: string | null;
}

/**
 * Holders below this are treated as not genuinely traded on this chain.
 *
 * Market cap alone is a poor signal here: a bridged blue-chip can carry a huge
 * global cap while having almost no local holders — APE, for instance, reports
 * a nine-figure cap against 11 holders on Robinhood Chain. Ranking by holders
 * surfaces what the chain's own community actually holds.
 */
const MIN_HOLDERS = 100;

/**
 * Symbols excluded from "emerging memes": stablecoins, wrapped natives and
 * liquid-staking receipts. These dominate any ranking on any chain and are not
 * what this section is about.
 */
const NON_MEME_SYMBOLS = new Set([
  "USDE", "USDG", "USDT", "USDC", "DAI", "FRAX", "TUSD", "PYUSD", "USDS",
  "SYRUPUSDG", "SYRUPUSDC",
  "WETH", "ETH", "WBTC", "CBBTC", "TBTC",
  "WSTETH", "STETH", "RETH", "CBETH", "WEETH", "EZETH",
  "LINK",
]);

/**
 * Robinhood's tokenized equities (NVDA, AAPL, TSLA, SPY…) mark themselves in
 * their own token name. They are among the most-held assets on this chain, and
 * they are emphatically not memecoins — surfacing them on a discovery strip
 * would imply an equity could arrive as a reward.
 *
 * Matching the issuer's own naming convention is more robust than maintaining a
 * ticker denylist, and it does not depend on DEX data: these tokens have deep
 * DEX liquidity, so pair presence cannot separate them from memecoins.
 */
const STOCK_TOKEN_MARKER = /robinhood\s+token/i;

function isMemeCandidate(symbol: string, name: string): boolean {
  if (STOCK_TOKEN_MARKER.test(name)) return false;

  const s = symbol.toUpperCase();
  if (NON_MEME_SYMBOLS.has(s)) return false;
  // Catch stablecoin variants the explicit list misses.
  if (/^(W|ST|WST)?USD/.test(s) || /USD$/.test(s)) return false;
  return true;
}

interface BlockscoutToken {
  address_hash?: string;
  address?: string;
  symbol?: string;
  name?: string;
  icon_url?: string;
  holders_count?: string;
  holders?: string;
  circulating_market_cap?: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { at: number; tokens: RobinhoodToken[]; icons: Map<string, string> } | null =
  null;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  const response = await fetch(
    `${chainConfig.explorerUrl}/api/v2/tokens?type=ERC-20`,
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`blockscout ${response.status}`);

  const body = (await response.json()) as { items?: BlockscoutToken[] };
  const icons = new Map<string, string>();

  const tokens = (body.items ?? [])
    .map((t): RobinhoodToken | null => {
      const address = (t.address_hash ?? t.address ?? "").trim();
      const symbol = (t.symbol ?? "").trim();
      if (!address || !symbol) return null;

      const key = address.toLowerCase();
      if (t.icon_url) icons.set(key, t.icon_url);

      const cap = Number(t.circulating_market_cap);
      const holders = Number(t.holders_count ?? t.holders);

      return {
        address,
        symbol,
        name: (t.name ?? symbol).trim(),
        marketCapUsd: Number.isFinite(cap) ? cap : null,
        holders: Number.isFinite(holders) ? holders : null,
        iconPath: t.icon_url ? `/api/token-icon/${key}` : null,
      };
    })
    .filter(
      (t): t is RobinhoodToken =>
        t !== null &&
        isMemeCandidate(t.symbol, t.name) &&
        (t.holders ?? 0) >= MIN_HOLDERS,
    )
    // Holders first — that is what "trending on this chain" means. Market cap
    // only breaks ties between tokens with comparable communities.
    .sort(
      (a, b) =>
        (b.holders ?? 0) - (a.holders ?? 0) ||
        (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0),
    );

  cache = { at: Date.now(), tokens, icons };
}

async function ensureFresh(): Promise<void> {
  const fresh = cache && Date.now() - cache.at < CACHE_TTL_MS;
  if (fresh) return;

  // Collapse concurrent refreshes into one upstream request.
  if (!inflight) {
    inflight = refresh().finally(() => {
      inflight = null;
    });
  }

  try {
    await inflight;
  } catch {
    // Keep serving the last good list rather than going blank on a blip.
    // With no cache at all the caller gets an empty array and says so.
  }
}

export async function topRobinhoodTokens(limit = 12): Promise<{
  tokens: RobinhoodToken[];
  fetchedAt: number | null;
  stale: boolean;
}> {
  await ensureFresh();
  if (!cache) return { tokens: [], fetchedAt: null, stale: false };
  return {
    tokens: cache.tokens.slice(0, limit),
    fetchedAt: cache.at,
    stale: Date.now() - cache.at >= CACHE_TTL_MS,
  };
}

/**
 * The upstream icon URL for a token address.
 *
 * Resolved from the cached explorer listing — the caller supplies an address,
 * never a URL, so this can only ever fetch a host the explorer already
 * published for that token.
 */
export async function iconUrlFor(address: string): Promise<string | null> {
  await ensureFresh();
  return cache?.icons.get(address.toLowerCase()) ?? null;
}
