"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * The operator read of `/api/health` — every check there performs a real call
 * (bytecode read back from an address, `spinReadiness` from the contract), so
 * nothing is reported healthy merely because it is configured. The endpoint
 * returns 503 when a required dependency is down, still with a full JSON body,
 * so the body is always parsed and only a network failure is an error.
 */

export interface HealthCheck {
  ok: boolean;
  required: boolean;
  detail?: string;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  publicPaidSpinsEnabled?: boolean;
  chainId: number;
  headBlock: number | null;
  checks: Record<string, HealthCheck>;
  contracts: Record<string, string | null>;
  contractsDeployed: Record<string, boolean>;
  checkedAt: string;
  durationMs?: number;
}

export interface UseAdminHealth {
  health: HealthResponse | null;
  isLoading: boolean;
  unreachable: boolean;
  updatedAt: number | null;
  refetch: () => void;
}

export function useAdminHealth(enabled = true): UseAdminHealth {
  const query = useQuery({
    queryKey: ["robacha", "admin", "health"],
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
    queryFn: async ({ signal }): Promise<HealthResponse> => {
      const response = await fetch("/api/health", { signal, cache: "no-store" });
      // 503 carries the same body as 200 — parse regardless of status.
      return (await response.json()) as HealthResponse;
    },
  });

  return {
    health: query.data ?? null,
    isLoading: query.isPending,
    unreachable: query.isError,
    updatedAt: query.dataUpdatedAt || null,
    refetch: () => void query.refetch(),
  };
}
