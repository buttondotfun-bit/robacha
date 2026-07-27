"use client";

import { Activity, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { EmptyState } from "@/components/shared/primitives";
import { Button } from "@/components/ui/Button";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { chainConfig } from "@/lib/config";
import { ACTIVITY_TAB_KINDS, useActivity, useNow } from "@/lib/use-activity";
import { ActivityRow } from "./ActivityRow";

type Tab = keyof typeof ACTIVITY_TAB_KINDS;

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All Activity" },
  { value: "spins", label: "Spins" },
  { value: "rewards", label: "Rewards" },
  { value: "claims", label: "Claims" },
  { value: "refunds", label: "Refunds" },
  { value: "pool", label: "Pool Updates" },
];

const PAGE = 25;

/**
 * The full activity feed, served entirely by the indexer.
 *
 * Filters narrow what the indexer returns; they never synthesise rows. With no
 * indexed events the page says so plainly.
 */
export function ActivityPageClient() {
  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(PAGE);

  const kinds = ACTIVITY_TAB_KINDS[tab];
  const { events, unavailable, isLoading, indexedBlock, headBlock, refetch } =
    useActivity({ kinds, limit });
  const now = useNow();

  const lag = useMemo(
    () =>
      indexedBlock != null && headBlock != null
        ? Math.max(0, headBlock - indexedBlock)
        : null,
    [indexedBlock, headBlock],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <Tabs
          label="Filter activity"
          options={TABS}
          value={tab}
          onChange={(next) => {
            setTab(next as Tab);
            setLimit(PAGE);
          }}
          className="mb-4"
        />

        <div className="glass-panel overflow-hidden rounded-[24px]">
          {unavailable ? (
            <UnavailableState
              kind={
                unavailable === "not-configured"
                  ? "not-configured"
                  : "rpc-unavailable"
              }
              title={
                unavailable === "indexer-behind"
                  ? "Catching up"
                  : unavailable === "rpc-throttled"
                    ? "Robinhood Chain is busy"
                    : undefined
              }
              description={
                unavailable === "indexer-behind"
                  ? `We're ${lag ?? "a few"} blocks behind the chain. We'd rather show nothing than something out of date, so this fills in once we catch up.`
                  : unavailable === "rpc-throttled"
                    ? "The network is rate-limiting us right now, so the feed is taking a breather. It comes back on its own — nothing is wrong with your spins or your rewards."
                    : unavailable === "indexer-unavailable"
                      ? "We can't load the activity feed right now. Your spins and rewards aren't affected."
                      : undefined
              }
              action={
                <Button variant="secondary" size="md" onClick={refetch}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </Button>
              }
            />
          ) : isLoading ? (
            <div className="divide-y divide-[rgba(20,24,18,0.06)] px-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <RowSkeleton key={index} />
              ))}
            </div>
          ) : events.length ? (
            <>
              <ul className="divide-y divide-[rgba(20,24,18,0.06)] px-4">
                {events.map((event) => (
                  <li key={event.id}>
                    <ActivityRow event={event} now={now} variant="table" />
                  </li>
                ))}
              </ul>
              {events.length >= limit ? (
                <div className="border-t border-[rgba(20,24,18,0.06)] p-4 text-center">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setLimit((current) => current + PAGE)}
                  >
                    Load more
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={<Activity className="h-5 w-5" aria-hidden="true" />}
              title="Nothing here yet."
              description={`Nothing on ${chainConfig.name} matches this filter yet. Spins and claims show up here as they happen.`}
            />
          )}
        </div>
      </section>

      <aside className="glass-card h-fit rounded-[22px] p-5">
        <p className="micro">Feed status</p>
        <dl className="mt-4 space-y-3 text-[12.5px]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">Chain</dt>
            <dd className="num text-ink">{chainConfig.id}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">Indexed block</dt>
            <dd className="num text-ink">
              {indexedBlock != null ? indexedBlock.toLocaleString() : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">Chain head</dt>
            <dd className="num text-ink">
              {headBlock != null ? headBlock.toLocaleString() : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">Lag</dt>
            <dd className="num text-ink">
              {lag != null ? `${lag} blocks` : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-[11.5px] leading-relaxed text-ink-3">
          Every row is a confirmed contract log. Nothing on this page is
          generated by the interface.
        </p>
      </aside>
    </div>
  );
}
