"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type {
  ActivityEvent,
  ActivityKind,
  ActivityResponse,
} from "@/types/activity";

export type ActivityUnavailable =
  | "not-configured"
  | "indexer-unavailable"
  | "indexer-behind"
  /** Upstream RPC returned 429. A throttle, not a fault — worth saying so. */
  | "rpc-throttled"
  | null;

/** Thrown when `/api/activity` cannot serve confirmed data. */
class ActivityUnavailableError extends Error {
  constructor(readonly reason: Exclude<ActivityUnavailable, null>) {
    super(reason);
    this.name = "ActivityUnavailableError";
  }
}

async function fetchActivity(
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<ActivityResponse> {
  const response = await fetch(`/api/activity?${params}`, {
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      reason?: Exclude<ActivityUnavailable, null>;
    } | null;
    throw new ActivityUnavailableError(body?.reason ?? "indexer-unavailable");
  }

  return (await response.json()) as ActivityResponse;
}

/**
 * Platform activity, served by the indexer from confirmed contract logs.
 *
 * There is no seed data and no optimistic row. When the indexer is unreachable
 * or behind its confirmation depth, the hook says so and the caller renders an
 * unavailable state rather than a stale feed.
 */
export function useActivity(options?: {
  wallet?: string;
  kinds?: ActivityKind[];
  limit?: number;
  pollMs?: number;
}) {
  // Paced against the public RPC rather than the block time: this feed is
  // read-only context, and polling it hard is what exhausted the rate limit.
  const { wallet, kinds, limit = 50, pollMs = 45_000 } = options ?? {};
  const kindKey = kinds?.join(",") ?? "";

  const query = useQuery({
    queryKey: ["robacha", "activity", wallet ?? "", kindKey, limit],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (wallet) params.set("wallet", wallet);
      if (kindKey) params.set("kinds", kindKey);
      return fetchActivity(params, signal);
    },
    refetchInterval: pollMs,
    retry: false,
    staleTime: pollMs / 2,
  });

  const unavailable: ActivityUnavailable = query.error
    ? query.error instanceof ActivityUnavailableError
      ? query.error.reason
      : "indexer-unavailable"
    : query.data && !query.data.synced
      ? "indexer-behind"
      : null;

  // A feed that is behind the chain head is withheld rather than shown stale.
  const events: ActivityEvent[] =
    query.data && query.data.synced ? query.data.events : [];

  return {
    events,
    unavailable,
    isLoading: query.isPending,
    indexedBlock: query.data?.indexedBlock ?? null,
    headBlock: query.data?.headBlock ?? null,
    refetch: () => void query.refetch(),
  };
}

/**
 * A clock that only ticks on the client, so nothing time-dependent reaches the
 * server render. The snapshot is bucketed to the tick interval so repeated
 * reads return an identical value between ticks.
 */
const TICK_MS = 30_000;

function subscribeToClock(onChange: () => void) {
  const id = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(id);
}

function clockSnapshot() {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

function clockServerSnapshot() {
  return 0;
}

export function useNow() {
  return useSyncExternalStore(
    subscribeToClock,
    clockSnapshot,
    clockServerSnapshot,
  );
}

export const ACTIVITY_TAB_KINDS: Record<string, ActivityKind[] | undefined> = {
  all: undefined,
  spins: ["spin"],
  rewards: ["reward-assigned"],
  claims: ["claim"],
  refunds: ["refund"],
  pool: ["pool-update"],
};
