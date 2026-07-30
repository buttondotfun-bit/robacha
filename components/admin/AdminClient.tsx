"use client";

import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { formatEther } from "viem";
import {
  ROBACHA_FEE_ROUTER_ABI,
  ROBACHA_GACHA_ABI,
} from "@/lib/abi";
import { AdminAction } from "@/components/admin/AdminAction";
import { PoolAnalytics } from "@/components/admin/PoolAnalytics";
import { EmptyState, PageContainer, Pill, StatCard } from "@/components/shared/primitives";
import { Button } from "@/components/ui/Button";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useAdminRole } from "@/lib/use-admin-role";
import { fmtEth, fmtToken, useAdminState } from "@/lib/use-admin-state";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";

/**
 * Operator console.
 *
 * Every panel here exists because something went wrong without it: rounds
 * stalled with no view of them, a prize vault that drained silently, a
 * commitment queue nobody watched, and fees that looked missing because they
 * accrue rather than transfer.
 *
 * Read-first by design. The writes offered are the ones an operator genuinely
 * needs between deployments; anything structural — pool economics, roles, fee
 * splits — stays in reviewed scripts where it gets a diff and a dry run.
 */
export function AdminClient() {
  const wallet = useWallet();
  const role = useAdminRole();
  const s = useAdminState();

  if (!wallet.isConnected) {
    return (
      <Gate
        title="Connect a wallet"
        body={`This console reads your roles from the contracts on ${chainConfig.name}.`}
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
      />
    );
  }

  if (!role.isAdmin) {
    return (
      <Gate
        title="Not an admin wallet"
        body={`${shortAddress(role.address ?? "")} does not hold the admin role on the gacha contract. Every privileged call here is enforced on chain, so this page simply has nothing to offer you.`}
        tone="warn"
      />
    );
  }

  const gacha = contracts.gacha!;
  const router = contracts.feeRouter;

  return (
    <PageContainer width="wide" className="py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="micro mb-2">Operator console</p>
          <h1 className="text-section-title">Admin</h1>
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
            Admin role confirmed on chain for {shortAddress(role.address ?? "")}
          </p>
        </div>
        <Button variant="secondary" size="md" onClick={s.refetch}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {/* ---- headline ---- */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Spins"
          value={s.paused === null ? "—" : s.paused ? "Paused" : s.spinReady ? "Live" : "Not ready"}
          hint={s.readinessReason || undefined}
          emphasis={s.paused === false && s.spinReady === true}
        />
        <StatCard label="Rounds needing action" value={String(s.actionableRounds.length)} />
        <StatCard label="Held in escrow" value={fmtEth(s.totalEscrow)} hint="User funds mid-round" />
        <StatCard label="Owed as refunds" value={fmtEth(s.totalRefundable)} hint="Withdrawable by users" />
      </div>

      {/* ---- participation ---- */}
      <Panel
        title="Who's using it"
        note="Counted from contract logs, all time. Wallets rather than spins — thirty spins from six wallets and thirty from thirty are the same number describing very different things."
      >
        <PoolAnalytics />
      </Panel>

      {/* ---- vault ---- */}
      <Panel
        title="Prize vault"
        note="A spin that cannot be paid in full is refunded instead. An empty vault does not break anything — it just stops paying out."
      >
        {s.vaultTokens.length === 0 ? (
          <p className="text-[13px] text-ink-3">No reward tokens registered on the vault.</p>
        ) : (
          <ul className="space-y-2">
            {s.vaultTokens.map((t) => (
              <li
                key={t.address}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-3.5 py-3",
                  t.solvent ? "bg-[rgb(var(--ink-rgb)_/_0.035)]" : "border border-[#eadfc4] bg-[#fdfaf2]",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">
                    {t.symbol ?? shortAddress(t.address)}
                    {!t.solvent ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[#8a6d1f]">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        cannot cover its reserved amount
                      </span>
                    ) : null}
                  </p>
                  <p className="num mt-0.5 text-[11.5px] text-ink-3">
                    available {fmtToken(t.available, t.decimals)} · reserved{" "}
                    {fmtToken(t.reserved, t.decimals)} · balance {fmtToken(t.balance, t.decimals)}
                  </p>
                </div>
                <a
                  href={explorerUrl("token", t.address) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="num text-[11px] text-ink-3 underline decoration-dotted underline-offset-2"
                >
                  {shortAddress(t.address)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- rounds ---- */}
      <Panel
        title="Rounds"
        note="Closing, requesting randomness and settling are permissionless — the keeper normally does them. These buttons are the manual fallback."
      >
        {s.rounds.length === 0 ? (
          <p className="text-[13px] text-ink-3">No rounds yet.</p>
        ) : (
          <ul className="space-y-2">
            {s.rounds.map((r) => (
              <li
                key={r.roundId}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-3.5 py-3",
                  r.nextAction ? "border border-[#d8ecb0] bg-accent-soft" : "bg-[rgb(var(--ink-rgb)_/_0.035)]",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">
                    Round #{r.roundId} · {r.state}
                  </p>
                  <p className="num mt-0.5 text-[11.5px] text-ink-3">
                    {r.entryCount} entries · {r.settledCount} settled · escrow{" "}
                    {formatEther(r.escrowWei)} {chainConfig.nativeSymbol}
                    {r.waiting ? ` · ${r.waiting}` : ""}
                  </p>
                </div>
                {r.nextAction ? (
                  <AdminAction
                    label={r.nextAction === "settleEntries" ? "Settle" : r.nextAction === "closeRound" ? "Close" : "Request randomness"}
                    address={gacha}
                    abi={ROBACHA_GACHA_ABI as never}
                    functionName={r.nextAction}
                    args={
                      r.nextAction === "settleEntries"
                        ? [BigInt(r.roundId), 25]
                        : [BigInt(r.roundId)]
                    }
                    variant="primary"
                    onDone={s.refetch}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- randomness ---- */}
      <Panel
        title="Randomness"
        note="Commitments are posted ahead of the rounds they serve. An empty queue stalls spins rather than weakening them — which is the safe direction, but it does stop the machine."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Commitments queued"
            value={s.randomness.available === null ? "—" : String(s.randomness.available)}
            hint={s.randomness.available !== null && s.randomness.available < 10n ? "running low" : undefined}
          />
          <StatCard
            label="Revealed / missed"
            value={
              s.randomness.revealed === null
                ? "—"
                : `${s.randomness.revealed} / ${s.randomness.missed ?? 0}`
            }
            hint="Missed reveals are public and permanent"
          />
          <StatCard label="Operator bond" value={fmtEth(s.randomness.bond)} />
          <StatCard
            label="Reveal window"
            value={
              s.randomness.revealWindow === null
                ? "—"
                : `${Number(s.randomness.revealWindow) / 60} min`
            }
            hint={`reimbursement ${fmtEth(s.randomness.gasReimbursement)}`}
          />
        </div>
      </Panel>

      {/* ---- fees ---- */}
      <Panel
        title="Fees"
        note="Fees accrue here and are withdrawn, never pushed. Addresses are deduplicated — several treasury roles often share one wallet, and summing per role double-counts."
      >
        {s.fees.length === 0 ? (
          <p className="text-[13px] text-ink-3">Fee router not configured.</p>
        ) : (
          <ul className="space-y-2">
            {s.fees.map((f) => (
              <li
                key={f.address}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="num text-[13px] font-medium text-ink">{fmtEth(f.accrued)}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">
                    {shortAddress(f.address)} · {f.roles.join(" + ")}
                  </p>
                </div>
                {router && f.accrued !== null && f.accrued > 0n ? (
                  <AdminAction
                    label="Withdraw"
                    address={router}
                    abi={ROBACHA_FEE_ROUTER_ABI as never}
                    functionName="withdraw"
                    args={[f.address]}
                    onDone={s.refetch}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- controls ---- */}
      <Panel
        title="Controls"
        note="Pausing stops new spins. It does not touch money already in a round, and it never blocks refunds or claims."
      >
        <div className="flex flex-wrap gap-2">
          {s.paused === false ? (
            <AdminAction
              label="Pause spins"
              address={gacha}
              abi={ROBACHA_GACHA_ABI as never}
              functionName="pause"
              confirm="Pause all new spins? Rounds in flight continue, and refunds and claims stay open."
              onDone={s.refetch}
            />
          ) : null}
          {s.paused === true ? (
            <AdminAction
              label="Resume spins"
              address={gacha}
              abi={ROBACHA_GACHA_ABI as never}
              functionName="unpause"
              variant="primary"
              confirm="Resume spins?"
              onDone={s.refetch}
            />
          ) : null}
        </div>
      </Panel>
    </PageContainer>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card mt-4 rounded-[22px] p-5">
      <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h2>
      {note ? (
        <p className="mb-4 mt-1 max-w-[80ch] text-[11.5px] leading-relaxed text-ink-3">{note}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}

function Gate({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "warn";
}) {
  return (
    <PageContainer width="narrow" className="py-16">
      <div className="glass-card rounded-[22px]">
        <EmptyState
          icon={
            tone === "warn" ? (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            )
          }
          title={title}
          description={body}
          action={<Pill tone="quiet">Roles are read from the contract</Pill>}
        />
      </div>
    </PageContainer>
  );
}
