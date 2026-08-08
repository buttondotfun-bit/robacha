"use client";

import { createContext, useContext } from "react";
import { ACTIVE_POOL_ID } from "./config";

/**
 * Which pool the spin experience is operating on.
 *
 * The whole spin flow — reading the pool, the live round, and sending a spin —
 * used to be hardcoded to the app's single active pool (Genesis). This context
 * lets the exact same UI drive a second machine (the Stock Machine) simply by
 * wrapping it in a provider with a different pool id. When there's no provider —
 * every existing call site — it falls back to ACTIVE_POOL_ID, so Genesis behaves
 * exactly as before and nothing else has to change.
 *
 * The gacha's `spin(poolId, quantity)` already takes a pool id, so this is a
 * frontend-only rewire, not a contract change.
 */
const PoolIdContext = createContext<bigint | null>(null);

export function PoolProvider({ poolId, children }: { poolId: bigint; children: React.ReactNode }) {
  return <PoolIdContext.Provider value={poolId}>{children}</PoolIdContext.Provider>;
}

/** The pool id for the current subtree; ACTIVE_POOL_ID (Genesis) by default. */
export function usePoolId(): bigint {
  return useContext(PoolIdContext) ?? ACTIVE_POOL_ID;
}
