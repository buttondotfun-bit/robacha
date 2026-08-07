import { XIcon } from "@/components/brand/XIcon";
import { SOCIAL_LINKS } from "@/lib/constants";

/**
 * Where the countdown used to be.
 *
 * The countdown was honest — a fixed target that never restarted — but a
 * public date is still a promise, and the operator chose to stop making it
 * until the mint is actually ready. Announcing on X instead means the date is
 * said once, when it is certain, rather than ticking on the site while plans
 * move underneath it.
 *
 * The internal target stays in data/nft.ts; nothing renders it.
 */
export function MintFollowCta() {
  const x = SOCIAL_LINKS[0];
  return (
    <div>
      <p className="micro">Minting opens</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
        Date coming soon. Follow{" "}
        <a
          href={x.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-ink underline decoration-dotted underline-offset-2"
        >
          <XIcon className="h-3 w-3" aria-hidden="true" />
          {x.handle}
        </a>{" "}
        to hear the moment it&rsquo;s announced.
      </p>
    </div>
  );
}
