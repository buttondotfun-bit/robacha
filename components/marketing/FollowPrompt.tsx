"use client";

import { X } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { SOCIAL_LINKS } from "@/lib/constants";
import { useConsent } from "@/lib/use-consent";

/**
 * A single, quiet nudge to follow the project account.
 *
 * Deliberately restrained: it sits in the corner rather than over the page, it
 * never blocks anything, and dismissing it is permanent. On a product where
 * people spend real money, an interstitial that interrupts the flow to sell
 * them something is the kind of pattern that erodes the trust the rest of this
 * interface is built to earn.
 */
export function FollowPrompt() {
  const { legal, followDismissed, dismissFollow } = useConsent();

  // Never stack on top of the entry gate.
  if (!legal || followDismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:justify-end sm:px-6 sm:pb-6">
      <div className="glass-panel glass-highlight pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-[18px] p-4">
        <span className="glass-micro grid h-9 w-9 shrink-0 place-items-center rounded-[12px]">
          <XIcon className="h-3.5 w-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-[-0.02em]">
            New pools get posted first on X
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
            Follow {SOCIAL_LINKS[0].handle} to hear when v2 and new machines go
            live.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <a
              href={SOCIAL_LINKS[0].href}
              target="_blank"
              rel="noreferrer"
              onClick={dismissFollow}
              // bg-ink with a literal white label was invisible in dark, where ink is
              // near-white. text-canvas is ink's counterpart in both themes: a dark
              // button with light text in light mode, and the inverse in dark.
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12px] font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <XIcon className="h-3 w-3" />
              Follow
            </a>
            <button
              type="button"
              onClick={dismissFollow}
              className="h-8 rounded-full px-3 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
            >
              No thanks
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissFollow}
          aria-label="Dismiss"
          className="shrink-0 text-ink-3 transition-colors hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
