"use client";

import { useQuery } from "@tanstack/react-query";
import type { AnalyticsResponse } from "@/app/api/analytics/route";

/**
 * Participation figures for the admin console.
 *
 * Slower-moving than the rest of the admin state — it walks the whole log
 * history rather than reading a handful of contract slots — so it polls far
 * less often. Nothing here drives a decision that needs to be current to the
 * second.
 */
export function useAnalytics() {
  const query = useQuery({
    queryKey: ["robacha", "analytics"],
    staleTime: 60_000,
    refetchInterval: 300_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/analytics", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("analytics unavailable");
      return (await response.json()) as AnalyticsResponse;
    },
  });

  return {
    analytics: query.data ?? null,
    isLoading: query.isPending,
    unavailable: query.isError,
    refetch: () => void query.refetch(),
  };
}
