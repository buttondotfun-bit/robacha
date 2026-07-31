"use client";

import { XIcon } from "@/components/brand/XIcon";
import { chainConfig } from "@/lib/config";
import { SOCIAL_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const HANDLE = SOCIAL_LINKS[0].handle; // @robachadotfun

/**
 * Share a spin that was just paid for.
 *
 * Careful about what this can claim. A spin does not resolve at purchase — the
 * round has to close and the draw has to land — so this post says the lever was
 * pulled, never what came out. Announcing a prize here would be inventing an
 * outcome that does not exist yet, and the person sharing would be the one
 * caught out by it. Winning has its own share button in My Bag, where there is
 * a real reward to name.
 */
export function shareSpinText(quantity: number, appUrl: string): string {
  const what = quantity === 1 ? "a coin" : `${quantity} coins`;
  return [
    `Just dropped ${what} into the ${HANDLE} machine 🎰`,
    ``,
    `Random memecoin incoming on ${chainConfig.name}.`,
    ``,
    appUrl,
  ].join("\n");
}

export function ShareSpin({
  quantity,
  className,
}: {
  quantity: number;
  className?: string;
}) {
  function open() {
    const appUrl =
      typeof window === "undefined" ? "" : `${window.location.origin}/app`;
    const url = new URL("https://x.com/intent/tweet");
    url.searchParams.set("text", shareSpinText(quantity, appUrl));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={open}
      title={`Share your spin on X and tag ${HANDLE}`}
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full",
        "border border-[rgb(var(--line-rgb)_/_0.1)] bg-surface/70 px-3 text-[12.5px] font-medium text-ink-2",
        "transition-colors hover:border-[rgb(var(--line-rgb)_/_0.2)] hover:text-ink",
        className,
      )}
    >
      <XIcon className="h-3 w-3" />
      Share your spin
    </button>
  );
}
