"use client";

import { AlertTriangle, RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, PageContainer, Pill } from "@/components/shared/primitives";
import { Button } from "@/components/ui/Button";
import { ACTIVE_POOL_ID, chainConfig, contracts, isStockMachineLive, STOCK_POOL_ID } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useAdminHealth } from "@/lib/use-admin-health";
import { useAdminMonitor } from "@/lib/use-admin-monitor";
import { useAdminRole } from "@/lib/use-admin-role";
import { useAdminState } from "@/lib/use-admin-state";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import {
  AttentionRequired,
  SystemStatusStrip,
} from "./OverviewSignals";
import { OverviewTab } from "./tabs/OverviewTab";
import { RoundsTab } from "./tabs/RoundsTab";
import { VaultTab } from "./tabs/VaultTab";
import { RandomnessTab } from "./tabs/RandomnessTab";
import { FeesTab } from "./tabs/FeesTab";
import { RaffleTab } from "./tabs/RaffleTab";
import { SystemTab } from "./tabs/SystemTab";
import { Freshness } from "./ui";
import type { AdminTab, AdminTabProps } from "./types";

const TABS: { key: AdminTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "rounds", label: "Rounds" },
  { key: "vault", label: "Vault" },
  { key: "randomness", label: "Randomness" },
  { key: "fees", label: "Fees" },
  { key: "raffle", label: "Raffle" },
  { key: "system", label: "System" },
];

const VALID_TABS = new Set(TABS.map((t) => t.key));

/**
 * Operator console.
 *
 * A tabbed operations surface, not an analytics dump. Access is verified from
 * chain (`hasRole`), the system status and every alert come from the same
 * `/api/monitor` probe that pages a human, and no figure is invented — anything
 * unreadable renders as "—" or an explicit unavailable state rather than a
 * confident zero. High-risk writes go through a typed confirmation.
 */
export function AdminClient() {
  const wallet = useWallet();
  const role = useAdminRole();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // The admin gate decides whether the heavy reads run at all.
  const admin = wallet.isConnected && role.isAdmin && !wallet.wrongNetwork;

  // Which pool the pool-scoped views (spin readiness) report on. Genesis by
  // default; the Stock pool when it's live. Vault, rounds, fees and randomness
  // are gacha/vault-wide and already cover every pool.
  const [poolId, setPoolId] = useState<bigint>(ACTIVE_POOL_ID);
  const s = useAdminState(poolId);
  const monitor = useAdminMonitor(admin && autoRefresh ? 20_000 : false);
  const health = useAdminHealth(admin);

  const [tab, setTab] = useState<AdminTab>("overview");

  // URL state, without pulling in useSearchParams' Suspense requirement:
  // read once on mount, reflect changes with replaceState.
  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("tab");
    if (!(t && VALID_TABS.has(t as AdminTab))) return;
    const id = window.setTimeout(() => setTab(t as AdminTab), 0);
    return () => window.clearTimeout(id);
  }, []);

  const go = useCallback((next: AdminTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
    window.scrollTo({ top: 0 });
  }, []);

  const refreshAll = useCallback(() => {
    s.refetch();
    monitor.refetch();
    health.refetch();
  }, [s, monitor, health]);

  // ---- gates -------------------------------------------------------------
  if (!wallet.isConnected) {
    return (
      <Gate
        title="Connect a wallet"
        body={`This console reads your roles from the contracts on ${chainConfig.name}.`}
        action={
          wallet.hasWallet ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => void wallet.connect()}
              disabled={wallet.isConnecting}
            >
              Connect wallet
            </Button>
          ) : (
            <Pill tone="quiet">No browser wallet detected</Pill>
          )
        }
      />
    );
  }

  if (wallet.wrongNetwork) {
    return (
      <Gate
        title="Switch to the right network"
        body={`The operator console only works on ${chainConfig.name}. No transaction can be signed until the wallet is switched.`}
        tone="warn"
        action={
          wallet.switchNetwork ? (
            <Button variant="primary" size="md" onClick={() => void wallet.switchNetwork!()}>
              Switch to {chainConfig.name}
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (role.isLoading) {
    return <Gate title="Checking your role on chain…" body="Reading hasRole from the gacha contract." />;
  }

  if (role.unreadable) {
    return (
      <Gate
        title="Couldn't verify your role"
        body="The contract could not be reached, so access is refused rather than assumed. Try again in a moment."
        tone="warn"
        action={
          <Button variant="secondary" size="md" onClick={() => role && refreshAll()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </Button>
        }
      />
    );
  }

  if (!role.isAdmin) {
    return (
      <Gate
        title="Admin access required"
        body={`Connected wallet ${shortAddress(role.address ?? "")} does not hold the admin role on the gacha contract. Every privileged call here is enforced on chain, so this page has nothing to offer this wallet.`}
        tone="warn"
        icon={<ShieldX className="h-5 w-5" aria-hidden="true" />}
        action={<Pill tone="quiet">Roles are read from the contract</Pill>}
      />
    );
  }

  const tabProps: AdminTabProps = { s, monitor, refreshAll, go };

  return (
    <PageContainer width="wide" className="py-8">
      {/* ---- header ---- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="micro mb-1.5 text-ink-3">Operator console</p>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Admin</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(142,197,0,0.4)] bg-[rgba(142,197,0,0.12)] px-2 py-0.5 text-[10.5px] font-semibold text-[#3f7d17]">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Admin verified
            </span>
          </div>
          <p className="num mt-1.5 text-[12px] text-ink-3">
            {shortAddress(role.address ?? "")} · {chainConfig.name}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                autoRefresh
                  ? "border-[rgba(142,197,0,0.4)] bg-[rgba(142,197,0,0.1)] text-[#3f7d17]"
                  : "border-[rgb(var(--line-rgb)_/_0.15)] text-ink-3 hover:text-ink-2",
              )}
              aria-pressed={autoRefresh}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", autoRefresh && "pulse-dot")}
                style={{ background: autoRefresh ? "#4f9e2f" : "#9aa093" }}
                aria-hidden="true"
              />
              Auto-refresh {autoRefresh ? "on" : "off"}
            </button>
            <Button variant="secondary" size="sm" onClick={refreshAll}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </Button>
          </div>
          <Freshness updatedAt={monitor.updatedAt} unreachable={monitor.unreachable} />
        </div>
      </header>

      {/* ---- system status (always visible) ---- */}
      <div className="mt-6">
        <SystemStatusStrip s={s} monitor={monitor} />
      </div>

      {/* ---- attention required (only when relevant) ---- */}
      <div className="mt-3">
        <AttentionRequired monitor={monitor} go={go} />
      </div>

      {/* ---- pool selector (only once a second pool exists) ---- */}
      {isStockMachineLive && STOCK_POOL_ID !== null ? (
        <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-[rgb(var(--line-rgb)_/_0.12)] bg-surface/60 p-1 text-[12px]">
          <span className="px-2 text-ink-3">Pool readiness:</span>
          {[
            { id: ACTIVE_POOL_ID, label: "Genesis" },
            { id: STOCK_POOL_ID, label: "Stock" },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPoolId(p.id)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                poolId === p.id ? "bg-ink text-surface" : "text-ink-2 hover:text-ink",
              )}
            >
              {p.label} <span className="num opacity-60">#{p.id.toString()}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* ---- tab nav ---- */}
      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-[rgb(var(--line-rgb)_/_0.1)] hide-scrollbar"
        aria-label="Admin sections"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => go(t.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-3.5 pb-2.5 pt-1 text-[13px] font-medium transition-colors",
                active ? "text-ink" : "text-ink-3 hover:text-ink-2",
              )}
            >
              {t.label}
              {active ? (
                <span
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#a6d900]"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* ---- active tab ---- */}
      <div className="mt-6">
        {tab === "overview" ? <OverviewTab {...tabProps} /> : null}
        {tab === "rounds" ? <RoundsTab {...tabProps} /> : null}
        {tab === "vault" ? <VaultTab {...tabProps} /> : null}
        {tab === "randomness" ? <RandomnessTab {...tabProps} /> : null}
        {tab === "fees" ? <FeesTab {...tabProps} /> : null}
        {tab === "raffle" ? <RaffleTab {...tabProps} /> : null}
        {tab === "system" ? <SystemTab {...tabProps} health={health} /> : null}
      </div>

      <p className="mt-10 max-w-[80ch] text-[11px] leading-relaxed text-ink-3">
        Read-first by design. Closing, requesting randomness and settling rounds
        are permissionless — the keeper normally does them, and these are the
        manual fallback. Structural changes (pool economics, roles, fee splits)
        stay in reviewed scripts. Gacha contract:{" "}
        <span className="num">{contracts.gacha ? shortAddress(contracts.gacha) : "not configured"}</span>.
      </p>
    </PageContainer>
  );
}

function Gate({
  title,
  body,
  tone = "neutral",
  icon,
  action,
}: {
  title: string;
  body: string;
  tone?: "neutral" | "warn";
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <PageContainer width="narrow" className="py-16">
      <div className="glass-card rounded-[22px]">
        <EmptyState
          icon={
            icon ??
            (tone === "warn" ? (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            ))
          }
          title={title}
          description={body}
          action={action ?? <Pill tone="quiet">Roles are read from the contract</Pill>}
        />
      </div>
    </PageContainer>
  );
}
