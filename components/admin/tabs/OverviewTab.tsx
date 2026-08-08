"use client";

import { ArrowRight } from "lucide-react";
import { formatEther } from "viem";
import type { PoolAnalytics } from "@/app/api/analytics/route";
import { contracts } from "@/lib/config";
import { useAnalytics } from "@/lib/use-analytics";
import { cn } from "@/lib/utils";
import { ActiveRoundCard } from "../RoundBits";
import type { AdminTabProps } from "../types";
import {
  AdminSection,
  EthAmount,
  Metric,
  ModuleError,
  Sk,
  StatusBadge,
} from "../ui";

const n = (v: number) => v.toLocaleString("en-US");
const eth = (wei: string | bigint) =>
  `${Number(formatEther(typeof wei === "bigint" ? wei : BigInt(wei))).toFixed(4)}`;

export function OverviewTab({ s, monitor, refreshAll, go }: AdminTabProps) {
  const { analytics, isLoading, unavailable, refetch } = useAnalytics();

  const activeRound = s.rounds.find((r) => r.state === "Open") ?? null;
  const insolvent = s.vaultTokens.filter((t) => !t.solvent).length;
  const feesAvailable = s.fees.reduce(
    (sum, f) => sum + (f.accrued ?? 0n),
    0n,
  );
  const rndAvail = s.randomness.available;

  // Randomness summary status from the monitor's randomness checks.
  const rndAlerts = (monitor.monitor?.alerts ?? []).filter((a) =>
    ["entropyNotReady", "entropyRunway", "quietFloor", "commitments", "missedReveals", "keeperCannotReveal"].includes(
      a.check,
    ),
  );
  const rndStatus = rndAlerts.some((a) => a.severity === "critical")
    ? "critical"
    : rndAlerts.length
      ? "warning"
      : rndAvail === null
        ? "unknown"
        : "healthy";

  return (
    <div className="space-y-4">
      {/* KPI grid — primary metrics carry more weight than secondary ones. */}
      <AdminSection
        title="Protocol activity"
        description="Counted from indexed contract logs, all time."
        action={
          analytics ? (
            <span className="num text-[11px] text-ink-3">
              block {analytics.headBlock.toLocaleString()}
            </span>
          ) : null
        }
      >
        {unavailable ? (
          <ModuleError
            message="Couldn't read the analytics indexer — a partial count would get quoted as the real one."
            onRetry={refetch}
          />
        ) : isLoading || !analytics ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Sk key={i} className="h-[68px] rounded-[12px]" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Spins" value={n(analytics.totals.spins)} emphasis />
              <Metric label="Rounds" value={n(analytics.totals.rounds)} emphasis />
              <Metric
                label="Gross"
                value={<><span>{eth(analytics.totals.paidWei)}</span> <span className="text-[13px] text-ink-3">ETH</span></>}
                emphasis
                tooltip="Total user payments before refunds, from indexed spin events."
              />
              <Metric label="Rewards" value={n(analytics.totals.prizes)} emphasis tooltip="Prizes assigned by the contract." />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric
                label="Claimed"
                value={n(analytics.totals.claimed)}
                hint={`${n(analytics.totals.prizes - analytics.totals.claimed)} unclaimed`}
              />
              <Metric
                label="Refunds"
                value={<><span>{eth(analytics.totals.refundedWei)}</span> <span className="text-[13px] text-ink-3">ETH</span></>}
                hint={`${analytics.totals.refundedWallets} wallets`}
                tooltip="ETH returned when a round could not pay a prize in full."
              />
              <Metric
                label="People"
                value={n(analytics.totals.participants)}
                hint={`${analytics.totals.repeatWallets} came back`}
                tooltip="Distinct wallets that have spun. No identities are tracked."
              />
              <Metric
                label="Held in escrow"
                value={s.totalEscrow === null ? "—" : <EthAmount wei={s.totalEscrow} />}
                tooltip="User funds in rounds still in flight."
              />
            </div>
          </div>
        )}
      </AdminSection>

      {/* Funnel + active round */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AdminSection title="Operational flow" description="Where spins go, all time.">
          {unavailable || !analytics ? (
            isLoading && !unavailable ? (
              <Sk className="h-40 w-full rounded-[12px]" />
            ) : (
              <p className="text-[12px] text-ink-3">Flow needs the analytics indexer.</p>
            )
          ) : (
            <Funnel
              steps={[
                { label: "Spins", value: analytics.totals.spins },
                { label: "Rounds", value: analytics.totals.rounds },
                { label: "Rewards", value: analytics.totals.prizes },
                { label: "Claimed", value: analytics.totals.claimed },
              ]}
              tail={{ label: "Refund wallets", value: analytics.totals.refundedWallets }}
            />
          )}
        </AdminSection>

        <AdminSection title="Active round" description="The round currently open, if any.">
          <ActiveRoundCard round={activeRound} gacha={contracts.gacha!} onDone={refreshAll} />
        </AdminSection>
      </div>

      {/* Pool performance */}
      <AdminSection
        title="Pool performance"
        description="Per version, because the economics differ between them."
      >
        {unavailable ? (
          <ModuleError onRetry={refetch} />
        ) : isLoading || !analytics ? (
          <Sk className="h-40 w-full rounded-[12px]" />
        ) : (
          <PoolTable pools={analytics.pools} />
        )}
      </AdminSection>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Prize vault"
          onOpen={() => go("vault")}
          rows={[
            { label: "Assets", value: s.vaultTokens.length === 0 ? "—" : String(s.vaultTokens.length) },
            { label: "Short of reserved", value: String(insolvent) },
          ]}
          status={
            s.vaultTokens.length === 0 ? "unknown" : insolvent > 0 ? "critical" : "healthy"
          }
          statusLabel={insolvent > 0 ? `${insolvent} short` : "Healthy"}
        />
        <SummaryCard
          title="Randomness"
          onOpen={() => go("randomness")}
          rows={[
            { label: "Commitments", value: rndAvail === null ? "—" : String(rndAvail) },
            { label: "Missed reveals", value: s.randomness.missed === null ? "—" : String(s.randomness.missed) },
          ]}
          status={rndStatus}
          statusLabel={
            rndStatus === "critical" ? "Critical" : rndStatus === "warning" ? "Low" : rndStatus === "unknown" ? "—" : "Healthy"
          }
        />
        <SummaryCard
          title="Fees"
          onOpen={() => go("fees")}
          rows={[
            { label: "Available", value: `${eth(feesAvailable)} ETH` },
            { label: "Recipients", value: String(s.fees.length) },
          ]}
          status={feesAvailable > 0n ? "healthy" : "unknown"}
          statusLabel={feesAvailable > 0n ? "Withdrawable" : "None"}
        />
      </div>

      {/* Recent rounds — real events, newest first. */}
      <AdminSection
        title="Recent rounds"
        description="The latest rounds read from chain — the closest thing to a live event feed."
        action={
          <button
            type="button"
            onClick={() => go("rounds")}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-2 hover:text-ink"
          >
            All rounds <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        }
      >
        {s.rounds.length === 0 ? (
          <p className="text-[12px] text-ink-3">No rounds yet.</p>
        ) : (
          <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)]">
            {s.rounds.slice(0, 8).map((r) => (
              <li key={r.roundId} className="flex items-center justify-between gap-3 py-2">
                <span className="num text-[12.5px] text-ink">
                  Round #{r.roundId}
                </span>
                <span className="flex items-center gap-3">
                  <span className="num text-[11.5px] text-ink-3">
                    {r.entryCount} entries · {r.settledCount} settled
                  </span>
                  <StatusBadge status={r.state === "Settled" ? "healthy" : r.nextAction ? "warning" : "unknown"} label={r.state} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}

function Funnel({
  steps,
  tail,
}: {
  steps: { label: string; value: number }[];
  tail: { label: string; value: number };
}) {
  const max = Math.max(1, steps[0].value);
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const pct = Math.max(3, (step.value / max) * 100);
        const prev = i > 0 ? steps[i - 1].value : null;
        const drop = prev !== null && prev > 0 ? Math.round(((prev - step.value) / prev) * 100) : null;
        return (
          <div key={step.label}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="font-medium text-ink">{step.label}</span>
              <span className="num text-ink-2">
                {n(step.value)}
                {drop !== null && drop > 0 ? (
                  <span className="ml-1.5 text-[10.5px] text-ink-3">−{drop}%</span>
                ) : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)]">
              <span
                className="block h-full rounded-full bg-[rgba(166,217,0,0.75)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-2 text-[11.5px] text-ink-3">
        <span>{tail.label}</span>
        <span className="num">{n(tail.value)}</span>
      </div>
    </div>
  );
}

function PoolTable({ pools }: { pools: PoolAnalytics[] }) {
  const rows = pools ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[12px]">
        <thead>
          <tr className="text-left text-ink-3">
            <th className="pb-2 font-medium">Version</th>
            <th className="pb-2 text-right font-medium">People</th>
            <th className="pb-2 text-right font-medium">Returning</th>
            <th className="pb-2 text-right font-medium">Spins</th>
            <th className="pb-2 text-right font-medium">Rounds</th>
            <th className="pb-2 text-right font-medium">Winners</th>
            <th className="pb-2 text-right font-medium">Prizes</th>
            <th className="pb-2 text-right font-medium">ETH in</th>
            <th className="pb-2 text-right font-medium">Last spin</th>
            <th className="pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((pool, index) => (
            <tr
              key={`${pool.poolId}-${pool.version}`}
              className={cn(
                "border-t border-[rgb(var(--line-rgb)_/_0.07)]",
                index === 0 && "bg-[rgba(166,217,0,0.05)]",
              )}
            >
              <td className="num py-2 font-medium text-ink">#{pool.poolId} v{pool.version}</td>
              <td className="num py-2 text-right font-semibold text-ink">{pool.participants}</td>
              <td className="num py-2 text-right text-ink-2">{pool.returning}</td>
              <td className="num py-2 text-right text-ink-2">{pool.spins}</td>
              <td className="num py-2 text-right text-ink-2">{pool.rounds}</td>
              <td className="num py-2 text-right text-ink-2">{pool.winners}</td>
              <td className="num py-2 text-right text-ink-2">{pool.prizes}</td>
              <td className="num py-2 text-right text-ink-2">{eth(pool.paidWei)}</td>
              <td className="num py-2 text-right text-ink-3">
                {pool.lastSpinAt
                  ? new Date(pool.lastSpinAt * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : "—"}
              </td>
              <td className="py-2 text-right">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    index === 0
                      ? "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]"
                      : "bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3",
                  )}
                >
                  {index === 0 ? "Live" : "Archived"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 10 ? (
        <p className="mt-2 text-[11px] text-ink-3">
          Showing the 10 most recent of {rows.length} versions.
        </p>
      ) : null}
    </div>
  );
}

function SummaryCard({
  title,
  rows,
  status,
  statusLabel,
  onOpen,
}: {
  title: string;
  rows: { label: string; value: string }[];
  status: "healthy" | "warning" | "critical" | "unknown";
  statusLabel: string;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <StatusBadge status={status} label={statusLabel} />
      </div>
      <dl className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[12px]">
            <dt className="text-ink-3">{r.label}</dt>
            <dd className="num font-medium text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-2 hover:text-ink"
      >
        Open {title.toLowerCase()} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
