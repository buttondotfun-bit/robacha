"use client";

import { usePathname } from "next/navigation";
import { Gift, X } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { useWalletRewards } from "@/lib/use-wallet-rewards";

/**
 * A standing reminder that prizes are sitting unclaimed.
 *
 * Winning and claiming are two separate transactions, and nothing carried the
 * gap between them. Someone can pull a legendary, close the tab, and never
 * learn they still have to fetch it — the tokens are theirs on chain either
 * way, which is exactly why the absence of any prompt is easy to miss.
 *
 * Dismissible, and it stays dismissed for the session rather than forever: this
 * is money the person owns, so it should be easy to silence and hard to lose
 * track of. It is hidden on My Bag, where the claim buttons are already the
 * main thing on the page and a banner pointing at them would be noise.
 */
export function ClaimReminder() {
  const { unclaimed } = useWalletRewards();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || pathname === "/bag" || unclaimed.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-30 px-4 lg:bottom-6">
      <div className="pointer-events-auto mx-auto flex max-w-[560px] items-center gap-3 rounded-[18px] border border-[#d8ecb0] bg-accent-soft px-4 py-3 shadow-[0_8px_24px_rgba(20,24,18,0.1)]">
        <Gift className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-accent-ink">
            {unclaimed.length} {unclaimed.length === 1 ? "prize is" : "prizes are"}{" "}
            waiting for you
          </p>
          <p className="text-[11.5px] leading-snug text-accent-ink/80">
            They&rsquo;re yours already — claiming moves them into your wallet.
          </p>
        </div>
        <ButtonLink href="/bag" variant="primary" size="sm" className="shrink-0">
          Claim
        </ButtonLink>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide this reminder"
          className="shrink-0 rounded-full p-1 text-accent-ink/60 transition-colors hover:text-accent-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
