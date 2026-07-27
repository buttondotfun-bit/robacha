"use client";

import { useState } from "react";
import { ArrowDownToLine, ExternalLink, Loader2 } from "lucide-react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ROBACHA_GACHA_ABI } from "@/lib/abi/robacha-gacha";
import { ErrorState } from "@/components/shared/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import { shortHash } from "@/lib/formatters";
import { useMoneyState } from "@/lib/use-money-state";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";

/**
 * Withdraw money the contract owes this wallet.
 *
 * This was missing, which was worse than an ordinary gap: the spin assistant
 * and the pending-spins panel both told people their refund was waiting "in My
 * Bag", and My Bag had no way to take it. Someone owed money was sent to a page
 * that could not pay them and showed no sign the money existed.
 *
 * The balance is read straight from `refundable(address)`, so it is the
 * contract's own figure rather than anything reconstructed from events.
 */
export function RefundPanel({ className }: { className?: string }) {
  const wallet = useWallet();
  const money = useMoneyState();
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const receipt = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  // Nothing owed and nothing in flight — stay out of the way entirely.
  if (!wallet.isConnected || (!money.hasRefund && !txHash)) return null;

  const confirmed = receipt.isSuccess;
  const waiting = isPending || receipt.isLoading;
  // explorerUrl returns null when no explorer is configured for the chain.
  const txLink = txHash ? explorerUrl("tx", txHash) : null;

  async function withdraw() {
    if (!contracts.gacha) return;
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: contracts.gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "withdrawRefund",
      });
      setTxHash(hash);
    } catch (cause) {
      // Surface the wallet's own words. A rejected signature is not a fault
      // and should not read like one.
      const message = cause instanceof Error ? cause.message.split("\n")[0] : "Withdrawal failed";
      setError(message);
    }
  }

  return (
    <section
      className={cn(
        "glass-card rounded-[22px] border border-[#d8ecb0] bg-accent-soft p-5",
        className,
      )}
      aria-label="Refund"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-[-0.02em] text-accent-ink">
            {confirmed ? "Refund withdrawn" : "You have money to withdraw"}
          </p>
          <p className="num mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink">
            {money.refundableDisplay ?? "—"} {chainConfig.nativeSymbol}
          </p>
          <p className="mt-2 max-w-[52ch] text-[12px] leading-relaxed text-accent-ink/80">
            {confirmed
              ? "It's on its way to your wallet."
              : "From spins that couldn't be completed — the spin price and the draw fee, in full. Only your wallet can take it out."}
          </p>
        </div>

        {!confirmed ? (
          <Button
            variant="primary"
            size="lg"
            onClick={withdraw}
            disabled={waiting || !contracts.gacha}
            className="shrink-0"
          >
            {waiting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? "Confirm in wallet" : receipt.isLoading ? "Withdrawing…" : "Withdraw"}
          </Button>
        ) : null}
      </div>

      {txLink ? (
        <ButtonLink
          href={txLink}
          external
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <span className="num">{shortHash(txHash ?? "")}</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </ButtonLink>
      ) : null}

      {error ? (
        <ErrorState
          className="mt-3"
          title="Withdrawal not sent"
          description={error}
          action={
            <Button size="sm" variant="secondary" onClick={() => setError(null)}>
              Dismiss
            </Button>
          }
        />
      ) : null}
    </section>
  );
}
