"use client";

import { ArrowRight } from "lucide-react";
import { factBool, factNumber, factString } from "@/lib/use-admin-monitor";
import type { AdminTabProps } from "../types";
import { AdminSection, EthAmount, Metric, StatusBadge } from "../ui";

/**
 * Randomness health, from the commitment-queue contract reads (useAdminState)
 * and the monitor's own entropy probe. Which source is wired changes what's
 * meaningful: commit-reveal has a queue and reveals; a bought-entropy adapter
 * (StonkPit) has runway and a float instead. Both are shown from real reads.
 */
export function RandomnessTab({ s, monitor }: AdminTabProps) {
  const facts = monitor.monitor?.facts;
  const source = factString(facts, "randomnessSource");
  const isStonkPit = source === "stonkpit";
  const runway = factNumber(facts, "entropyRunwayRounds");
  const ready = factBool(facts, "entropyReady");
  const liveTapes = factNumber(facts, "liveTapeCount");

  const rndAlerts = (monitor.monitor?.alerts ?? []).filter((a) =>
    ["entropyNotReady", "entropyRunway", "quietFloor", "commitments", "missedReveals", "keeperCannotReveal"].includes(
      a.check,
    ),
  );
  const critical = rndAlerts.some((a) => a.severity === "critical");

  const r = s.randomness;

  return (
    <div className="space-y-4">
      {rndAlerts.length > 0 ? (
        <div
          className="rounded-[14px] border p-3.5"
          style={{
            borderColor: critical ? "rgba(214,74,52,0.4)" : "rgba(224,165,58,0.42)",
            background: critical ? "rgba(214,74,52,0.05)" : "rgba(224,165,58,0.06)",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={critical ? "critical" : "warning"} />
            <p className="text-[13px] font-semibold text-ink">
              {critical ? "Randomness needs attention" : "Randomness running low"}
            </p>
          </div>
          <ul className="space-y-1.5">
            {rndAlerts.map((a, i) => (
              <li key={i} className="text-[11.5px] leading-relaxed text-ink-2">
                {a.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AdminSection
        title="Randomness health"
        description={
          monitor.unreachable
            ? "Monitor unreachable — showing only the commitment-queue reads."
            : "Source and readiness from the monitor probe; queue metrics from the contract."
        }
        action={
          <StatusBadge
            status={
              critical ? "critical" : rndAlerts.length ? "warning" : ready === false ? "warning" : (r.available === null && !isStonkPit) ? "unknown" : "healthy"
            }
            label={critical ? "Critical" : rndAlerts.length ? "Low" : "Healthy"}
          />
        }
      >
        <div className="mb-3 rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-2.5">
          <p className="micro text-ink-3">Source</p>
          <p className="mt-1 text-[13px] font-medium text-ink">
            {source === null
              ? "—"
              : isStonkPit
                ? "StonkPit entropy adapter"
                : "Commit-reveal randomness"}
            {ready !== null ? (
              <span className="ml-2 text-[11px] text-ink-3">
                {ready ? "ready" : "not ready"}
              </span>
            ) : null}
          </p>
        </div>

        {isStonkPit ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              label="Entropy runway"
              value={runway === null ? "—" : `${runway} rounds`}
              tooltip="Rounds of entropy the adapter can still serve at the fee ceiling."
            />
            <Metric label="Live mining tapes" value={liveTapes === null ? "—" : String(liveTapes)} />
            <Metric label="Bond" value={<EthAmount wei={r.bond} />} />
            <Metric
              label="Reveal window"
              value={r.revealWindow === null ? "—" : `${Number(r.revealWindow) / 60} min`}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              label="Commitments queued"
              value={r.available === null ? "—" : String(r.available)}
              tone={r.available !== null && r.available < 10n ? "warning" : undefined}
              hint={r.available !== null && r.available < 10n ? "running low" : undefined}
              tooltip="Unused commitments; reveals consume these and rounds halt at zero."
            />
            <Metric
              label="Revealed / missed"
              value={r.revealed === null ? "—" : `${r.revealed} / ${r.missed ?? 0}`}
              tone={r.missed !== null && r.missed > 0n ? "critical" : undefined}
              tooltip="Missed reveals are slashed, public and permanent."
            />
            <Metric label="Operator bond" value={<EthAmount wei={r.bond} />} />
            <Metric
              label="Reveal window"
              value={r.revealWindow === null ? "—" : `${Number(r.revealWindow) / 60} min`}
              hint={`reimburses ${r.gasReimbursement === null ? "—" : `${(Number(r.gasReimbursement) / 1e18).toFixed(5)} ETH`}`}
            />
          </div>
        )}
      </AdminSection>

      <AdminSection title="Pipeline" description="How a round gets its number. Every step is on chain.">
        <ol className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {(isStonkPit
            ? ["Entropy requested", "Words returned", "Round settled"]
            : ["Commitment posted", "Round requests", "Reveal", "Round settled"]
          ).map((step, i, arr) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-[10px] border border-[rgb(var(--line-rgb)_/_0.12)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3 py-2 text-[12px] font-medium text-ink">
                {step}
              </span>
              {i < arr.length - 1 ? (
                <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-ink-3 sm:block" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </AdminSection>
    </div>
  );
}
