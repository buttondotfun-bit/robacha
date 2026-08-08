"use client";

import { AppClient } from "@/app/(product)/app/AppClient";
import { PoolProvider } from "@/lib/pool-context";
import { STOCK_POOL_ID, ACTIVE_POOL_ID } from "@/lib/config";

/**
 * The Stock Machine, once it's live.
 *
 * When a tokenized-stock pool is deployed and funded on chain and
 * NEXT_PUBLIC_ROBACHA_STOCK_POOL_ID points at it, the same verified spin
 * experience the Genesis machine uses is rendered against that pool — the whole
 * flow reads its pool id from PoolProvider, so nothing about the spin, stage,
 * odds, price or claims is duplicated or re-authored. Everything shown is read
 * from the stock pool's own contract state; if it isn't actually funded, the
 * gacha's readiness check keeps the spin button disabled.
 */
export function StockMachineLive() {
  return (
    <PoolProvider poolId={STOCK_POOL_ID ?? ACTIVE_POOL_ID}>
      <AppClient lean />
    </PoolProvider>
  );
}
