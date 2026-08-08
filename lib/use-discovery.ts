"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  DiscoveryProject,
  DiscoveryResponse,
} from "@/app/api/discovery/route";

/**
 * Discovery aggregates from `/api/discovery` — per-token unique-discoverer /
 * pull counts and the Top Discoverers ranking, all derived from `RewardAssigned`
 * logs. Slower-moving than live pool state, so it polls gently. Nothing here is
 * invented; an unreachable endpoint surfaces as `isError`, not a zero.
 */
export function useDiscovery() {
  const query = useQuery({
    queryKey: ["robacha", "discovery"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async ({ signal }): Promise<DiscoveryResponse> => {
      const response = await fetch("/api/discovery", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("discovery unavailable");
      return (await response.json()) as DiscoveryResponse;
    },
  });

  const byToken = new Map<string, DiscoveryProject>();
  for (const p of query.data?.projects ?? []) byToken.set(p.token.toLowerCase(), p);

  return {
    projects: query.data?.projects ?? [],
    topDiscoverers: query.data?.topDiscoverers ?? [],
    totalProjects: query.data?.totalProjects ?? null,
    totalPulls: query.data?.totalPulls ?? null,
    totalExplorers: query.data?.totalExplorers ?? null,
    /** Discovery stats for one token address, or undefined. */
    stat: (address: string): DiscoveryProject | undefined =>
      byToken.get(address.toLowerCase()),
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

/**
 * The "trending / most discovered" metric, documented and deterministic:
 * unique wallets that have discovered a project, over the scanned log history.
 * Never token price. This label is surfaced in a tooltip on the UI.
 */
export const TRENDING_EXPLAINER =
  "Ranked by unique wallets that have discovered each project through Robacha — recent onchain discovery activity, not token price.";
