"use client";

import { ArrowUpRight, Flame } from "lucide-react";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { isOfficialRobToken, ROB_TOKEN } from "@/data/rob-token";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import { formatAmount, shortAddress } from "@/lib/formatters";
import type { HealthCheck, UseAdminHealth } from "@/lib/use-admin-health";
import { fmtToken } from "@/lib/use-admin-state";
import { useRobBurnStats } from "@/lib/use-rob";
import { cn } from "@/lib/utils";
import { DangerousAction } from "../DangerousAction";
import type { AdminTabProps } from "../types";
import { AdminSection, type OpStatus, Sk, StatusBadge } from "../ui";

const CHECK_LABEL: Record<string, string> = {
  rpc: "RPC",
  productionRpc: "Production RPC",
  archiveRpc: "Archive RPC",
  contracts: "Contracts deployed",
  spins: "Spin readiness",
  database: "Database / indexer",
  keeper: "Keeper",
  configuration: "Configuration",
};

const CONTRACT_LABEL: Record<string, string> = {
  gacha: "Spin contract",
  poolRegistry: "Pool registry",
  rewardVault: "Prize vault",
  feeRouter: "Fee router",
  randomnessSender: "Randomness adapter",
  randomnessReceiver: "Randomness receiver",
  raffle: "Raffle",
  raffleHub: "Raffle launchpad",
};

function checkStatus(c: HealthCheck): { status: OpStatus; label: string } {
  if (c.ok) return { status: "healthy", label: "Healthy" };
  if (c.required) return { status: "critical", label: "Down" };
  return { status: "warning", label: "Degraded" };
}

export function SystemTab({
  s,
  health,
  refreshAll,
}: AdminTabProps & { health: UseAdminHealth }) {
  const gacha = contracts.gacha!;
  const burn = useRobBurnStats();
  const robInVault = s.vaultTokens.find((t) => isOfficialRobToken(t.address));

  const checks = health.health?.checks ?? {};
  const contractMap = health.health?.contracts ?? {};
  const deployed = health.health?.contractsDeployed ?? {};
  const robLink = explorerUrl("token", ROB_TOKEN.address);

  return (
    <div className="space-y-4">
      {/* Emergency controls first — the highest-consequence surface. */}
      <AdminSection
        title="Emergency controls"
        description="Pausing stops new spins. It doesn't touch money already in a round, and it never blocks refunds or claims."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="micro text-ink-3">Spins</span>
            <StatusBadge
              status={s.paused === null ? "unknown" : s.paused ? "paused" : "healthy"}
              label={s.paused === null ? "—" : s.paused ? "Paused" : "Live"}
            />
          </div>
          {s.paused === false ? (
            <DangerousAction
              label="Pause spins"
              triggerVariant="danger"
              title="Pause token spins?"
              description="Blocks all new spins on the gacha contract."
              reviewRows={[
                { label: "Action", value: "pause()" },
                { label: "Contract", value: shortAddress(gacha), mono: true },
                { label: "Network", value: chainConfig.name },
              ]}
              confirmWord="PAUSE"
              warning="New spins will be blocked immediately. Rounds in flight continue; refunds and claims stay open."
              address={gacha}
              abi={ROBACHA_GACHA_ABI as never}
              functionName="pause"
              onDone={refreshAll}
            />
          ) : null}
          {s.paused === true ? (
            <DangerousAction
              label="Resume spins"
              triggerVariant="danger"
              title="Resume token spins?"
              description="Re-enables new spins on the gacha contract."
              reviewRows={[
                { label: "Action", value: "unpause()" },
                { label: "Contract", value: shortAddress(gacha), mono: true },
                { label: "Network", value: chainConfig.name },
              ]}
              confirmWord="RESUME"
              warning="New spins will be accepted again as soon as this confirms."
              address={gacha}
              abi={ROBACHA_GACHA_ABI as never}
              functionName="unpause"
              onDone={refreshAll}
            />
          ) : null}
        </div>
      </AdminSection>

      {/* System health from /api/health — every check is a real call. */}
      <AdminSection
        title="System health"
        description="Every check performs a real call — nothing is 'healthy' merely because it's configured."
        action={
          health.health ? (
            <StatusBadge
              status={
                health.health.status === "healthy"
                  ? "healthy"
                  : health.health.status === "degraded"
                    ? "warning"
                    : "critical"
              }
              label={health.health.status === "healthy" ? "Healthy" : health.health.status === "degraded" ? "Degraded" : "Down"}
            />
          ) : null
        }
      >
        {health.unreachable ? (
          <p className="text-[12.5px] text-[#b23a29]">
            Couldn&rsquo;t reach the health endpoint.
          </p>
        ) : health.isLoading && !health.health ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Sk key={i} className="h-10 w-full rounded-[10px]" />
            ))}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {Object.entries(checks).map(([key, c]) => {
              const st = checkStatus(c);
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                      {CHECK_LABEL[key] ?? key}
                      {!c.required ? (
                        <span className="rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] px-1.5 py-0.5 text-[9.5px] font-medium text-ink-3">
                          optional
                        </span>
                      ) : null}
                    </p>
                    {c.detail ? (
                      <p className="num mt-0.5 max-w-[80ch] break-words text-[11px] text-ink-3">{c.detail}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={st.status} label={st.label} />
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>

      {/* Production contracts, from the health probe's resolved map. */}
      <AdminSection
        title="Production contracts"
        description="Resolved from the deployment, with bytecode confirmed on chain."
      >
        {Object.keys(contractMap).length === 0 ? (
          health.isLoading ? (
            <Sk className="h-24 w-full rounded-[12px]" />
          ) : (
            <p className="text-[12.5px] text-ink-3">No contract map available.</p>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[12px]">
              <thead>
                <tr className="text-left text-ink-3">
                  <th className="pb-2 font-medium">Contract</th>
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 text-right font-medium">Deployed</th>
                  <th className="pb-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(contractMap).map(([name, address]) => {
                  const link = address ? explorerUrl("address", address) : null;
                  const isDeployed = deployed[name];
                  return (
                    <tr key={name} className="border-t border-[rgb(var(--line-rgb)_/_0.07)]">
                      <td className="py-2 font-medium text-ink">{CONTRACT_LABEL[name] ?? name}</td>
                      <td className="num py-2 text-ink-3">{address ? shortAddress(address) : "—"}</td>
                      <td className="py-2 text-right">
                        <StatusBadge
                          status={isDeployed ? "healthy" : address ? "critical" : "unknown"}
                          label={isDeployed ? "Yes" : address ? "No" : "—"}
                        />
                      </td>
                      <td className="py-2 text-right">
                        {link ? (
                          <a href={link} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink" aria-label={`Open ${name} on explorer`}>
                            <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* $ROB economics — monitoring only; burns run automatically via the keeper. */}
      <AdminSection
        title="$ROB economics"
        description="Buyback-and-burn runs automatically from protocol margin via the keeper — this is monitoring, not a control."
        action={
          <a
            href={ROB_TOKEN.route}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-2 hover:text-ink"
          >
            $ROB page <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RobMetric label="Contract" value={shortAddress(ROB_TOKEN.address)} mono />
          <RobMetric
            label="Burned"
            value={
              burn.amount === null ? "…" : burn.hasBurned ? `${formatAmount(burn.amount)}` : "None yet"
            }
            icon={<Flame className="h-3 w-3 text-[#d8642f]" aria-hidden="true" />}
          />
          <RobMetric
            label="Reward vault balance"
            value={robInVault ? fmtToken(robInVault.balance, robInVault.decimals) : "—"}
          />
          <RobMetric label="Total supply" value={formatAmount(ROB_TOKEN.totalSupply)} />
        </div>
        {robLink ? (
          <a
            href={robLink}
            target="_blank"
            rel="noreferrer"
            className="num mt-3 inline-flex items-center gap-1 text-[11.5px] text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            $ROB contract on explorer
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
      </AdminSection>
    </div>
  );
}

function RobMetric({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3 py-2.5">
      <p className="micro text-ink-3">{label}</p>
      <p className={cn("mt-1 flex items-center gap-1 text-[13px] font-semibold text-ink", mono && "num")}>
        {icon}
        {value}
      </p>
    </div>
  );
}
