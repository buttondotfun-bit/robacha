"use client";

import { formatUnits } from "viem";
import { XIcon } from "@/components/brand/XIcon";
import { SOCIAL_LINKS } from "@/lib/constants";
import { chainConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { WalletReward } from "@/types/reward";

const HANDLE = SOCIAL_LINKS[0].handle; // @robachadotfun

/**
 * Share a win on X, with the project account tagged.
 *
 * The text is built from the reward the wallet actually holds — the real
 * symbol, the real amount, the real rarity. Nothing is embellished and no
 * figure is invented, because a share post is a public claim about what this
 * product paid out and it has to survive someone checking it on the explorer.
 *
 * Deliberately a plain link, not an API call: it opens X with the text
 * pre-filled and the person posts it themselves. Nothing is published on
 * anyone's behalf, and no account is ever connected.
 *
 * The link points at /win/<rewardId> rather than the app, so the post unfurls
 * into a generated card of the actual pull. Nobody screenshots a sentence, and
 * X will not accept a bare image URL — it reads Open Graph tags from whatever
 * page is linked, which is what that route exists to provide. The card itself
 * is rendered from the reward id alone, so a shared one cannot be forged.
 */
export function shareText(reward: WalletReward, shareUrl: string): string {
  const amount =
    reward.decimals !== null
      ? Number(formatUnits(BigInt(reward.amountRaw), reward.decimals))
      : null;

  const pretty =
    amount === null
      ? null
      : amount.toLocaleString("en-US", { maximumFractionDigits: 4 });

  const token = reward.symbol ? `$${reward.symbol}` : "a token";
  const rarity = reward.rarity ? `${reward.rarity} pull` : "pull";
  const haul = pretty ? `${pretty} ${token}` : token;

  return [
    `Just pulled ${haul} out of the ${HANDLE} machine 🎰`,
    ``,
    `${rarity} on ${chainConfig.name}.`,
    ``,
    shareUrl,
  ].join("\n");
}

export function ShareWin({
  reward,
  className,
}: {
  reward: WalletReward;
  className?: string;
}) {
  // Built at click time so it picks up the deployed origin rather than a
  // hardcoded domain that would be wrong on preview builds.
  function open() {
    const shareUrl =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/win/${reward.rewardId}`;
    const url = new URL("https://x.com/intent/tweet");
    url.searchParams.set("text", shareText(reward, shareUrl));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={open}
      title={`Share this pull on X and tag ${HANDLE}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[rgb(var(--line-rgb)_/_0.1)] bg-surface/70 px-3 text-[12px] font-medium text-ink-2",
        "transition-colors hover:border-[rgb(var(--line-rgb)_/_0.2)] hover:text-ink",
        className,
      )}
    >
      <XIcon className="h-3 w-3" />
      Share
    </button>
  );
}
