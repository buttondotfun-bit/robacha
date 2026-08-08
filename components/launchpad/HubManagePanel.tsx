"use client";

import { Loader2, PackageOpen, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HubRaffleState } from "@/lib/abi/robacha-raffle-hub";
import { useMoney } from "@/lib/use-money";
import { useHubRaffle } from "@/lib/use-raffle-hub";
import { useWallet } from "@/lib/use-wallet";

/**
 * The creator's controls for their own raffle. Renders only for the wallet that
 * listed it, and only offers the one action its current state permits — cancel
 * before any sale, claim the 90% after a sellout draw, or take the NFT back if
 * it didn't sell out. Nothing here can touch a buyer's money; those are the same
 * permissionless paths the contract exposes to everyone.
 */
export function HubManagePanel({ id }: { id: number }) {
  const r = useHubRaffle(id);
  const wallet = useWallet();
  const money = useMoney();

  if (!r.raffle || !wallet.address) return null;
  const raffle = r.raffle;
  if (wallet.address.toLowerCase() !== raffle.creator.toLowerCase()) return null;

  const busy = r.phase === "pending";
  const canCancel = raffle.state === HubRaffleState.Open && raffle.ticketsSold === 0;
  const canClaim = raffle.state === HubRaffleState.Complete && !raffle.proceedsSettled;
  const canReclaim = raffle.state === HubRaffleState.Refundable && !raffle.nftSettled;

  // 90% of the take, after the 10% platform fee.
  const creatorTake = (raffle.totalEscrow * 9n) / 10n;

  if (!canCancel && !canClaim && !canReclaim) {
    return (
      <div className="glass-card rounded-[18px] p-4 text-[12px] text-ink-3">
        <p className="micro mb-1 text-ink-2">Your listing</p>
        {raffle.proceedsSettled
          ? "You've claimed your proceeds. Nothing left to do."
          : raffle.nftSettled && raffle.state === HubRaffleState.Refundable
            ? "You've reclaimed your NFT."
            : "Nothing to do yet — the raffle is running."}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[18px] p-4">
      <p className="micro mb-2 text-ink-2">Your listing</p>

      {canCancel ? (
        <>
          <p className="mb-2.5 text-[12px] leading-relaxed text-ink-3">
            No tickets sold yet — you can cancel and take your NFT back. Once a
            single ticket sells, the raffle must run to a draw or a refund.
          </p>
          <Button variant="secondary" size="md" fullWidth disabled={busy} onClick={() => void r.cancel()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            Cancel &amp; reclaim NFT
          </Button>
        </>
      ) : null}

      {canClaim ? (
        <>
          <p className="mb-2.5 text-[12px] leading-relaxed text-ink-3">
            Sold out and drawn. Claim your proceeds — 90% of the take, after the
            10% platform fee.
          </p>
          <Button variant="primary" size="md" fullWidth disabled={busy} onClick={() => void r.claimProceeds()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wallet className="h-4 w-4" aria-hidden="true" />}
            Claim {money.native(creatorTake)}
          </Button>
        </>
      ) : null}

      {canReclaim ? (
        <>
          <p className="mb-2.5 text-[12px] leading-relaxed text-ink-3">
            It didn&rsquo;t sell out, so buyers are refunding. Take your NFT back
            out of escrow.
          </p>
          <Button variant="secondary" size="md" fullWidth disabled={busy} onClick={() => void r.reclaimNft()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PackageOpen className="h-4 w-4" aria-hidden="true" />}
            Reclaim NFT
          </Button>
        </>
      ) : null}

      {r.phase === "error" && r.error ? <p className="mt-2 text-[12px] text-[#c0564f]">{r.error}</p> : null}
    </div>
  );
}
