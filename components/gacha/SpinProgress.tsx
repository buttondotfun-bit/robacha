"use client";

import { Check } from "lucide-react";
import { RoundState } from "@/lib/use-pending-spins";
import { cn } from "@/lib/utils";

/**
 * Where a paid spin has got to, once its round has closed.
 *
 * Up to the close there is a deadline and `RoundCountdown` counts to it. After
 * it there is no deadline at all: the round's word is bought from StonkPit's
 * conductor and arrives when it arrives. That gap was where the product went
 * quiet — the countdown finished, the copy said "randomness is being
 * requested", and nothing on screen changed again until the reward appeared
 * minutes later. Several people read that as the spin having failed.
 *
 * So this shows position rather than time: which of four real on-chain states
 * the round is in, and how long it has been in flight. The states are the
 * gacha's own, not a narrative invented on top of them — each step lights when
 * the chain says so.
 *
 * Deliberately not a progress bar with a percentage. There is no honest
 * denominator for "waiting for a word to be mined", and a bar creeping toward
 * a full end would be inventing a completion time. The sweep says "working",
 * which is the whole of what is known.
 */

interface Step {
  key: string;
  label: string;
  /** Round states at which this step counts as reached. */
  done: (state: number) => boolean;
}

const STEPS: Step[] = [
  {
    key: "entered",
    label: "Entered",
    done: () => true,
  },
  {
    // "Round closed" is the accurate phrase and does not fit: at 375px the
    // four labels share the row and it truncated to "Round cl…", which reads
    // as broken rather than as abbreviated.
    key: "closed",
    label: "Closed",
    done: (s) => s !== RoundState.Open,
  },
  {
    key: "drawing",
    label: "Drawing",
    done: (s) =>
      s === RoundState.RandomnessReceived || s === RoundState.Settled,
  },
  {
    key: "reward",
    label: "Reward",
    done: (s) => s === RoundState.Settled,
  },
];

/** The first step that is not yet done — the one currently happening. */
function activeIndex(state: number): number {
  const index = STEPS.findIndex((step) => !step.done(state));
  return index === -1 ? STEPS.length - 1 : index;
}

export function SpinProgress({
  state,
  closedAt,
  now,
  className,
}: {
  state: number;
  /** Epoch ms the round closed, or null if it has not. */
  closedAt: number | null;
  /** Current time in ms, passed in so every row on the page ticks together. */
  now: number;
  className?: string;
}) {
  const active = activeIndex(state);
  const settled = state === RoundState.Settled;

  // Only counted once there is something to count from, and only forward — a
  // clock read slightly behind the chain's would otherwise render as negative.
  const waiting = closedAt !== null ? Math.max(0, now - closedAt) : null;

  return (
    <div className={cn("mt-2.5", className)}>
      <ol className="flex items-center gap-1.5" aria-label="Spin progress">
        {STEPS.map((step, index) => {
          const done = step.done(state);
          const isActive = !done && index === active;

          return (
            <li
              key={step.key}
              className={cn(
                "flex min-w-0 items-center gap-1.5",
                // The last label has no following step to make room for, so it
                // does not need a share of the leftover width.
                index < STEPS.length - 1 && "flex-1",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors duration-300",
                  done
                    ? "bg-[#8ec500] text-white"
                    : isActive
                      ? "step-active bg-[#8ec500]"
                      : "bg-[rgb(var(--ink-rgb)_/_0.12)]",
                )}
              >
                {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
              </span>
              <span
                className={cn(
                  "truncate text-[10.5px] leading-none",
                  done || isActive ? "font-medium text-ink-2" : "text-ink-3",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* The indeterminate stretch. Only while genuinely mid-draw: once the
          reward is assigned there is nothing left to wait for, and a sweep
          still running would say otherwise. */}
      {!settled ? (
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.07)]">
          <div className="wait-sweep h-full w-1/3 rounded-full bg-[linear-gradient(90deg,transparent,#8ec500,transparent)]" />
        </div>
      ) : null}

      {waiting !== null && !settled ? (
        <p className="mt-1.5 text-[11px] text-ink-3">
          Waiting <span className="num tabular-nums">{formatElapsed(waiting)}</span> since the
          round closed.
        </p>
      ) : null}
    </div>
  );
}

/** "0:42", "3:07" — the same clock face the countdown uses. */
function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
