"use client";

import { useState } from "react";
import { Check, Clock, Loader2, Lock, Minus, Plus, RefreshCcw, Ticket, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/primitives";
import { shortAddress } from "@/lib/formatters";
import { useMoney } from "@/lib/use-money";
import { useRaffle, RaffleState } from "@/lib/use-raffle";
import { useSecondsTick } from "@/lib/use-tick";
import { useWallet } from "@/lib/use-wallet";

/**
 * The live ticket surface. Everything it shows is read from the raffle
 * contract, so it degrades honestly: before a raffle is deployed there is no
 * address configured, and it falls back to the announcement the page already
 * carries rather than inventing a counter that can never move.
 *
 * The four contract states each get their own face — buying, sold out and
 * drawing, a winner, or refunds — because a raffle that promises "refunded in
 * full if it doesn't sell out" has to actually surface that button when the
 * time comes, not just say the words.
 */
/** "23h 45m 12s", counting the whole day down to the second near the end. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function RaffleTicketPanel({ fallback }: { fallback: React.ReactNode }) {
  const raffle = useRaffle();
  const wallet = useWallet();
  const money = useMoney();
  const now = useSecondsTick();
  const [qty, setQty] = useState(1);

  // No contract yet: the page's own "opens soon" announcement stands.
  if (!raffle.configured) return <>{fallback}</>;

  const {
    state,
    ticketsSold,
    cap,
    maxPerWallet,
    priceWei,
    winner,
    myTickets,
    myPaidWei,
    myRefunded,
    phase,
  } = raffle;

  const sold = ticketsSold ?? 0;
  const total = cap ?? 200;
  const percent = total > 0 ? Math.min(100, (sold / total) * 100) : 0;
  const perWalletLeft = Math.max(0, (maxPerWallet ?? 25) - myTickets);
  const roomLeft = Math.max(0, total - sold);
  const buyMax = Math.max(0, Math.min(perWalletLeft, roomLeft));
  const chosen = Math.min(qty, Math.max(1, buyMax));
  const costWei = priceWei ? priceWei * BigInt(chosen) : 0n;
  const busy = phase === "buying" || phase === "refunding";

  // Time left in the 24-hour window, from the contract's own closesAt.
  const msLeft = raffle.closesAt !== null ? raffle.closesAt * 1000 - now : null;
  const showClock = state === RaffleState.Open && msLeft !== null && msLeft > 0;

  return (
    <div className="glass-card rounded-[20px] p-5">
      {/* Live count — the one honest source of urgency: a real number toward a
          real cap, read from chain. */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.02em]">
          <Ticket className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          {sold} of {total} tickets sold
        </span>
        {priceWei ? (
          <span className="num text-[12px] text-ink-2">{money.format(priceWei)} each</span>
        ) : null}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)]">
        <div
          className="h-full rounded-full bg-[#8ec500] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* The 24-hour clock, straight from the contract's closesAt. */}
      {showClock ? (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.04)] py-1.5 text-[12px] text-ink-2">
          <Clock className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          <span className="num tabular-nums font-medium text-ink">{formatCountdown(msLeft!)}</span>
          <span className="text-ink-3">left to enter</span>
        </div>
      ) : null}

      {/* ---- Complete: a winner exists ---- */}
      {state === RaffleState.Complete && winner ? (
        <div className="mt-4 rounded-[16px] bg-[rgba(204,255,0,0.12)] p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            <p className="text-[13px] font-semibold">Winner drawn</p>
          </div>
          <p className="num mt-1.5 text-[13px] text-ink">{shortAddress(winner)}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
            Drawn on chain from StonkPit entropy. The Meebit is sent to this
            wallet on Ethereum by the team.
          </p>
          {wallet.address?.toLowerCase() === winner.toLowerCase() ? (
            <p className="mt-2 text-[12px] font-semibold text-accent-ink">
              That&rsquo;s you — congratulations.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ---- AwaitingDraw: sold out, waiting on the word ---- */}
      {state === RaffleState.AwaitingDraw ? (
        <div className="mt-4 flex items-center gap-2 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4 text-[12.5px] text-ink-2">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          Sold out — drawing the winner from StonkPit entropy.
        </div>
      ) : null}

      {/* ---- Refundable: take your money back ---- */}
      {state === RaffleState.Refundable ? (
        <div className="mt-4 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-ink-2" aria-hidden="true" />
            <p className="text-[13px] font-semibold">Refunds open</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
            It didn&rsquo;t sell out in time, so every ticket is refunded in
            full. Withdraw yours below — anyone can, no permission needed.
          </p>
          {myPaidWei > 0n && !myRefunded ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-3"
              disabled={busy}
              onClick={() => void raffle.refund()}
            >
              {phase === "refunding" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Withdraw {money.native(myPaidWei)}
            </Button>
          ) : myRefunded ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-ink">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Refunded
            </p>
          ) : (
            <p className="mt-3 text-[12px] text-ink-3">This wallet holds no tickets.</p>
          )}
        </div>
      ) : null}

      {/* ---- Open: buy tickets ---- */}
      {state === RaffleState.Open ? (
        <div className="mt-4">
          {myTickets > 0 ? (
            <p className="mb-3 text-[12px] text-ink-2">
              You hold <span className="font-semibold text-ink">{myTickets}</span>{" "}
              {myTickets === 1 ? "ticket" : "tickets"} · {perWalletLeft} more allowed
            </p>
          ) : null}

          {buyMax > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center justify-between rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] p-1">
                  <button
                    type="button"
                    aria-label="Fewer tickets"
                    disabled={busy || chosen <= 1}
                    onClick={() => setQty(Math.max(1, chosen - 1))}
                    className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-[rgb(var(--surface-rgb))] disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="num text-[16px] font-semibold">{chosen}</span>
                  <button
                    type="button"
                    aria-label="More tickets"
                    disabled={busy || chosen >= buyMax}
                    onClick={() => setQty(Math.min(buyMax, chosen + 1))}
                    className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-[rgb(var(--surface-rgb))] disabled:opacity-40"
                  >
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
                  void raffle.buy(chosen);
                }}
              >
                {phase === "buying" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : !wallet.isConnected ? (
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Ticket className="h-4 w-4" aria-hidden="true" />
                )}
                {!wallet.isConnected
                  ? "Connect to enter"
                  : wallet.wrongNetwork
                    ? "Switch network"
                    : `Buy ${chosen} · ${money.native(costWei)}`}
              </Button>
              {money.hasPrice && priceWei ? (
                <p className="mt-1.5 text-center text-[11px] text-ink-3">{money.usd(costWei)}</p>
              ) : null}
            </>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {perWalletLeft === 0 ? "You've reached the 25-ticket limit." : "Sold out."}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            If all {total} sell, one wallet is drawn. If not, every ticket is
            refunded in full — the contract holds the money, not us.
          </p>
        </div>
      ) : null}

      {phase === "error" && raffle.error ? (
        <ErrorState
          className="mt-3"
          title="Didn't go through"
          description={raffle.error}
          action={
            <Button size="sm" variant="secondary" onClick={raffle.reset}>
              Dismiss
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
