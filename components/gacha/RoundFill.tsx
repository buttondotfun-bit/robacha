"use client";

import { Users } from "lucide-react";
import { formatRoundClock, useLiveRound } from "@/lib/use-live-round";
import { cn } from "@/lib/utils";
import type { ActivePool } from "@/lib/use-pool";

/**
 * How full the current round is.
 *
 * A round settles when it fills or when its window ends, and until now that was
 * invisible: someone who paid saw a spinner and no reason for it. The number was
 * on chain the whole time and only the admin console showed it.
 *
 * It is also the only honest urgency this product has. "Two more spins and this
 * round settles" is true, it is checkable, and the pressure it creates is real
 * rather than manufactured — unlike a countdown that resets or a fake viewer
 * count. Nothing here is invented: the fill comes from the round's entryCount
 * and the cap from the pool's own maxEntriesPerRound.
 *
 * When no round is open it says so plainly instead of showing an empty bar,
 * because zero-of-five would read as "nobody is here" when the truth is that
 * the next spin opens a round.
 */
export function RoundFill({
  pool,
  className,
}: {
  pool: ActivePool | null;
  className?: string;
}) {
  const round = useLiveRound();
  const cap = pool?.maxEntriesPerRound ?? 0;

  if (!pool || cap <= 0) return null;

  const open = round.status === "open" || round.status === "closing";
  const filled = open ? Math.min(round.entryCount ?? 0, cap) : 0;
  const remaining = Math.max(0, cap - filled);
  const percent = cap > 0 ? (filled / cap) * 100 : 0;

  // One pip per spin. At five a bar would be less legible than the pips.
  const pips = Array.from({ length: cap }, (_, index) => index < filled);

  return (
    <div
      className={cn(
        "glass-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] px-3.5 py-2.5",
        className,
      )}
      role="status"
    >
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
        <p className="text-[12.5px] font-semibold tracking-[-0.02em]">
          {open ? (
            <>
              {filled} of {cap} spins in
            </>
          ) : (
            "Round not started"
          )}
        </p>
      </div>

      <div className="flex items-center gap-1" aria-hidden="true">
        {pips.map((lit, index) => (
          <span
            key={index}
            className={cn(
              "h-2 w-5 rounded-full transition-colors duration-300",
              lit ? "bg-[#8ec500]" : "bg-[rgb(var(--ink-rgb)_/_0.1)]",
            )}
          />
        ))}
      </div>

      <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-ink-2">
        {!open ? (
          <>Your spin opens the next one and starts its clock.</>
        ) : remaining === 0 ? (
          <>Full — settling now.</>
        ) : round.status === "closing" ? (
          <>Window&rsquo;s up. Settling now.</>
        ) : (
          <>
            <span className="font-medium text-ink">
              {remaining} more {remaining === 1 ? "spin" : "spins"}
            </span>{" "}
            and this round settles
            {round.msLeft !== null ? (
              <> — or in {formatRoundClock(round.msLeft)}, whichever comes first</>
            ) : null}
            .
          </>
        )}
      </p>

      <span className="sr-only">
        {open ? `${filled} of ${cap} spins taken, ${remaining} remaining` : "No round open"}
      </span>

      {/* Percentage is exposed for assistive tech even though the pips carry it
          visually. */}
      <progress className="sr-only" value={percent} max={100} />
    </div>
  );
}
