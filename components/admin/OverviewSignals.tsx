"use client";

import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { UseAdminMonitor } from "@/lib/use-admin-monitor";
import { cn } from "@/lib/utils";
import type { AdminState, AdminTab } from "./types";
import { type OpStatus, Sk, StatusBadge, StatusDot } from "./ui";

/**
 * The system status strip and attention area.
 *
 * Everything here is derived from real signals — contract reads via
 * `useAdminState` and the `/api/monitor` probe. Nothing renders "Healthy" that
 * isn't; a signal we can't read renders "Unknown", never a reassuring green.
 */

interface Signal {
  label: string;
  value: string;
  status: OpStatus;
  tooltip?: string;
}

/** Which monitor checks belong to each severity, for deriving cell status. */
function alertStatusFor(
  monitor: UseAdminMonitor,
  checks: string[],
): OpStatus | null {
  const alerts = monitor.monitor?.alerts ?? [];
  const relevant = alerts.filter((a) => checks.includes(a.check));
  if (relevant.some((a) => a.severity === "critical")) return "critical";
  if (relevant.some((a) => a.severity === "warning")) return "warning";
  return null;
}

function deriveSignals(s: AdminState, monitor: UseAdminMonitor): Signal[] {
  const signals: Signal[] = [];

  // Spins
  signals.push({
    label: "Spins",
    value:
      s.paused === null
        ? "—"
        : s.paused
          ? "Paused"
          : s.spinReady
            ? "Live"
            : "Not ready",
    status:
      s.paused === null
        ? "unknown"
        : s.paused
          ? "paused"
          : s.spinReady
            ? "healthy"
            : "warning",
    tooltip: s.readinessReason || undefined,
  });

  // Rounds needing action
  const needAction = s.actionableRounds.length;
  signals.push({
    label: "Needs action",
    value: String(needAction),
    status: needAction > 0 ? "warning" : "healthy",
    tooltip: "Rounds with a manual step available (close, request, settle).",
  });

  // Pending settlement — RandomnessReceived rounds waiting to pay out
  const pending = s.rounds.filter((r) => r.nextAction === "settleEntries").length;
  signals.push({
    label: "Pending settlement",
    value: String(pending),
    status: pending > 0 ? "warning" : "healthy",
    tooltip: "Rounds that have randomness and are ready to settle.",
  });

  // Prize vault — solvency is the real signal
  const insolvent = s.vaultTokens.filter((t) => !t.solvent).length;
  const vaultStatus = alertStatusFor(monitor, ["vaultSolvency"]);
  signals.push({
    label: "Prize vault",
    value:
      s.vaultTokens.length === 0
        ? "—"
        : insolvent > 0
          ? `${insolvent} short`
          : "Healthy",
    status: vaultStatus ?? (insolvent > 0 ? "critical" : "healthy"),
    tooltip: "A token is 'short' when its balance can't cover its reserved payouts.",
  });

  // Randomness
  const rndAlert = alertStatusFor(monitor, [
    "entropyNotReady",
    "entropyRunway",
    "quietFloor",
    "commitments",
    "missedReveals",
    "keeperCannotReveal",
  ]);
  const avail = s.randomness.available;
  signals.push({
    label: "Randomness",
    value:
      rndAlert === "critical"
        ? "Critical"
        : rndAlert === "warning"
          ? "Low"
          : avail === null
            ? "—"
            : "Healthy",
    status: rndAlert ?? (avail === null ? "unknown" : "healthy"),
    tooltip: "Entropy readiness / commitment queue from the monitor probe.",
  });

  // Refunds owed
  const refundsOwed = s.totalRefundable;
  signals.push({
    label: "Refunds owed",
    value:
      refundsOwed === null
        ? "—"
        : refundsOwed === 0n
          ? "None"
          : `${(Number(refundsOwed) / 1e18).toFixed(4)} ETH`,
    status: refundsOwed === null ? "unknown" : refundsOwed > 0n ? "warning" : "healthy",
    tooltip: "ETH owed to users from refundable rounds, withdrawable by them.",
  });

  return signals;
}

export function SystemStatusStrip({
  s,
  monitor,
}: {
  s: AdminState;
  monitor: UseAdminMonitor;
}) {
  const signals = deriveSignals(s, monitor);

  // Overall — the monitor's own verdict, with paused surfaced distinctly.
  const monitorStatus = monitor.monitor?.status;
  const overall: OpStatus = monitor.unreachable
    ? "unknown"
    : monitorStatus === "critical"
      ? "critical"
      : monitorStatus === "warning"
        ? "warning"
        : monitorStatus === "unknown"
          ? "unknown"
          : monitorStatus === "ok"
            ? "healthy"
            : "unknown";
  const overallLabel =
    s.paused === true
      ? "Paused"
      : overall === "healthy"
        ? "Live"
        : overall === "critical"
          ? "Action required"
          : overall === "warning"
            ? "Attention"
            : "Unknown";

  return (
    <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="micro text-ink-3">System</p>
        <StatusBadge
          status={s.paused === true ? "paused" : overall}
          label={overallLabel}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {signals.map((sig) => (
          <div
            key={sig.label}
            className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3 py-2.5"
            title={sig.tooltip}
          >
            <p className="micro text-ink-3">{sig.label}</p>
            <p className="mt-1.5 flex items-center gap-1.5">
              <StatusDot status={sig.status} pulse={sig.status === "healthy" && sig.label === "Spins"} />
              <span className="num text-[13px] font-semibold text-ink">{sig.value}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHECK_META: Record<string, { title: string; tab: AdminTab }> = {
  keeperKey: { title: "Keeper key missing", tab: "system" },
  keeperGas: { title: "Keeper low on gas", tab: "system" },
  roundsNotClosing: { title: "Rounds not closing", tab: "rounds" },
  stuckRounds: { title: "Stuck rounds", tab: "rounds" },
  refundsOwed: { title: "Refunds owed", tab: "rounds" },
  roundsRefunded: { title: "Rounds refunded instead of paying", tab: "rounds" },
  entropyNotReady: { title: "Entropy not ready", tab: "randomness" },
  entropyRunway: { title: "Entropy runway low", tab: "randomness" },
  quietFloor: { title: "Mining floor quiet", tab: "randomness" },
  commitments: { title: "Commitments low", tab: "randomness" },
  missedReveals: { title: "Missed reveals", tab: "randomness" },
  keeperCannotReveal: { title: "Keeper can't reveal", tab: "randomness" },
  vaultSolvency: { title: "Vault can't cover prizes", tab: "vault" },
  activePool: { title: "No active pool", tab: "system" },
  readFailed: { title: "A check couldn't run", tab: "system" },
};

export function AttentionRequired({
  monitor,
  go,
}: {
  monitor: UseAdminMonitor;
  go: (tab: AdminTab) => void;
}) {
  if (monitor.isLoading && !monitor.monitor) {
    return <Sk className="h-12 w-full rounded-[16px]" />;
  }

  if (monitor.unreachable) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(224,165,58,0.42)] bg-[rgba(224,165,58,0.08)] px-4 py-3">
        <p className="flex items-center gap-2 text-[12.5px] font-medium text-[#8a6a1c]">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Monitor unreachable — operational status can&rsquo;t be confirmed.
        </p>
        <button
          type="button"
          onClick={monitor.refetch}
          className="shrink-0 rounded-full border border-[rgb(var(--line-rgb)_/_0.15)] px-3 py-1 text-[11.5px] font-medium text-ink-2 hover:text-ink"
        >
          Retry
        </button>
      </div>
    );
  }

  const status = monitor.monitor?.status;
  const alerts = [...(monitor.monitor?.alerts ?? [])].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1,
  );

  if (status === "unknown") {
    return (
      <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.12)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-4 py-3 text-[12.5px] text-ink-3">
        {monitor.monitor?.reason
          ? `Monitor: ${monitor.monitor.reason}.`
          : "Monitor status is unknown."}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-[16px] border border-[rgba(142,197,0,0.35)] bg-[rgba(142,197,0,0.08)] px-4 py-3 text-[12.5px] font-medium text-[#3f7d17]">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        No operational issues detected.
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[rgba(214,74,52,0.28)] bg-[rgba(214,74,52,0.04)] p-1.5">
      <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b23a29]">
        Attention required · {alerts.length}
      </p>
      <ul className="space-y-1">
        {alerts.map((a, i) => {
          const meta = CHECK_META[a.check] ?? { title: a.check, tab: "system" as AdminTab };
          return (
            <li
              key={`${a.check}-${i}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] bg-[rgb(var(--surface-rgb)_/_0.7)] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={a.severity === "critical" ? "critical" : "warning"}
                    label={a.severity === "critical" ? "Critical" : "Warning"}
                  />
                  <span className="text-[13px] font-semibold text-ink">{meta.title}</span>
                </div>
                <p className="mt-1 max-w-[90ch] text-[11.5px] leading-relaxed text-ink-2">
                  {a.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => go(meta.tab)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgb(var(--line-rgb)_/_0.15)] px-3 py-1 text-[11.5px] font-medium text-ink-2 transition-colors hover:text-ink",
                )}
              >
                Review
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
