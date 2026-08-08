"use client";

import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Abi, Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { explorerUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * A high-risk contract write, gated behind a review + typed confirmation.
 *
 * The blast radius of pausing spins or moving fees is real, so a casual button
 * press must never execute one. The flow is: open, review the exact parameters
 * (recipient, amount, network, contract), type the confirmation word, then sign
 * — and the call is simulated first, so the contract's own revert surfaces
 * before anything is signed. The transaction hash is shown on submission and
 * the receipt is awaited; nothing here is optimistic.
 */
export function DangerousAction({
  label,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerClassName,
  disabled,
  title,
  description,
  reviewRows,
  confirmWord,
  warning,
  address,
  abi,
  functionName,
  args,
  onDone,
}: {
  label: string;
  triggerVariant?: "primary" | "secondary" | "danger";
  triggerSize?: "sm" | "md" | "lg";
  triggerClassName?: string;
  disabled?: boolean;
  title: string;
  description: string;
  reviewRows: { label: string; value: string; mono?: boolean }[];
  /** The exact word the operator must type to arm the action. */
  confirmWord: string;
  /** One-line consequence, shown in red above the input. */
  warning: string;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  onDone?: () => void;
}) {
  const { address: account } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"review" | "submitting" | "confirming" | "done">(
    "review",
  );
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const receipt = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  if (receipt.isSuccess && phase === "confirming") {
    setPhase("done");
    onDone?.();
  }

  function reset() {
    setTyped("");
    setPhase("review");
    setError(null);
    setTxHash(null);
  }

  function close() {
    setOpen(false);
    // Let the dialog animate out before resetting its contents.
    setTimeout(reset, 200);
  }

  const armed = typed.trim().toUpperCase() === confirmWord.toUpperCase();

  async function run() {
    if (!client || !account || !armed) return;
    setError(null);
    setPhase("submitting");
    try {
      const { request } = await client.simulateContract({
        address,
        abi,
        functionName,
        args: args as never,
        account,
      });
      const hash = await writeContractAsync(request as never);
      setTxHash(hash);
      setPhase("confirming");
    } catch (cause) {
      setPhase("review");
      setError(
        cause instanceof Error
          ? cause.message.split("\n")[0].slice(0, 180)
          : "The transaction could not be prepared.",
      );
    }
  }

  const txLink = txHash ? explorerUrl("tx", txHash) : null;
  const busy = phase === "submitting" || phase === "confirming";

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {label}
      </Button>

      <Dialog
        open={open}
        onClose={busy ? () => {} : close}
        title={title}
        description={description}
        dismissible={!busy}
      >
        {phase === "done" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-[12px] border border-[rgba(142,197,0,0.4)] bg-[rgba(142,197,0,0.1)] px-3.5 py-3 text-[13px] font-medium text-[#3f7d17]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Confirmed on chain.
            </div>
            {txLink ? (
              <a
                href={txLink}
                target="_blank"
                rel="noreferrer"
                className="num inline-flex items-center gap-1.5 text-[12px] text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink"
              >
                View transaction
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
            <div className="flex justify-end">
              <Button variant="secondary" size="md" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Review — the exact parameters, verbatim. */}
            <dl className="divide-y divide-[rgb(var(--line-rgb)_/_0.08)] overflow-hidden rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.1)]">
              {reviewRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <dt className="text-[12px] text-ink-3">{row.label}</dt>
                  <dd
                    className={cn(
                      "text-right text-[12.5px] font-medium text-ink",
                      row.mono && "num break-all",
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="text-[12px] font-medium leading-snug text-[#b23a29]">
              {warning}
            </p>

            {busy ? (
              <div className="flex items-center gap-2 rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3 text-[12.5px] text-ink-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {phase === "submitting"
                  ? "Awaiting your signature…"
                  : "Submitted — waiting for confirmation…"}
                {txLink ? (
                  <a
                    href={txLink}
                    target="_blank"
                    rel="noreferrer"
                    className="num ml-auto inline-flex items-center gap-1 text-[11.5px] underline decoration-dotted underline-offset-2"
                  >
                    tx <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            ) : (
              <div>
                <label className="micro mb-1.5 block text-ink-3">
                  Type <span className="num font-semibold text-ink">{confirmWord}</span>{" "}
                  to continue
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="num w-full rounded-[10px] border border-[rgb(var(--line-rgb)_/_0.15)] bg-[rgb(var(--surface-rgb))] px-3 py-2 text-[13px] text-ink outline-none focus:border-[rgb(var(--line-rgb)_/_0.35)]"
                  placeholder={confirmWord}
                />
              </div>
            )}

            {error ? (
              <p className="text-[11.5px] leading-snug text-[#b23a29]">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={run}
                disabled={!armed || busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {label}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
