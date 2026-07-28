import "server-only";
import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { chainConfig } from "@/lib/config";
import { rpc } from "@/lib/env/server";

/**
 * Server-side chain clients.
 *
 * The authenticated endpoint is preferred for every read. The public RPC is
 * only ever a fallback, and `usingFallbackRpc` reports when that is the case so
 * `/api/health` can say so out loud rather than presenting a degraded setup as
 * a healthy one.
 */

export const robinhoodChain = defineChain({
  id: chainConfig.id,
  name: chainConfig.name,
  nativeCurrency: { name: "Ether", symbol: chainConfig.nativeSymbol, decimals: 18 },
  rpcUrls: { default: { http: [rpc.robinhood ?? chainConfig.rpcUrl] } },
  blockExplorers: {
    default: { name: "Blockscout", url: chainConfig.explorerUrl },
  },
  // Multicall3 is deployed at its canonical address on this chain (verified on
  // chain: 3809 bytes, aggregate3 answers). Without declaring it here viem
  // refuses every `multicall`, which is what made My Bag report "the indexer is
  // not reachable" for a wallet whose rewards were sitting on chain.
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

export const usingFallbackRpc = rpc.robinhood === null;

/** True when an archive-capable endpoint is configured for historical reads. */
export const hasArchiveRpc = rpc.robinhoodArchive !== null;

let cached: PublicClient | null = null;

export function publicClient(): PublicClient {
  if (!cached) {
    cached = createPublicClient({
      chain: robinhoodChain,
      transport: http(rpc.robinhood ?? chainConfig.rpcUrl, {
        retryCount: 2,
        timeout: 12_000,
      }),
    });
  }
  return cached;
}

let cachedArchive: PublicClient | null = null;

/**
 * A client for historical queries. Returns null when no archive endpoint is
 * configured — the caller must then report that history is unavailable rather
 * than querying a pruned node and silently returning a short window.
 */
export function archiveClient(): PublicClient | null {
  if (!rpc.robinhoodArchive) return null;
  if (!cachedArchive) {
    cachedArchive = createPublicClient({
      chain: robinhoodChain,
      transport: http(rpc.robinhoodArchive, { retryCount: 2, timeout: 20_000 }),
    });
  }
  return cachedArchive;
}

/** JSON cannot hold a bigint; every API response goes through this. */
export function serialiseBigints<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  ) as T;
}
