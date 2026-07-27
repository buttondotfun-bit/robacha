"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, Loader2 } from "lucide-react";
import { useNow } from "@/lib/use-activity";
import { RoundState, usePendingSpins, type PendingSpin } from "@/lib/use-pending-spins";
import { cn } from "@/lib/utils";

/**
 * Spins this wallet is still waiting on.
 *
 * Sits above the spin controls deliberately. Someone who reloads mid-round
 * needs to see that their money is accounted for before they see a button
 * inviting them to spend again — otherwise the page reads as though nothing
 * happened and the obvious response is to pay twice.
 */
export function PendingSpins({ className }: { className?: string }) {
  const { pending, isLoading, hasWallet } = usePendingSpins();

  if (!hasWallet) return null;

  if (isLoading && pending.length === 0) {
    return (
      <div
        className={cn(
          "glass-card flex items-center gap-2.5 rounded-[18px] px-4 py-3.5",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" aria-hidden="true" />
        <p className="text-[12.5px] text-ink-2">Checking for spins in progress…</p>
      </div>
    );
  }

  if (pending.length === 0) return null;

  const total = pending.reduce((sum, row) => sum + row.entries, 0);

  return (
    <section
      className={cn("glass-card rounded-[18px] p-4", className)}
      aria-label="Spins in progress"
    >
      <div className="flex items-center gap-2">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
        <p className="text-[13px] font-semibold tracking-[-0.02em]">
          You have {total} {total === 1 ? "spin" : "spins"} in progress
        </p>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
        Already paid for and recorded on chain. You don&rsquo;t need to spin
        again.
      </p>

      <ul className="mt-3 space-y-2">
        {pending.map((row) => (
          <PendingRow key={row.roundId} row={row} />
        ))}
      </ul>
    </section>
  );
}

function PendingRow({ row }: { row: PendingSpin }) {
  const now = useNow();

  const closesIn = row.closesAt !== null ? row.closesAt - now : null;
  const refundIn = row.refundableAt !== null ? row.refundableAt - now : null;

  return (
    <li
      className={cn(
        "rounded-[14px] px-3.5 py-3",
        row.withdrawable
          ? "border border-[#d8ecb0] bg-accent-soft"
          : "bg-[rgba(16,17,15,0.035)]",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={cn(
            "text-[12.5px] font-medium",
            row.withdrawable ? "text-accent-ink" : "text-ink",
          )}
        >
          {row.label}
        </p>
        <span className="num shrink-0 text-[11px] text-ink-3">
          round #{row.roundId} · {row.entries}{" "}
          {row.entries === 1 ? "spin" : "spins"}
        </span>
      </div>

      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{row.detail}</p>

      {closesIn !== null && closesIn > 0 ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Round closes in {formatGap(closesIn)}
        </p>
      ) : null}

      {/* Only worth showing while the draw could still land. Once it is
          refundable the deadline has passed and the number would read as a
          countdown to nothing. */}
      {!row.withdrawable &&
      row.state !== RoundState.Open &&
      refundIn !== null &&
      refundIn > 0 ? (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
          If the draw doesn&rsquo;t arrive within {formatGap(refundIn)}, you can
          take your full payment back.
        </p>
      ) : null}

      {row.withdrawable ? (
        <Link
          href="/bag"
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink underline decoration-dotted underline-offset-2"
        >
          Withdraw it
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      ) : null}
    </li>
  );
}

/** "about 2 hours", "18 minutes", "40 seconds" — never a raw timestamp. */
function formatGap(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}
