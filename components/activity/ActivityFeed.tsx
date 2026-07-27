"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/primitives";
import { Tabs } from "@/components/ui/Tabs";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { useActivity, useNow } from "@/lib/use-activity";
import { cn } from "@/lib/utils";
import type { ActivityKind } from "@/types/activity";
import { ActivityRow } from "./ActivityRow";

type RailTab = "recent" | "rewards" | "claims" | "pool";

const TABS = [
  { value: "recent" as const, label: "Recent" },
  { value: "rewards" as const, label: "Rewards" },
  { value: "claims" as const, label: "Claims" },
  { value: "pool" as const, label: "Pool" },
];

const TAB_KINDS: Record<RailTab, ActivityKind[] | undefined> = {
  recent: undefined,
  rewards: ["reward-assigned"],
  claims: ["claim"],
  pool: ["pool-update", "round-settled"],
};

/**
 * The app's right-rail feed. Scrolls on its own so the page below the stage
 * stays reachable without a long scroll.
 */
export function ActivityFeed({
  className,
  maxHeight = 360,
  limit = 40,
}: {
  className?: string;
  maxHeight?: number;
  limit?: number;
}) {
  const [tab, setTab] = useState<RailTab>("recent");
  const { events, unavailable, isLoading } = useActivity({
    kinds: TAB_KINDS[tab],
    limit,
  });
  const now = useNow();

  return (
    <section
      aria-label="Live activity"
      className={cn("flex min-h-0 flex-col", className)}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="text-[13px] font-semibold tracking-[-0.02em]">
          Live activity
        </h2>
        {unavailable ? null : (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-3">
            <span
              className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]"
              aria-hidden="true"
            />
            Live
          </span>
        )}
      </div>

      <div className="px-4 pb-3 pt-3">
        <Tabs
          label="Activity filter"
          size="sm"
          options={TABS}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div
        className="rail-scroll min-h-0 flex-1 divide-y divide-[rgba(20,24,18,0.07)] overflow-y-auto border-t border-[rgba(20,24,18,0.08)]"
        style={{ maxHeight }}
      >
        {isLoading ? (
          <RowSkeleton count={5} />
        ) : events.length ? (
          events.map((event) => (
            <ActivityRow key={event.id} event={event} now={now} />
          ))
        ) : (
          <EmptyState
            className="py-10"
            icon={<Activity className="h-5 w-5" aria-hidden="true" />}
            title="Nothing has happened yet."
            description={
              unavailable
                ? unavailable === "rpc-throttled"
                    ? "Robinhood Chain is busy right now, so the feed is taking a breather. It'll come back on its own."
                    : "We can’t load the activity feed right now."
                : "Spins and claims show up here as they happen."
            }
          />
        )}
      </div>
    </section>
  );
}
