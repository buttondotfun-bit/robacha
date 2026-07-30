"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { formatUnits } from "viem";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { ShareWin } from "@/components/rewards/ShareWin";
import { RarityChip } from "@/components/shared/RarityChip";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatAmount } from "@/lib/formatters";
import { RoundState, usePendingSpins } from "@/lib/use-pending-spins";
import { useSettleNotification } from "@/lib/use-settle-notification";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { ActivePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWalletRewards } from "@/lib/use-wallet-rewards";
import type { WalletReward } from "@/types/reward";

/**
 * Shows what a spin actually produced, as soon as it exists.
 *
 * Two things make this possible rather than theatrical. A full round closes
 * itself the moment the last entry lands, and blocks confirm in about a tenth
 * of a second — so the only delay was the keeper's five-minute tick. This asks
 * the server to settle that specific round straight away, then waits for the
 * rewards to appear on chain.
 *
 * It never invents an outcome to fill the gap. The prizes shown are read back
 * from the contract after settlement; until they exist the dialog says it is
 * still working. A celebration screen that guesses would be the single most
 * damaging thing this product could do.
 */
export function SpinResult({ pool }: { pool: ActivePool | null }) {
  const { pending } = usePendingSpins();
  const { rewards, refetch } = useWalletRewards();
  const notify = useSettleNotification();
  const sound = useSound();

  const [watching, setWatching] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [won, setWon] = useState<WalletReward[]>([]);

  /**
   * Where the capsule is up to. `waiting` rattles for exactly as long as the
   * chain actually takes, `opening` is the crack, and `revealed` counts the
   * prizes shown so far so they land one at a time rather than all at once.
   */
  const [stage, setStage] = useState<"waiting" | "opening" | "revealed">("waiting");
  const [shown, setShown] = useState(0);
  const nudged = useRef<Set<number>>(new Set());
  const knownRewardIds = useRef<Set<string> | null>(null);

  // Remember what this wallet already held, so only genuinely new rewards are
  // celebrated. Without this, opening the page with old rewards would fire it.
  useEffect(() => {
    if (knownRewardIds.current === null && rewards) {
      knownRewardIds.current = new Set(rewards.map((r) => r.rewardId));
    }
  }, [rewards]);

  // A round of ours that is closed but not settled is one we can hurry along.
  const settleable = pending.find(
    (p) => p.state !== RoundState.Open && !p.withdrawable,
  );

  useEffect(() => {
    if (!settleable) return;
    const roundId = settleable.roundId;
    if (nudged.current.has(roundId)) return;
    nudged.current.add(roundId);
    setWatching(roundId);
    setOpen(true);
    setStage("waiting");
    setShown(0);
    sound.crank();

    // Asked here rather than on page load: there is now a real reason, and the
    // spin click is the user gesture browsers require.
    if (notify.canAsk) void notify.request();

    // Fire and forget: the dialog's real signal is rewards appearing on chain,
    // not this response. If it fails the keeper still picks the round up.
    void fetch("/api/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId }),
    })
      .catch(() => {})
      .finally(() => void refetch());
  }, [settleable, refetch, sound, notify]);

  // Poll for the reward rows while a watched round is in flight.
  useEffect(() => {
    if (watching === null) return;
    const id = window.setInterval(() => void refetch(), 3000);
    return () => window.clearInterval(id);
  }, [watching, refetch]);

  useEffect(() => {
    if (watching === null || !rewards || knownRewardIds.current === null) return;
    const fresh = rewards.filter(
      (r) => !knownRewardIds.current!.has(r.rewardId) && r.roundId === watching,
    );
    if (fresh.length > 0) {
      setWon(fresh);
      fresh.forEach((r) => knownRewardIds.current!.add(r.rewardId));
      setWatching(null);
      // Only fires if they have left the tab; no-op otherwise.
      notify.notify(
        fresh.length === 1 ? "Your spin settled" : `${fresh.length} prizes are yours`,
        "Your round is done. Come and see what you pulled.",
      );
    }
  }, [rewards, watching, notify]);

  /**
   * Crack, then unveil one prize at a time.
   *
   * Someone who buys five spins used to get five rows appearing at once, which
   * is one moment for five purchases. Staggering turns it into five. The pacing
   * is fixed and short — it starts only once the rewards genuinely exist on
   * chain, so it delays the telling, never the settling.
   *
   * Anyone who has asked for reduced motion skips straight to the list: the
   * capsule is flourish, and its opening animation is what removes it from the
   * screen, so leaving that disabled mid-sequence would strand it.
   */
  useEffect(() => {
    if (won.length === 0) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      setStage("revealed");
      setShown(won.length);
      return;
    }

    const timers: number[] = [];
    setStage("opening");
    sound.crack();

    timers.push(
      window.setTimeout(() => {
        setStage("revealed");
        won.forEach((reward, index) => {
          timers.push(
            window.setTimeout(() => {
              setShown((count) => Math.max(count, index + 1));
              sound.reveal(
                reward.rarity ?? pool?.tiers[reward.tierIndex]?.rarity ?? null,
              );
            }, index * 520),
          );
        });
      }, 420),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
    // Deliberately keyed on the round, not on `won` identity: refetches replace
    // the array and would otherwise restart the sequence mid-reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won[0]?.rewardId]);

  const market = useTokenMarket(won.map((w) => w.token));

  if (!open) return null;

  const settled = won.length > 0 && stage === "revealed";

  // The best thing in the round decides how loud the whole reveal is.
  const RANK = ["common", "uncommon", "rare", "epic", "legendary"];
  const best = won.reduce<string | null>((top, reward) => {
    const rarity = reward.rarity ?? pool?.tiers[reward.tierIndex]?.rarity ?? null;
    if (!rarity) return top;
    if (!top) return rarity;
    return RANK.indexOf(rarity) > RANK.indexOf(top) ? rarity : top;
  }, null);
  const isBig = best === "legendary" || best === "epic";

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title={settled ? (isBig ? "Look what you pulled." : "Here's what you pulled") : "Opening your capsules…"}
      description={
        settled
          ? `${won.length} ${won.length === 1 ? "prize" : "prizes"} from round #${won[0]?.roundId}`
          : "Your round is full and settling now. This usually takes a few seconds."
      }
    >
      {/* Sound is off until asked for, and the switch lives where the sound
          would happen rather than buried in a settings page. */}
      <button
        type="button"
        onClick={() => sound.setEnabled(!sound.enabled)}
        aria-pressed={sound.enabled}
        className="glass-chip absolute right-14 top-4 z-20 grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:text-ink"
        title={sound.enabled ? "Turn sound off" : "Turn sound on"}
      >
        {sound.enabled ? (
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="sr-only">
          {sound.enabled ? "Turn reveal sound off" : "Turn reveal sound on"}
        </span>
      </button>

      {!settled ? (
        <div
          data-rarity={best ?? undefined}
          className="relative grid place-items-center overflow-hidden rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-4 py-7"
        >
          {/* Rattles for exactly as long as the chain actually takes. The
              motion reports real waiting; it does not manufacture any. */}
          <Capsule
            className={stage === "opening" ? "capsule--opening" : "capsule--waiting"}
          />
          {stage === "opening" ? (
            <span
              aria-hidden="true"
              className="burst-ring pointer-events-none absolute h-24 w-24 rounded-full border-2 border-[rgb(var(--rarity-glow)_/_0.6)]"
            />
          ) : null}

          <p className="mt-4 max-w-[46ch] text-center text-[12.5px] leading-relaxed text-ink-2">
            Unsealing this round&rsquo;s number and handing out prizes. You
            don&rsquo;t need to stay on this page — everything lands in My Bag
            either way.
            {notify.enabled
              ? " We'll ping you the moment it's done, as long as this tab is still open."
              : ""}
          </p>
        </div>
      ) : (
        <ul className={cn("space-y-2", isBig && "takeover")}>
          {won.slice(0, shown).map((r, index) => {
            const rarity = r.rarity ?? pool?.tiers[r.tierIndex]?.rarity ?? null;
            return (
              <li
                key={r.rewardId}
                data-rarity={rarity ?? undefined}
                // Index drives the stagger, so prizes land one after another
                // rather than all at once.
                style={{ "--reveal-index": index } as React.CSSProperties}
                className="reward-reveal glass-card flex items-center gap-3 rounded-[16px] border border-transparent p-3"
              >
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.85)] [container-type:inline-size]">
                  <TokenAvatar
                    address={r.token}
                    symbol={r.symbol}
                    logoUrl={market.get(r.token)?.logoUrl}
                    size={40}
                    rounded="none"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="num text-[14px] font-semibold text-ink">
                    {r.decimals !== null
                      ? formatAmount(Number(formatUnits(BigInt(r.amountRaw), r.decimals)))
                      : "—"}{" "}
                    {r.symbol ?? ""}
                  </p>
                  <p className="text-[11.5px] text-ink-3">{r.name ?? "Unknown token"}</p>
                </div>
                {rarity ? <RarityChip rarity={rarity} size="xs" /> : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {settled ? (
          <>
            <ButtonLink href="/bag" variant="primary" size="md" className="flex-1">
              Claim in My Bag
            </ButtonLink>
            {won[0] ? <ShareWin reward={won[0]} /> : null}
          </>
        ) : (
          <Button variant="secondary" size="md" fullWidth onClick={() => setOpen(false)}>
            Close and check later
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/**
 * The capsule. Two halves, a seam and a highlight — drawn rather than shipped
 * as an image so it can take the rarity colour of whatever is inside it
 * without needing one file per tier.
 */
function Capsule({ className }: { className?: string }) {
  return (
    <span className={cn("capsule relative grid h-20 w-20 place-items-center", className)}>
      <svg viewBox="0 0 80 80" className="h-20 w-20" aria-hidden="true">
        <defs>
          <linearGradient id="capsule-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--rarity-glow) / 0.95)" />
            <stop offset="100%" stopColor="rgb(var(--rarity-glow) / 0.65)" />
          </linearGradient>
        </defs>
        {/* Bottom half stays neutral so the coloured half reads as the lid. */}
        <path d="M8 40a32 32 0 0 0 64 0Z" fill="rgb(var(--ink-rgb) / 0.14)" />
        <path d="M8 40a32 32 0 0 1 64 0Z" fill="url(#capsule-top)" />
        <rect x="6" y="36.5" width="68" height="7" rx="3.5" fill="rgb(var(--edge-rgb) / 0.85)" />
        <ellipse cx="28" cy="24" rx="9" ry="6" fill="rgb(var(--edge-rgb) / 0.45)" />
      </svg>
      <span className="sr-only">Opening your capsule</span>
    </span>
  );
}
