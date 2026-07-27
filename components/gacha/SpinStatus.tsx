import { Check, Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpinPhase } from "@/types/reward";

interface StatusCopy {
  label: string;
  detail: string;
  busy: boolean;
}

/** Single source for every spin-state label used by the button and status row. */
export const SPIN_COPY: Record<SpinPhase, StatusCopy> = {
  idle: { label: "Rob the Gacha", detail: "Ready when you are.", busy: false },
  simulating: {
    label: "Preparing your pull",
    detail: "Simulating the call against the contract before asking you to sign…",
    busy: true,
  },
  confirming: {
    label: "Confirm in Wallet",
    detail: "Waiting for you to sign in your wallet…",
    busy: true,
  },
  broadcast: {
    label: "Spin Submitted",
    detail: "Transaction broadcast — waiting for it to be included in a block…",
    busy: true,
  },
  "round-open": {
    label: "Entered the Round",
    detail: "Your entry is in the open round. It closes when it is full or its window ends.",
    busy: true,
  },
  "round-closed": {
    label: "Round Closed",
    detail: "No further entries. Randomness is being requested for this round.",
    busy: true,
  },
  "randomness-pending": {
    label: "Drawing Your Reward",
    detail: "The randomness request is in flight. Results are assigned on chain when it returns.",
    busy: true,
  },
  settled: {
    label: "Reward Found",
    detail: "Randomness returned and your reward was assigned on chain. It is in My Bag.",
    busy: false,
  },
  refundable: {
    label: "Refund Available",
    detail: "Randomness did not return before the timeout. Your payment can be refunded.",
    busy: false,
  },
  error: {
    label: "Spin Failed — Try Again",
    detail: "No spin was sent.",
    busy: false,
  },
};

export function SpinStatus({
  phase,
  className,
}: {
  phase: SpinPhase;
  className?: string;
}) {
  if (phase === "idle") return null;
  const copy = SPIN_COPY[phase];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px]",
        phase === "error"
          ? "border-[rgba(190,120,120,0.4)] bg-[rgba(253,243,243,0.72)] text-[#8f3434]"
          : phase === "settled"
            ? "border-[rgba(163,204,0,0.42)] bg-[rgba(204,255,0,0.18)] text-accent-ink"
            : "glass-quiet text-ink-2",
        className,
      )}
    >
      {copy.busy ? (
        <Loader2
          className="h-3.5 w-3.5 shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : phase === "settled" ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{copy.detail}</span>
    </div>
  );
}
