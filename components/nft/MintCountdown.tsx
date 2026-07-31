"use client";

import { useEffect, useState } from "react";
import { NFT_MINT_OPENS_AT } from "@/data/nft";

/**
 * Time until the mint window opens.
 *
 * Counts to a fixed instant and stops. It does not roll forward, and it does
 * not restart when it reaches zero — a countdown that quietly resets is the
 * oldest trick in this category, and being the project that doesn't do it is
 * worth more than the urgency it would buy. If the date moves, it moves in the
 * data file and the page says so.
 *
 * Renders a stable placeholder until mounted, because the remaining time
 * depends on the viewer's clock and the server has no way to know it.
 */
const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Mins" },
  { key: "seconds", label: "Secs" },
] as const;

function remaining(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    done: ms === 0,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export function MintCountdown() {
  const target = new Date(NFT_MINT_OPENS_AT).getTime();
  const [now, setNow] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    setNow(remaining(target));
    const id = window.setInterval(() => setNow(remaining(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (now?.done) {
    return (
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        The mint window is due to open. If the button above is still locked,
        we&rsquo;re finishing the on-chain checks — it unlocks the moment the
        contract is live and verified.
      </p>
    );
  }

  return (
    <div>
      <p className="micro mb-2">Minting opens in</p>
      <div className="grid grid-cols-4 gap-2">
        {UNITS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.04)] px-2 py-2.5 text-center"
          >
            <p className="num text-[20px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {now === null ? "--" : String(now[key]).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-ink-3">
              {label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        Target:{" "}
        <time dateTime={NFT_MINT_OPENS_AT}>
          {new Date(NFT_MINT_OPENS_AT).toLocaleString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </time>
      </p>
    </div>
  );
}
