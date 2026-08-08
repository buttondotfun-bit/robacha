import { Lock } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";

/**
 * The honest state before the hub is deployed: the launchpad idea, with no
 * live counters or listings it can't yet back. Shown wherever a launchpad
 * surface has no contract to read.
 */
export function LaunchpadUnavailable() {
  const x = SOCIAL_LINKS[0];
  return (
    <div className="glass-card rounded-[24px] p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)]">
        <Lock className="h-5 w-5 text-ink-3" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.02em]">The launchpad opens soon</h2>
      <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-ink-2">
        Anyone will be able to escrow one of their Robinhood Chain NFTs and run a
        trustless raffle for it — the contract holds the NFT and the ticket money,
        pays the winner and the creator, and refunds everyone in full if it
        doesn&rsquo;t sell out. It goes live the moment the hub is deployed.
      </p>
      <div className="mt-5 flex justify-center">
        <ButtonLink href={x.href} external variant="secondary" size="lg">
          <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Follow for the opening
        </ButtonLink>
      </div>
    </div>
  );
}
