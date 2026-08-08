"use client";

import { useState } from "react";
import { contracts } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ActiveRoundCard, RoundDrawer, RoundRow } from "../RoundBits";
import type { AdminState, AdminTabProps } from "../types";
import { AdminSection, Sk } from "../ui";

type Filter = "needs-action" | "active" | "recent";
type AdminRound = AdminState["rounds"][number];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "needs-action", label: "Needs action" },
  { key: "active", label: "Active" },
  { key: "recent", label: "Recent" },
];

export function RoundsTab({ s, refreshAll }: AdminTabProps) {
  const [filter, setFilter] = useState<Filter>("needs-action");
  const [openRound, setOpenRound] = useState<AdminRound | null>(null);

  const gacha = contracts.gacha!;
  const activeRound = s.rounds.find((r) => r.state === "Open") ?? null;

  const filtered = s.rounds.filter((r) => {
    if (filter === "active") return r.state === "Open";
    if (filter === "needs-action") return r.nextAction !== null;
    return true; // recent — the last window we read
  });

  const counts: Record<Filter, number> = {
    "needs-action": s.actionableRounds.length,
    active: s.rounds.filter((r) => r.state === "Open").length,
    recent: s.rounds.length,
  };

  return (
    <div className="space-y-4">
      <AdminSection title="Active round" description="The round currently open, if any.">
        <ActiveRoundCard round={activeRound} gacha={gacha} onDone={refreshAll} />
      </AdminSection>

      <AdminSection
        title="Rounds"
        description="Closing, requesting randomness and settling are permissionless — the keeper normally does them. These are the manual fallback. The console reads the most recent rounds."
      >
        <div className="mb-3 flex gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]"
                    : "border border-[rgb(var(--line-rgb)_/_0.12)] text-ink-2 hover:text-ink",
                )}
              >
                {f.label}
                <span className={cn("num text-[10.5px]", active ? "opacity-70" : "text-ink-3")}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        {s.isLoading && s.rounds.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} className="h-14 w-full rounded-[12px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-6 text-center text-[12.5px] text-ink-3">
            {filter === "needs-action"
              ? "Nothing needs manual action."
              : filter === "active"
                ? "No round is open right now."
                : "No rounds yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <RoundRow
                key={r.roundId}
                round={r}
                gacha={gacha}
                onDone={refreshAll}
                onOpen={() => setOpenRound(r)}
              />
            ))}
          </ul>
        )}
      </AdminSection>

      <RoundDrawer
        round={openRound}
        open={openRound !== null}
        onClose={() => setOpenRound(null)}
        gacha={gacha}
        onDone={refreshAll}
      />
    </div>
  );
}
