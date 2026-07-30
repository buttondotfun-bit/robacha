"use client";

import { ExternalLink, RefreshCw, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { EmptyState } from "@/components/shared/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FilterPill, SearchInput, Select } from "@/components/ui/Field";
import { explorerUrl } from "@/lib/config";
import { RARITY_LABEL, RARITY_ORDER, RARITY_RANK } from "@/lib/constants";
import { formatAmount, formatOdds, formatRange } from "@/lib/formatters";
import { usePool, type PoolRewardEntry } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import type { Rarity } from "@/types/token";

type SortKey = "odds-desc" | "odds-asc" | "inventory" | "az";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "odds-desc", label: "Best odds" },
  { value: "odds-asc", label: "Longest odds" },
  { value: "inventory", label: "Most inventory" },
  { value: "az", label: "A–Z" },
];

/**
 * The reward pool explorer. Lists exactly the slots the active pool contract
 * defines — no roster is authored in the app, so an unconfigured or empty pool
 * renders an unavailable state rather than examples.
 */
export function RewardsExplorer() {
  const { pool, unavailableReason, isLoading, refetch } = usePool();
  const market = useTokenMarket(pool?.entries.map((e) => e.token) ?? []);
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [sort, setSort] = useState<SortKey>("odds-desc");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: pool?.entries.length ?? 0 };
    for (const band of RARITY_ORDER) {
      map[band] = pool?.entries.filter((e) => e.rarity === band).length ?? 0;
    }
    return map;
  }, [pool]);

  const results = useMemo(() => {
    if (!pool) return [] as PoolRewardEntry[];
    const needle = query.trim().toLowerCase();

    const filtered = pool.entries.filter((entry) => {
      if (rarity !== "all" && entry.rarity !== rarity) return false;
      if (!needle) return true;
      return (
        (entry.name ?? "").toLowerCase().includes(needle) ||
        (entry.symbol ?? "").toLowerCase().includes(needle) ||
        entry.token.toLowerCase().includes(needle)
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case "odds-asc":
        sorted.sort((a, b) => a.oddsPercent - b.oddsPercent);
        break;
      case "inventory":
        sorted.sort(
          (a, b) => (b.availableDisplay ?? 0) - (a.availableDisplay ?? 0),
        );
        break;
      case "az":
        sorted.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        break;
      default:
        sorted.sort(
          (a, b) =>
            b.oddsPercent - a.oddsPercent ||
            RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity],
        );
    }
    return sorted;
  }, [pool, rarity, sort, query]);

  if (!pool) {
    return (
      <div className="glass-panel overflow-hidden">
        <UnavailableState
          kind={unavailableReason ?? "no-active-pool"}
          action={
            <Button
              variant="secondary"
              size="md"
              onClick={refetch}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SearchInput
            label="Search rewards by name, symbol or contract"
            placeholder="Search name, symbol or contract…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:max-w-[320px] sm:flex-1"
          />
          <Select
            label="Sort rewards"
            value={sort}
            onChange={setSort}
            options={SORTS}
            className="sm:w-[190px]"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by rarity"
          className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          <FilterPill
            active={rarity === "all"}
            count={counts.all}
            onClick={() => setRarity("all")}
          >
            All
          </FilterPill>
          {RARITY_ORDER.filter((band) => counts[band] > 0).map((band) => (
            <span key={band} data-rarity={band} className="contents">
              <FilterPill
                rarity
                active={rarity === band}
                count={counts[band]}
                onClick={() => setRarity(band)}
              >
                {RARITY_LABEL[band]}
              </FilterPill>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pb-3" aria-live="polite">
        <p className="text-[12.5px] text-ink-2">
          Showing <span className="num text-ink">{results.length}</span> of{" "}
          <span className="num text-ink">{pool.entries.length}</span> reward
          slots
        </p>
      </div>

      {results.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((entry) => (
            <li
              key={`${entry.token}-${entry.tierIndex}`}
              data-rarity={entry.rarity}
              className="glass-card glass-reflection glass-highlight relative flex flex-col overflow-hidden rounded-[22px] p-2.5"
            >
              <div className="relative overflow-hidden rounded-[16px] border border-[rgb(var(--edge-rgb)_/_0.85)] [container-type:inline-size]">
                <span className="block aspect-square w-full">
                  <TokenAvatar
                    address={entry.token}
                    symbol={entry.symbol}
                    logoUrl={market.get(entry.token)?.logoUrl}
                    size={160}
                    rounded="none"
                  />
                </span>
              </div>

              <div className="relative flex min-w-0 flex-1 flex-col px-0.5 pt-2.5">
                <p className="truncate text-[13px] font-semibold leading-snug">
                  {entry.name ?? "Unknown token"}
                </p>
                <p className="num mt-0.5 truncate text-[11px] text-ink-3">
                  {entry.symbol ? `$${entry.symbol}` : "metadata unavailable"}
                </p>

                <div className="mt-2.5">
                  <RarityChip rarity={entry.rarity} size="xs" />
                </div>

                <dl className="mt-auto space-y-1 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-2.5 text-[11.5px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-ink-3">Reward</dt>
                    <dd className="num truncate font-medium text-ink">
                      {entry.minDisplay !== null && entry.maxDisplay !== null
                        ? formatRange(entry.minDisplay, entry.maxDisplay)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-ink-3">Odds</dt>
                    <dd className="num text-ink-2">
                      {formatOdds(entry.oddsPercent)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-ink-3">Left in stock</dt>
                    <dd className="num text-ink-2">
                      {entry.availableDisplay !== null
                        ? formatAmount(entry.availableDisplay)
                        : "—"}
                    </dd>
                  </div>
                </dl>

                {explorerUrl("token", entry.token) ? (
                  <ButtonLink
                    href={explorerUrl("token", entry.token) as string}
                    external
                    variant="secondary"
                    size="sm"
                    className="mt-2.5"
                    fullWidth
                  >
                    Contract
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </ButtonLink>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="glass-panel">
          <EmptyState
            icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
            title="No rewards match those filters"
            description="Try a different rarity band, or clear the search to see the full pool."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setRarity("all");
                  setSort("odds-desc");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      )}
    </>
  );
}
