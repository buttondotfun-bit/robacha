"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatUnits } from "viem";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { ShareWin } from "@/components/rewards/ShareWin";
import { RarityChip } from "@/components/shared/RarityChip";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatAmount } from "@/lib/formatters";
import { RoundState, usePendingSpins } from "@/lib/use-pending-spins";
import { useSettleNotification } from "@/lib/use-settle-notification";
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

  const [watching, setWatching] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [won, setWon] = useState<WalletReward[]>([]);
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
  }, [settleable, refetch]);

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

  const market = useTokenMarket(won.map((w) => w.token));

  if (!open) return null;

  const settled = won.length > 0;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title={settled ? "Here's what you pulled" : "Opening your capsules…"}
      description={
        settled
          ? `${won.length} ${won.length === 1 ? "prize" : "prizes"} from round #${won[0]?.roundId}`
          : "Your round is full and settling now. This usually takes a few seconds."
      }
    >
      {!settled ? (
        <div className="flex items-center gap-3 rounded-[16px] bg-[rgba(16,17,15,0.035)] px-4 py-5">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-3" aria-hidden="true" />
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            Unsealing this round&rsquo;s number and handing out prizes. You
            don&rsquo;t need to stay on this page — everything lands in My Bag
            either way.
            {notify.enabled
              ? " We'll ping you the moment it's done, as long as this tab is still open."
              : ""}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {won.map((r) => {
            const rarity = r.rarity ?? pool?.tiers[r.tierIndex]?.rarity ?? null;
            return (
              <li
                key={r.rewardId}
                data-rarity={rarity ?? undefined}
                className="glass-card flex items-center gap-3 rounded-[16px] p-3"
              >
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.85)] [container-type:inline-size]">
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
