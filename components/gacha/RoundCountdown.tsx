"use client";

import { cn } from "@/lib/utils";
import { formatRoundClock } from "@/lib/use-live-round";

/**
 * The round's clock, as a clock.
 *
 * The time left was already on the page, as a clause at the end of a sentence
 * — "or in 0:32, whichever comes first". That reads as a footnote to someone
 * who has just paid and is watching the screen wondering whether anything is
 * happening. It is the single most reassuring number available and it was set
 * in the same size and weight as the disclaimer next to it.
 *
 * The ring is not decoration: it makes a 45-second window legible at a glance,
 * before the digits are read. It depletes rather than fills, because what is
 * running out is the wait.
 *
 * Everything here comes from the round's own `closesAt` and the pool's
 * `roundDuration`. Nothing is estimated, and when the deadline passes the
 * component says the window is up rather than counting into negative numbers
 * or resetting — a countdown that restarts is the exact manufactured urgency
 * this product does not use.
 */

/** Under this, the clock is nearly done and says so louder. */
const URGENT_MS = 10_000;

export function RoundCountdown({
  msLeft,
  durationSeconds,
  status,
  size = 56,
  className,
}: {
  /** Milliseconds until the deadline, from the round itself. */
  msLeft: number | null;
  /** The pool's configured window, used as the ring's denominator. */
  durationSeconds: number;
  status: "open" | "closing";
  size?: number;
  className?: string;
}) {
  const closing = status === "closing" || msLeft === null || msLeft <= 0;
  const total = Math.max(1, durationSeconds * 1000);
  // Clamped because a round can be read mid-transition, and a ring drawn from
  // a fraction above 1 renders as an empty circle — the opposite of the truth.
  const fraction = closing ? 0 : Math.min(1, Math.max(0, msLeft / total));
  const urgent = !closing && msLeft !== null && msLeft <= URGENT_MS;

  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="timer"
        aria-label={
          closing
            ? "Round window has ended, settling now"
            : `Round closes in ${formatRoundClock(msLeft ?? 0)}`
        }
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          className={cn("-rotate-90", urgent && "countdown-urgent")}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-[rgb(var(--ink-rgb)_/_0.1)]"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            className={cn(
              "countdown-ring",
              urgent ? "stroke-[#e08a4c]" : "stroke-[#8ec500]",
            )}
          />
        </svg>

        <span className="absolute inset-0 grid place-items-center">
          <span
            className={cn(
              "num text-[13px] font-semibold tabular-nums tracking-[-0.02em]",
              urgent ? "text-[#b35f22]" : "text-ink",
            )}
          >
            {closing ? "—" : formatRoundClock(msLeft ?? 0)}
          </span>
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-[12px] font-semibold tracking-[-0.02em] text-ink">
          {closing ? "Window’s up" : "Round closes in"}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-3">
          {closing
            ? "Settling now."
            : "or as soon as it fills, whichever comes first."}
        </p>
      </div>
    </div>
  );
}
