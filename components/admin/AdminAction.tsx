"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Abi, Address } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * One privileged (or permissionless) contract call, with its failure shown.
 *
 * Simulates before sending. Operator calls fail for ordinary reasons — a round
 * moved on, a role is missing, a cap is reached — and finding that out from a
 * reverted transaction costs gas and tells you almost nothing. The simulation
 * surfaces the contract's own error first, and only a call that would succeed
 * is ever signed.
 */
export function AdminAction({
  label,
  address,
  abi,
  functionName,
  args,
  variant = "secondary",
  size = "sm",
  confirm,
  onDone,
  className,
}: {
  label: string;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  /** Shown as a browser confirm for anything with a blast radius. */
  confirm?: string;
  onDone?: () => void;
  className?: string;
}) {
  const { address: account } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const receipt = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  if (receipt.isSuccess && txHash) {
    // Clear once, then let the parent refresh from chain.
    setTxHash(null);
    setPending(false);
    onDone?.();
  }

  async function run() {
    if (!client || !account) return;
    if (confirm && !window.confirm(confirm)) return;
    setError(null);
    setPending(true);
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
    } catch (cause) {
      setPending(false);
      setError(
        cause instanceof Error ? cause.message.split("\n")[0].slice(0, 160) : "failed",
      );
    }
  }

  const busy = pending || receipt.isLoading;

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <Button variant={variant} size={size} onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        {busy ? "Sending…" : label}
      </Button>
      {error ? (
        <span className="max-w-[38ch] text-[10.5px] leading-snug text-[#8f3434]">{error}</span>
      ) : null}
    </span>
  );
}
