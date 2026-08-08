"use client";

import { ArrowUpRight } from "lucide-react";
import { formatEther, type Address } from "viem";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { Dialog } from "@/components/ui/Dialog";
import { chainConfig, explorerUrl } from "@/lib/config";
import { cn } from "@/lib/utils";
import { AdminAction } from "./AdminAction";
import { DangerousAction } from "./DangerousAction";
import type { AdminState } from "./types";
import { type OpStatus, StatusBadge } from "./ui";

type AdminRound = AdminState["rounds"][number];

/** Map a round's contract state to a semantic status. Real states only. */
export function roundStatus(r: AdminRound): OpStatus {
  if (r.state === "Settled") return "healthy";
  if (r.state === "Open") return "healthy";
  if (r.state === "Failed") return "critical";
  if (r.state === "Refundable" || r.state === "Cancelled") return "warning";
  if (r.nextAction) return "warning";
  return "unknown";
}

function actionLabel(a: AdminRound["nextAction"]): string {
  return a === "settleEntries"
    ? "Settle"
    : a === "closeRound"
      ? "Close"
      : a === "requestRoundRandomness"
        ? "Request randomness"
        : "";
}

/** The single call that moves a round forward, rendered inline. */
export function RoundAction({
  round,
  gacha,
  onDone,
}: {
  round: AdminRound;
  gacha: Address;
  onDone: () => void;
}) {
  if (!round.nextAction) return null;
  return (
    <AdminAction
      label={actionLabel(round.nextAction)}
      address={gacha}
      abi={ROBACHA_GACHA_ABI as never}
      functionName={round.nextAction}
      args={
        round.nextAction === "settleEntries"
          ? [BigInt(round.roundId), 25]
          : [BigInt(round.roundId)]
      }
      variant="primary"
      onDone={onDone}
    />
  );
}

/** The prominent card for the live round, if one exists. */
export function ActiveRoundCard({
  round,
  gacha,
  onDone,
}: {
  round: AdminRound | null;
  gacha: Address;
  onDone: () => void;
}) {
  if (!round) {
    return (
      <div className="flex h-full flex-col justify-center rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-4 py-6 text-center">
        <p className="text-[13px] font-medium text-ink-2">No active round</p>
        <p className="mt-1 text-[11.5px] text-ink-3">
          The next paid spin opens one. Nothing is in flight.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-[rgba(142,197,0,0.3)] bg-[rgba(142,197,0,0.05)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="num text-[15px] font-semibold text-ink">Round #{round.roundId}</p>
        <StatusBadge status={roundStatus(round)} label={round.state} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Entries" value={String(round.entryCount)} />
        <Field label="Settled" value={String(round.settledCount)} />
        <Field
          label="Escrow"
          value={`${Number(formatEther(round.escrowWei)).toFixed(4)} ${chainConfig.nativeSymbol}`}
        />
        <Field label="Status" value={round.waiting || round.state} />
      </dl>
      {round.nextAction ? (
        <div className="mt-3">
          <RoundAction round={round} gacha={gacha} onDone={onDone} />
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="micro text-ink-3">{label}</dt>
      <dd className="num mt-1 text-[13px] font-medium text-ink">{value}</dd>
    </div>
  );
}

/** One row in the rounds list. */
export function RoundRow({
  round,
  gacha,
  onDone,
  onOpen,
}: {
  round: AdminRound;
  gacha: Address;
  onDone: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-3.5 py-3",
        round.nextAction
          ? "border border-[rgba(224,165,58,0.4)] bg-[rgba(224,165,58,0.06)]"
          : "border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)]",
      )}
    >
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <span className="num">Round #{round.roundId}</span>
          <StatusBadge status={roundStatus(round)} label={round.state} />
        </p>
        <p className="num mt-0.5 text-[11.5px] text-ink-3">
          {round.entryCount} entries · {round.settledCount} settled · escrow{" "}
          {Number(formatEther(round.escrowWei)).toFixed(4)} {chainConfig.nativeSymbol}
          {round.waiting ? ` · ${round.waiting}` : ""}
        </p>
      </button>
      {round.nextAction ? (
        <RoundAction round={round} gacha={gacha} onDone={onDone} />
      ) : null}
    </li>
  );
}

/** Round detail drawer — what we can read for a round, plus a verify link. */
export function RoundDrawer({
  round,
  open,
  onClose,
  gacha,
  onDone,
}: {
  round: AdminRound | null;
  open: boolean;
  onClose: () => void;
  gacha: Address;
  onDone: () => void;
}) {
  if (!round) return null;
  const link = explorerUrl("address", gacha);
  // A round is a candidate for a manual refund only once it has closed and is
  // stuck non-terminal — markRoundRefundable rejects Open rounds on chain.
  const canForceRefund =
    !["Settled", "Refundable", "Cancelled", "None"].includes(round.state) &&
    round.state !== "Open" &&
    round.closedAt > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Round #${round.roundId}`}
      description="Read from the gacha contract."
      variant="sheet"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={roundStatus(round)} label={round.state} />
          {round.waiting ? (
            <span className="text-[11.5px] text-ink-3">{round.waiting}</span>
          ) : null}
        </div>

        <dl className="divide-y divide-[rgb(var(--line-rgb)_/_0.08)] overflow-hidden rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.1)]">
          <DRow label="Round ID" value={`#${round.roundId}`} />
          <DRow label="State" value={round.state} />
          <DRow label="Entries" value={String(round.entryCount)} />
          <DRow label="Settled" value={String(round.settledCount)} />
          <DRow
            label="Escrow"
            value={`${formatEther(round.escrowWei)} ${chainConfig.nativeSymbol}`}
          />
          <DRow
            label="Closes at"
            value={
              round.closesAt
                ? new Date(round.closesAt * 1000).toLocaleString("en-GB", { timeZone: "UTC" })
                : "—"
            }
          />
          <DRow
            label="Closed at"
            value={
              round.closedAt
                ? new Date(round.closedAt * 1000).toLocaleString("en-GB", { timeZone: "UTC" })
                : "—"
            }
          />
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          {round.nextAction ? (
            <RoundAction round={round} gacha={gacha} onDone={onDone} />
          ) : null}
          {canForceRefund ? (
            <DangerousAction
              label="Mark refundable"
              triggerVariant="danger"
              title={`Mark round #${round.roundId} refundable?`}
              description="Use only when a round is genuinely stuck and cannot settle. It opens refunds for every entry in this round."
              reviewRows={[
                { label: "Round", value: `#${round.roundId}` },
                { label: "State", value: round.state },
                { label: "Escrow", value: `${formatEther(round.escrowWei)} ${chainConfig.nativeSymbol}` },
                { label: "Network", value: chainConfig.name },
              ]}
              confirmWord="REFUND"
              warning="Entrants will be refunded instead of paid a prize. This cannot be undone."
              address={gacha}
              abi={ROBACHA_GACHA_ABI as never}
              functionName="markRoundRefundable"
              args={[BigInt(round.roundId)]}
              onDone={onDone}
            />
          ) : null}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="num inline-flex items-center gap-1 text-[12px] text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              Verify on explorer
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>

        <p className="text-[11px] leading-relaxed text-ink-3">
          Per-entry player wallets, payments and reward/claim transactions are on
          chain against this round; open the contract on the explorer to inspect
          them. This drawer shows what the console reads directly.
        </p>
      </div>
    </Dialog>
  );
}

function DRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="num break-all text-right text-[12.5px] font-medium text-ink">{value}</dd>
    </div>
  );
}
