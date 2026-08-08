"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * The operator-facing read of `/api/monitor` — the same production probe that
 * pages a human. Every alert here is a real, deterministic condition where
 * money is stuck or about to be (see the route for the exact thresholds), so
 * the console never invents a status: it renders exactly what the probe found,
 * or says it could not run.
 *
 * The endpoint returns 503 with a body for "unknown" (contracts unconfigured),
 * so the body is parsed regardless of HTTP status; only a network/parse failure
 * is treated as an error.
 */

export type MonitorSeverity = "critical" | "warning";

export interface MonitorAlert {
  check: string;
  severity: MonitorSeverity;
  detail: string;
}

export interface MonitorResponse {
  status: "ok" | "warning" | "critical" | "unknown";
  alerts: MonitorAlert[];
  facts?: Record<string, unknown>;
  reason?: string;
  checkedAt: string;
  durationMs?: number;
}

export interface UseAdminMonitor {
  monitor: MonitorResponse | null;
  isLoading: boolean;
  /** The fetch itself failed — distinct from a probe that ran and found faults. */
  unreachable: boolean;
  updatedAt: number | null;
  refetch: () => void;
}

export function useAdminMonitor(refetchInterval: number | false = 20_000): UseAdminMonitor {
  const query = useQuery({
    queryKey: ["robacha", "admin", "monitor"],
    refetchInterval,
    staleTime: 10_000,
    retry: 1,
    queryFn: async ({ signal }): Promise<MonitorResponse> => {
      const response = await fetch("/api/monitor", { signal, cache: "no-store" });
      // 503 is a valid, meaningful body ("unknown" / contracts unconfigured);
      // only a non-JSON / network failure is a real error.
      const body = (await response.json()) as MonitorResponse;
      return body;
    },
  });

  return {
    monitor: query.data ?? null,
    isLoading: query.isPending,
    unreachable: query.isError,
    updatedAt: query.dataUpdatedAt || null,
    refetch: () => void query.refetch(),
  };
}

/** Read a numeric fact safely (facts are `unknown`, some are wei strings). */
export function factNumber(
  facts: Record<string, unknown> | undefined,
  key: string,
): number | null {
  const v = facts?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

/** Read a string fact safely. */
export function factString(
  facts: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const v = facts?.[key];
  return typeof v === "string" ? v : null;
}

/** Read a boolean fact safely. */
export function factBool(
  facts: Record<string, unknown> | undefined,
  key: string,
): boolean | null {
  const v = facts?.[key];
  return typeof v === "boolean" ? v : null;
}
