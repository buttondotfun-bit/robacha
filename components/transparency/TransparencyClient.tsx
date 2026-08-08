"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Flame, MinusCircle, ShieldCheck, XCircle } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { useAdminHealth } from "@/lib/use-admin-health";
import { useAnalytics } from "@/lib/use-analytics";
import { ROB_BURN_ADDRESS, useRobBurned } from "@/lib/use-rob-burned";
import { chainConfig, explorerUrl } from "@/lib/config";
import { formatCompact, shortAddress } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * The public transparency page.
 *
 * Nothing here is asserted — every panel is a live read of an endpoint that
 * itself reads the chain: /api/health probes each contract, /api/analytics
 * counts settled rounds from logs, and the $ROB burn is the dead address's own
 * balance. Sections degrade independently: an unreachable feed says so in place
 * rather than blanking the page, because "we can't show it right now" is itself
 * an honest state and hiding the whole page would read as worse.
 */

// Friendly labels for the health-check keys the endpoint emits.
const CHECK_LABELS: Record<string, string> = {
  chain: "Chain",
  rpc: "RPC endpoint",
  archiveRpc: "Archive RPC",
  contracts: "Contracts deployed",
  spinReadiness: "Spin readiness",
  randomness: "Randomness",
  database: "Indexer database",
  config: "Configuration",
};

function weiToEth(wei: string, digits = 3): string {
  try {
    const v = Number(BigInt(wei)) / 1e18;
    if (v === 0) return "0";
    if (v < 0.001) return "<0.001";
    return v.toLocaleString(undefined, { maximumFractionDigits: digits });
  } catch {
    return "—";
  }
}

function robAmount(v: bigint): string {
  const n = Number(v) / 1e18;
  return formatCompact(n);
}

export function TransparencyClient() {
  const { health, isLoading: healthLoading, unreachable } = useAdminHealth();
  const { analytics, unavailable: analyticsDown } = useAnalytics();
  const { burned } = useRobBurned();

  const status = health?.status ?? null;

  return (
    <PageContainer width="wide" className="pb-20 pt-8">
      {/* Hero */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> Read live from chain
        </span>
        <span className="glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-ink-2">{chainConfig.name}</span>
      </div>
      <h1 className="text-page-title mt-4">Transparency</h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
        Every figure on Robacha comes from the chain, not a database we control.
        This page reads the same contracts and logs anyone can — the live system
        status, the running totals, and the addresses to check us against.
      </p>

      {/* ---- System status ---- */}
      <section className="mt-10">
        <div className="glass-panel rounded-[22px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="micro text-ink-3">System status</p>
              <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em]">The machine, right now</p>
            </div>
            {healthLoading && !health ? (
              <span className="glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] text-ink-3">Checking…</span>
            ) : unreachable || !status ? (
              <StatusPill tone="unknown" label="Unavailable" />
            ) : (
              <StatusPill tone={status === "healthy" ? "ok" : status === "degraded" ? "warn" : "down"} label={status[0].toUpperCase() + status.slice(1)} />
            )}
          </div>

          {unreachable || !health ? (
            <p className="mt-4 text-[13px] text-ink-3">
              The status feed is temporarily unreachable. Nothing is inferred while it&rsquo;s down — check back shortly.
            </p>
          ) : (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {Object.entries(health.checks)
                // Required checks first, then by key, for a stable order.
                .sort((a, b) => Number(b[1].required) - Number(a[1].required) || a[0].localeCompare(b[0]))
                .map(([key, check]) => (
                  <li key={key} className="flex items-start gap-2.5 rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3">
                    {check.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3f7d17]" aria-hidden="true" />
                    ) : check.required ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c0447a]" aria-hidden="true" />
                    ) : (
                      <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">
                        {CHECK_LABELS[key] ?? key}
                        {!check.required ? <span className="ml-1.5 text-[10.5px] font-normal text-ink-3">optional</span> : null}
                      </p>
                      {check.detail ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{check.detail}</p> : null}
                    </div>
                  </li>
                ))}
            </ul>
          )}
          {health?.headBlock != null ? (
            <p className="num mt-4 text-[11px] text-ink-3">Head block {health.headBlock.toLocaleString()} · checked {new Date(health.checkedAt).toLocaleTimeString()}</p>
          ) : null}
        </div>
      </section>

      {/* ---- By the numbers ---- */}
      <section className="mt-10">
        <SectionHeader eyebrow="By the numbers" title="Everything the machine has done." description="Counted from settled rounds on chain — not a marketing figure." className="mb-5" />
        {analyticsDown || !analytics ? (
          <div className="glass-card rounded-[18px] p-6 text-[13px] text-ink-3">
            Live totals are temporarily unavailable. They come straight from the round logs — check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Metric value={formatCompact(analytics.totals.spins)} label="Spins" />
            <Metric value={formatCompact(analytics.totals.rounds)} label="Rounds settled" />
            <Metric value={formatCompact(analytics.totals.prizes)} label="Rewards paid" accent />
            <Metric value={`${weiToEth(analytics.totals.paidWei)} ETH`} label="Paid in" />
            <Metric value={formatCompact(analytics.totals.participants)} label="Wallets" />
          </div>
        )}
      </section>

      {/* ---- Contracts ---- */}
      <section className="mt-10">
        <SectionHeader eyebrow="On chain" title="The contracts behind it." description="The addresses this whole system runs on. Open any of them in the explorer." className="mb-5" />
        {unreachable || !health ? (
          <div className="glass-card rounded-[18px] p-6 text-[13px] text-ink-3">Contract addresses load from the status feed, which is temporarily unreachable.</div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(health.contracts)
              .filter(([, addr]) => addr)
              .map(([name, addr]) => {
                const deployed = health.contractsDeployed?.[name];
                return (
                  <li key={name} className="flex items-center justify-between gap-3 rounded-[14px] glass-card px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium capitalize text-ink">{name.replace(/([A-Z])/g, " $1").trim()}</p>
                      <p className="num truncate text-[11.5px] text-ink-3">{shortAddress(addr as string, 6)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {deployed === false ? (
                        <span className="rounded-full bg-[rgba(192,68,122,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#c0447a]">Not deployed</span>
                      ) : deployed ? (
                        <span className="rounded-full bg-[rgba(142,197,0,0.16)] px-2 py-0.5 text-[10px] font-medium text-[#3f7d17]">Live</span>
                      ) : null}
                      <a
                        href={explorerUrl("address", addr as string) ?? "#"}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-ink-3 transition-colors hover:text-ink"
                        aria-label={`Open ${name} in the explorer`}
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {/* ---- $ROB burn + verify ---- */}
      <section className="mt-10 grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="glass-panel flex flex-col rounded-[22px] p-6">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#c0447a]" aria-hidden="true" />
            <p className="text-[14px] font-semibold tracking-[-0.01em]">$ROB burned</p>
          </div>
          <p className="num mt-3 text-[34px] font-semibold leading-none tracking-[-0.03em]">
            {burned === null ? "—" : robAmount(burned)}
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            Tokens sent to the dead address, which no one holds the key to. This is simply that address&rsquo;s balance — the same number the explorer shows.
          </p>
          <a
            href={explorerUrl("address", ROB_BURN_ADDRESS) ?? "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-auto pt-4 inline-flex items-center gap-1 text-[12px] font-medium text-ink-2 hover:text-ink"
          >
            Verify the burn address <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="glass-card flex flex-col rounded-[22px] p-6">
          <p className="text-[14px] font-semibold tracking-[-0.01em]">Check any round yourself</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            Every settled round publishes the seed and the draw. You don&rsquo;t have to trust the result — you can reproduce it.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Link href="/verify" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(186,232,0,0.98))] px-5 text-[13px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)]">
              Verify a round
            </Link>
            <Link href="/docs" className="glass-chip inline-flex h-10 items-center rounded-full px-4 text-[13px] font-medium text-ink">
              Contracts &amp; docs
            </Link>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}

function StatusPill({ tone, label }: { tone: "ok" | "warn" | "down" | "unknown"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
        tone === "ok" && "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]",
        tone === "warn" && "bg-[rgba(240,190,60,0.18)] text-[#8a6410]",
        tone === "down" && "bg-[rgba(192,68,122,0.14)] text-[#c0447a]",
        tone === "unknown" && "bg-[rgb(var(--ink-rgb)_/_0.06)] text-ink-3",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "ok" && "bg-[#8ec500] pulse-dot", tone === "warn" && "bg-[#e0a92e]", tone === "down" && "bg-[#c0447a]", tone === "unknown" && "bg-ink-3")} aria-hidden="true" />
      {label}
    </span>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <p className={cn("num text-[24px] font-semibold tracking-[-0.02em]", accent && "text-accent-ink")}>{value}</p>
      <p className="micro mt-1 text-ink-3">{label}</p>
    </div>
  );
}
