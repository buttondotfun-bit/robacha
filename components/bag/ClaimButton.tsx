"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ROBACHA_GACHA_ABI } from "@/lib/abi/robacha-gacha";
import { Button } from "@/components/ui/Button";
import { contracts } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Moves won rewards into the wallet.
 *
 * This was missing, and its absence had the same shape as the missing refund
 * control: the bag labelled rewards "unclaimed" — telling someone plainly that
 * something was theirs and not yet collected — while offering no way to collect
 * it. A status that implies an action has to come with the action.
 *
 * `claim` takes one reward, `claimMany` takes a batch; both are on the gacha and
 * callable only by the wallet that owns the reward.
 */
export function ClaimButton({
  rewardIds,
  label,
  size = "sm",
  variant = "secondary",
  className,
  onClaimed,
}: {
  rewardIds: string[];
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
  onClaimed?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  if (receipt.isSuccess && onClaimed) onClaimed();

  const busy = isPending || receipt.isLoading;
  const done = receipt.isSuccess;

  async function claim() {
    if (!contracts.gacha || rewardIds.length === 0) return;
    setError(null);
    try {
      // One reward uses `claim`; several use `claimMany`, so a wallet with a
      // full round's worth signs once rather than five times.
      const hash =
        rewardIds.length === 1
          ? await writeContractAsync({
              address: contracts.gacha,
              abi: ROBACHA_GACHA_ABI,
              functionName: "claim",
              args: [BigInt(rewardIds[0])],
            })
          : await writeContractAsync({
              address: contracts.gacha,
              abi: ROBACHA_GACHA_ABI,
              functionName: "claimMany",
              args: [rewardIds.map((id) => BigInt(id))],
            });
      setTxHash(hash);
    } catch (cause) {
      // The wallet's own words. A rejected signature is a choice, not a fault.
      setError(cause instanceof Error ? cause.message.split("\n")[0] : "Claim failed");
    }
  }

  return (
    <span className={cn("inline-flex flex-col items-end gap-1", className)}>
      <Button
        variant={variant}
        size={size}
        onClick={claim}
        disabled={busy || done || !contracts.gacha || rewardIds.length === 0}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        {done
          ? "Claimed"
          : isPending
            ? "Confirm…"
            : receipt.isLoading
              ? "Claiming…"
              : (label ?? "Claim")}
      </Button>
      {error ? (
        <span className="max-w-[26ch] text-right text-[10.5px] leading-snug text-[#8f3434]">
          {error}
        </span>
      ) : null}
    </span>
  );
}
