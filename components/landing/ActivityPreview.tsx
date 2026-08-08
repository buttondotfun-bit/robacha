"use client";

import { Activity, ArrowUpRight } from "lucide-react";
import { ActivityRow } from "@/components/activity/ActivityRow";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { EmptyState } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/Glass";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { chainConfig } from "@/lib/config";
import { useActivity, useNow } from "@/lib/use-activity";

/**
 * A window onto real Robacha activity.
 *
 * Rows come from the indexer's confirmed logs. Before the first onchain spin
 * there is nothing to show, and this says exactly that.
 */
export function ActivityPreview() {
  const { events, unavailable, isLoading } = useActivity({ limit: 6 });
  const now = useNow();

  return (
    <section className="relative py-11 sm:py-14">
      <PageContainer width="wide" className="relative">
        <SectionHeader
          eyebrow="Onchain activity"
          title="Every spin is out in the open."
          description={`Every spin and claim gets written to ${chainConfig.name} for anyone to check. Tap any row to see it for yourself.`}
          action={
            <ButtonLink href="/activity" variant="secondary" size="md">
              View all activity
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          }
          className="mb-10"
        />

        <div className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[28px] p-3 sm:p-4">
          <span className="noise-overlay" aria-hidden="true" />

          <div className="relative flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pt-2">
            <GlassChip className="h-7 text-[10.5px]">
              {chainConfig.name}
            </GlassChip>
            <p className="num text-[11px] text-ink-3">Chain ID {chainConfig.id}</p>
          </div>

          <div className="relative">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <RowSkeleton key={index} />
                ))}
              </div>
            ) : events.length ? (
              <ul className="space-y-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <ActivityRow event={event} now={now} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Activity className="h-5 w-5" aria-hidden="true" />}
                title="Nothing has happened yet."
                description={
                  unavailable === "rpc-throttled"
                    ? "Robinhood Chain is busy right now, so the feed is taking a breather. It comes back on its own."
                    : unavailable === "indexer-unavailable"
                      ? "We can’t load the activity feed right now."
                      : "No spins yet. The first one shows up here."
                }
              />
            )}
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
