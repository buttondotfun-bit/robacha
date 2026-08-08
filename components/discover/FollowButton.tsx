"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useMounted } from "@/lib/use-mounted";
import { useWatchlist } from "@/lib/use-watchlist";
import { cn } from "@/lib/utils";

/**
 * Follow / Following toggle for a project.
 *
 * Sits on top of a "stretched-link" card, so it stops the click from
 * navigating. Following is saved locally (see useWatchlist) and requires a
 * connected wallet; without one it shows an honest "connect to follow" hint
 * rather than silently opening the wallet modal on hover (spec §7).
 */
export function FollowButton({
  address,
  className,
  size = "sm",
}: {
  address: string;
  className?: string;
  size?: "sm" | "xs";
}) {
  const watch = useWatchlist();
  const [hint, setHint] = useState(false);
  const mounted = useMounted();

  // Avoid a hydration flash: render the neutral state until mounted, then the
  // real local follow state. Gated on canFollow so "Following" can never show
  // without a connected wallet to own the saved list.
  const following = mounted && watch.canFollow && watch.isFollowing(address);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 2600);
    return () => clearTimeout(t);
  }, [hint]);

  return (
    <span className={cn("relative z-10 inline-flex flex-col items-end", className)}>
      <button
        type="button"
        aria-pressed={following}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!watch.canFollow) {
            setHint(true);
            return;
          }
          watch.toggle(address);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border font-medium transition-colors",
          size === "xs" ? "h-6 px-2 text-[10.5px]" : "h-7 px-2.5 text-[11.5px]",
          following
            ? "border-[rgba(142,197,0,0.45)] bg-[rgba(142,197,0,0.14)] text-[#3f7d17]"
            : "border-[rgb(var(--line-rgb)_/_0.15)] text-ink-2 hover:border-[rgb(var(--line-rgb)_/_0.28)] hover:text-ink",
        )}
      >
        {following ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Plus className="h-3 w-3" aria-hidden="true" />
        )}
        {following ? "Following" : "Follow"}
      </button>
      {hint ? (
        <span role="status" className="absolute right-0 top-full mt-1 w-max rounded-md bg-ink px-2 py-1 text-[10.5px] font-medium text-surface shadow-lg">
          Connect a wallet to follow
        </span>
      ) : null}
    </span>
  );
}
