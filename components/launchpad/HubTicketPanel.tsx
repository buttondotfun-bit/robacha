"use client";

import { useState } from "react";
import { Check, Clock, Dice5, Loader2, Lock, Minus, Plus, RefreshCcw, Ticket, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/primitives";
import { shortAddress } from "@/lib/formatters";
import { HubRaffleState } from "@/lib/abi/robacha-raffle-hub";
import { useMoney } from "@/lib/use-money";
import { useHubRaffle } from "@/lib/use-raffle-hub";
import { useSecondsTick } from "@/lib/use-tick";
import { useWallet } from "@/lib/use-wallet";

/** "23h 45m 12s" down to the second near the end. */
function fmt(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * The live ticket surface for one launchpad raffle. Same discipline as the
 * curated raffle's panel — every state read from the contract — but the prize
 * is an on-chain NFT the contract itself delivers, so the winner (or anyone)
 * can claim it here rather than waiting on a manual handoff.
 */
export function HubTicketPanel({ id }: { id: number }) {
  const r = useHubRaffle(id);
  const wallet = useWallet();
  const money = useMoney();
  const now = useSecondsTick();
  const [qty, setQty] = useState(1);

  if (!r.configured || !r.raffle) {
    return (
      <div className="glass-card rounded-[20px] p-5 text-[13px] text-ink-3">
        Loading raffle…
      </div>
    );
  }

  const raffle = r.raffle;
  const { state, ticketsSold, ticketCap, maxPerWallet, ticketPriceWei, winner } = raffle;

  const percent = ticketCap > 0 ? Math.min(100, (ticketsSold / ticketCap) * 100) : 0;
  const perWalletLeft = Math.max(0, maxPerWallet - r.myTickets);
  const roomLeft = Math.max(0, ticketCap - ticketsSold);
  const buyMax = Math.max(0, Math.min(perWalletLeft, roomLeft));
  const chosen = Math.min(qty, Math.max(1, buyMax));
  const costWei = ticketPriceWei * BigInt(chosen);
  const busy = r.phase === "pending";

  const msLeft = raffle.closesAt * 1000 - now;
  const showClock = state === HubRaffleState.Open && msLeft > 0;
  const iAmWinner = winner && wallet.address?.toLowerCase() === winner.toLowerCase();

  return (
    <div className="glass-card rounded-[20px] p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.02em]">
          <Ticket className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          {ticketsSold} of {ticketCap} sold
        </span>
        <span className="num text-[12px] text-ink-2">{money.native(ticketPriceWei)} each</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)]">
        <div className="h-full rounded-full bg-[#8ec500] transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>

      {showClock ? (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.04)] py-1.5 text-[12px] text-ink-2">
          <Clock className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          <span className="num tabular-nums font-medium text-ink">{fmt(msLeft)}</span>
          <span className="text-ink-3">left to enter</span>
        </div>
      ) : null}

      {/* ---- Complete ---- */}
      {state === HubRaffleState.Complete && winner ? (
        <div className="mt-4 rounded-[16px] bg-[rgba(204,255,0,0.12)] p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            <p className="text-[13px] font-semibold">Winner drawn</p>
          </div>
          <p className="num mt-1.5 text-[13px] text-ink">{shortAddress(winner)}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
            Drawn on chain from StonkPit entropy. The NFT is released from escrow
            straight to the winner.
          </p>
          {iAmWinner ? <p className="mt-2 text-[12px] font-semibold text-accent-ink">That&rsquo;s you — congratulations.</p> : null}
          {!raffle.nftSettled ? (
            <Button variant="primary" size="lg" fullWidth className="mt-3" disabled={busy} onClick={() => void r.claimPrize()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trophy className="h-4 w-4" aria-hidden="true" />}
              {iAmWinner ? "Claim your NFT" : "Send NFT to winner"}
            </Button>
          ) : (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-ink">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> NFT delivered to the winner
            </p>
          )}
        </div>
      ) : null}

      {/* ---- AwaitingDraw ---- */}
      {state === HubRaffleState.AwaitingDraw ? (
        <div className="mt-4 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4">
          <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <Dice5 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sold out. The winner is drawn from StonkPit entropy — anyone can kick
            it off.
          </div>
          {raffle.drawRequestedAt === 0 ? (
            <Button variant="primary" size="lg" fullWidth className="mt-3" disabled={busy} onClick={() => void r.requestDraw()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Dice5 className="h-4 w-4" aria-hidden="true" />}
              Draw the winner
            </Button>
          ) : (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Drawing — waiting on the word.
            </p>
          )}
        </div>
      ) : null}

      {/* ---- Refundable ---- */}
      {state === HubRaffleState.Refundable ? (
        <div className="mt-4 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-ink-2" aria-hidden="true" />
            <p className="text-[13px] font-semibold">Refunds open</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
            It didn&rsquo;t sell out in time, so every ticket is refunded in full.
            Withdraw yours — anyone can, no permission needed.
          </p>
          {r.myPaidWei > 0n && !r.myRefunded ? (
            <Button variant="primary" size="lg" fullWidth className="mt-3" disabled={busy} onClick={() => void r.refund()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Withdraw {money.native(r.myPaidWei)}
            </Button>
          ) : r.myRefunded ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-ink">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Refunded
            </p>
          ) : (
            <p className="mt-3 text-[12px] text-ink-3">This wallet holds no tickets.</p>
          )}
        </div>
      ) : null}

      {/* ---- Cancelled ---- */}
      {state === HubRaffleState.Cancelled ? (
        <div className="mt-4 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4 text-[12.5px] text-ink-2">
          The creator cancelled this raffle before any ticket sold.
        </div>
      ) : null}

      {/* ---- Open ---- */}
      {state === HubRaffleState.Open ? (
        <div className="mt-4">
          {r.myTickets > 0 ? (
            <p className="mb-3 text-[12px] text-ink-2">
              You hold <span className="font-semibold text-ink">{r.myTickets}</span>{" "}
              {r.myTickets === 1 ? "ticket" : "tickets"} · {perWalletLeft} more allowed
            </p>
          ) : null}

          {buyMax > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center justify-between rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] p-1">
                  <button type="button" aria-label="Fewer tickets" disabled={busy || chosen <= 1} onClick={() => setQty(Math.max(1, chosen - 1))} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-[rgb(var(--surface-rgb))] disabled:opacity-40">
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="num text-[16px] font-semibold">{chosen}</span>
                  <button type="button" aria-label="More tickets" disabled={busy || chosen >= buyMax} onClick={() => setQty(Math.min(buyMax, chosen + 1))} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-[rgb(var(--surface-rgb))] disabled:opacity-40">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                className="mt-3"
                disabled={busy}
                onClick={() => {
                  if (!wallet.isConnected) return void wallet.connect();
                  if (wallet.wrongNetwork) return void wallet.switchNetwork();
                  void r.buy(chosen);
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : !wallet.isConnected ? <Wallet className="h-4 w-4" aria-hidden="true" /> : <Ticket className="h-4 w-4" aria-hidden="true" />}
                {!wallet.isConnected ? "Connect to enter" : wallet.wrongNetwork ? "Switch network" : `Buy ${chosen} · ${money.native(costWei)}`}
              </Button>
              {money.hasPrice ? <p className="mt-1.5 text-center text-[11px] text-ink-3">{money.usd(costWei)}</p> : null}
            </>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {perWalletLeft === 0 ? "You've reached this raffle's per-wallet limit." : "Sold out."}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            If all {ticketCap} sell, one wallet is drawn and gets the NFT. If not,
            every ticket is refunded in full — the contract holds the money, not us.
          </p>
        </div>
      ) : null}

      {r.phase === "error" && r.error ? (
        <ErrorState
          className="mt-3"
          title="Didn't go through"
          description={r.error}
          action={<Button size="sm" variant="secondary" onClick={r.reset}>Dismiss</Button>}
        />
      ) : null}
    </div>
  );
}
