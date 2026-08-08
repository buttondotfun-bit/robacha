"use client";

import type { ReactNode } from "react";
import { useNow } from "@/lib/use-activity";
import type { MonitorSeverity } from "@/lib/use-admin-monitor";
import { cn } from "@/lib/utils";

/**
 * The operator console's shared vocabulary.
 *
 * Restrained on purpose — this is internal tooling, not a marketing surface.
 * Status is always carried by text AND a dot, never colour alone, so it reads
 * the same to someone who can't distinguish the hues. Every "healthy" here is
 * earned from a real signal upstream; this file only renders states, it never
 * decides one.
 */

export type OpStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "paused"
  | "unknown";

const STATUS_META: Record<
  OpStatus,
  { label: string; dot: string; text: string; chip: string }
> = {
  healthy: {
    label: "Healthy",
    dot: "#4f9e2f",
    text: "text-[#3f7d17]",
    chip: "bg-[rgba(142,197,0,0.14)] border-[rgba(142,197,0,0.4)]",
  },
  warning: {
    label: "Warning",
    dot: "#d39a2b",
    text: "text-[#8a6a1c]",
    chip: "bg-[rgba(224,165,58,0.14)] border-[rgba(224,165,58,0.42)]",
  },
  critical: {
    label: "Critical",
    dot: "#d34a34",
    text: "text-[#b23a29]",
    chip: "bg-[rgba(214,74,52,0.12)] border-[rgba(214,74,52,0.42)]",
  },
  paused: {
    label: "Paused",
    dot: "#b58a4a",
    text: "text-[#7d5f2f]",
    chip: "bg-[rgba(181,138,74,0.14)] border-[rgba(181,138,74,0.4)]",
  },
  unknown: {
    label: "Unknown",
    dot: "#9aa093",
    text: "text-ink-3",
    chip: "bg-[rgb(var(--ink-rgb)_/_0.05)] border-[rgb(var(--line-rgb)_/_0.12)]",
  },
};

export function severityToStatus(severity: MonitorSeverity): OpStatus {
  return severity === "critical" ? "critical" : "warning";
}

export function StatusDot({
  status,
  pulse,
}: {
  status: OpStatus;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", pulse && "pulse-dot")}
      style={{ background: STATUS_META[status].dot }}
      aria-hidden="true"
    />
  );
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: OpStatus;
  label?: string;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        meta.chip,
        meta.text,
        className,
      )}
    >
      <StatusDot status={status} pulse={status === "healthy"} />
      {label ?? meta.label}
    </span>
  );
}

/** Section card — the console's one container. Deliberately plain. */
export function AdminSection({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4 sm:p-5",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 max-w-[80ch] text-[11.5px] leading-relaxed text-ink-3">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** A single KPI cell. `emphasis` promotes a primary metric. */
export function Metric({
  label,
  value,
  hint,
  tooltip,
  emphasis,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Explains the metric on hover — for jargon an operator may not recall. */
  tooltip?: string;
  emphasis?: boolean;
  tone?: OpStatus;
}) {
  return (
    <div
      className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3"
      title={tooltip}
    >
      <p className="micro flex items-center gap-1 text-ink-3">
        {label}
        {tooltip ? <span className="text-ink-3/70" aria-hidden="true">ⓘ</span> : null}
      </p>
      <p
        className={cn(
          "num mt-1.5 font-semibold leading-none tracking-[-0.02em]",
          emphasis ? "text-[22px]" : "text-[17px]",
          tone ? STATUS_META[tone].text : "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  );
}

/** "Updated 8s ago", or STALE past a threshold. Ticks off the shared clock. */
export function Freshness({
  updatedAt,
  unreachable,
  staleAfterMs = 90_000,
}: {
  updatedAt: number | null;
  unreachable?: boolean;
  staleAfterMs?: number;
}) {
  const now = useNow();
  if (unreachable) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#b23a29]">
        <StatusDot status="critical" /> Unreachable
      </span>
    );
  }
  if (!updatedAt) {
    return <span className="text-[11px] text-ink-3">Loading…</span>;
  }
  const ageMs = Math.max(0, now - updatedAt);
  const stale = ageMs > staleAfterMs;
  const label =
    ageMs < 2_000
      ? "just now"
      : ageMs < 60_000
        ? `${Math.round(ageMs / 1000)}s ago`
        : `${Math.round(ageMs / 60_000)}m ago`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px]",
        stale ? "font-semibold text-[#8a6a1c]" : "text-ink-3",
      )}
    >
      {stale ? <StatusDot status="warning" /> : null}
      {stale ? "Stale · " : "Updated "}
      {label}
    </span>
  );
}

/** A localized loading placeholder — never blank the whole console. */
export function Sk({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block animate-pulse rounded-[6px] bg-[rgb(var(--ink-rgb)_/_0.06)]",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** Localized error line for a module whose read failed. */
export function ModuleError({
  message = "Couldn't read this from chain — showing nothing rather than a partial figure.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[rgba(214,74,52,0.28)] bg-[rgba(214,74,52,0.06)] px-3.5 py-3">
      <p className="text-[12px] leading-snug text-[#b23a29]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-full border border-[rgb(var(--line-rgb)_/_0.15)] px-3 py-1 text-[11.5px] font-medium text-ink-2 hover:text-ink"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

/** Formats a wei bigint (or numeric string) as "0.0163 ETH", or "—". */
export function EthAmount({
  wei,
  className,
}: {
  wei: bigint | string | null | undefined;
  className?: string;
}) {
  if (wei === null || wei === undefined) return <span className={className}>—</span>;
  let n: bigint;
  try {
    n = typeof wei === "bigint" ? wei : BigInt(wei);
  } catch {
    return <span className={className}>—</span>;
  }
  const eth = Number(n) / 1e18;
  const text = eth === 0 ? "0" : eth < 0.0001 ? eth.toExponential(2) : eth.toFixed(4);
  return (
    <span className={cn("num", className)}>
      {text} <span className="text-ink-3">ETH</span>
    </span>
  );
}
