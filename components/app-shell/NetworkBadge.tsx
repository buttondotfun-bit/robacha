"use client";

import { AlertTriangle } from "lucide-react";
import { GlassChip } from "@/components/ui/Glass";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import { NETWORK_LABEL } from "@/lib/web3";

/**
 * Network pill. Reflects the wallet's actual chain, and offers a switch when
 * it is connected to the wrong one.
 */
export function NetworkBadge({ className }: { className?: string }) {
  const wallet = useWallet();

  if (wallet.wrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => void wallet.switchNetwork()}
        className={cn(
          "glass-chip inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border-[rgba(190,120,120,0.4)] bg-[rgba(253,243,243,0.7)] px-3 text-[12.5px] font-medium text-[#8f3434]",
          className,
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Switch to {NETWORK_LABEL}
      </button>
    );
  }

  return (
    <GlassChip
      dot
      className={cn("h-9 whitespace-nowrap px-3 text-[12.5px]", className)}
    >
      <span>{NETWORK_LABEL}</span>
    </GlassChip>
  );
}

/** Static, server-renderable variant for marketing surfaces. */
export function ChainBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "glass-chip inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[12px] font-medium text-ink-2",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-[#8ec500] shadow-[0_0_8px_rgba(142,197,0,0.9)]"
        aria-hidden="true"
      />
      Built on {NETWORK_LABEL}
    </span>
  );
}
