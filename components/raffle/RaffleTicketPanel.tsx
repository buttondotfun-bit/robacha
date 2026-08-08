"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  Dice5,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCcw,
  Ticket,
  Trophy,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/primitives";
import { RaffleProgress } from "./RaffleProgress";
import { shortAddress } from "@/lib/formatters";
import { useMoney } from "@/lib/use-money";
import { useRaffle, RaffleState } from "@/lib/use-raffle";
import { useRaffleConfig } from "@/lib/raffle-context";
import { useSecondsTick } from "@/lib/use-tick";
import { useWallet } from "@/lib/use-wallet";

/**
 * A raffle's entry module, for whichever raffle the context names. Every number
 * — sold count, price, caps, the caller's own entries and allowance, the total
 * owed — is read from the raffle contract, and each of the contract's states
 * gets its own face. It never shows a total, an allowance or an "entered" count
 * the chain wouldn't confirm, and it never lets a wallet pick more tickets than
 * the contract will accept.
 */

/** "the Meebit" → "The Meebit" for use at the start of a sentence. */
function capitalize(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
function fmtCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function RaffleTicketPanel({ fallback }: { fallback: React.ReactNode }) {
  const raffle = useRaffle();
  const { prizePhrase } = useRaffleConfig();
  const wallet = useWallet();
  const money = useMoney();
  const now = useSecondsTick();
  const [qty, setQty] = useState(1);

  if (!raffle.configured) return <>{fallback}</>;

  const { state, ticketsSold, cap, maxPerWallet, priceWei, winner, myTickets, myPaidWei, myRefunded, phase } = raffle;

  const sold = ticketsSold ?? 0;
  const total = cap ?? 200;
  const perWallet = maxPerWallet ?? 25;
  const remaining = Math.max(0, total - sold);
  const perWalletLeft = Math.max(0, perWallet - myTickets);
  const buyMax = Math.max(0, Math.min(perWalletLeft, remaining));
  const chosen = Math.min(Math.max(1, qty), Math.max(1, buyMax));
  const costWei = priceWei ? priceWei * BigInt(chosen) : 0n;
  const busy = phase === "buying" || phase === "refunding";

  const msLeft = raffle.closesAt !== null ? raffle.closesAt * 1000 - now : null;
  const showClock = state === RaffleState.Open && msLeft !== null && msLeft > 0;
  // The window has run out but the contract still reports Open because nobody
  // has opened refunds yet. Since it didn't sell out (a sell-out flips it to
  // AwaitingDraw), buying is closed and the only move is the permissionless
  // markRefundable — which anyone, including a buyer, can send.
  const windowElapsed = state === RaffleState.Open && msLeft !== null && msLeft <= 0;

  const iAmWinner = winner && wallet.address?.toLowerCase() === winner.toLowerCase();
  const insufficient =
    wallet.isConnected && !wallet.wrongNetwork && wallet.balanceWei !== null && wallet.balanceWei < costWei;

  const quickPicks = [1, 5, 10, perWallet].filter((n, i, a) => n <= buyMax && a.indexOf(n) === i);

  return (
    <div className="glass-card rounded-[20px] p-5">
      {/* Sold count + remaining */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.02em]">
          <Ticket className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          Tickets sold
        </span>
        <span className="num text-[13px] font-semibold">
          {sold} <span className="text-ink-3">/ {total}</span>
        </span>
      </div>
      <RaffleProgress value={sold} max={total} className="mt-2.5" />
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3">
        <span className="num">{total > 0 ? ((sold / total) * 100).toFixed(sold / total < 0.1 ? 1 : 0) : 0}% filled</span>
        {showClock ? (
          <span className="num inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3" aria-hidden="true" /> {fmtCountdown(msLeft!)} remaining
          </span>
        ) : (
          <span className="num">{remaining} remaining</span>
        )}
      </div>

      {/* ---- Complete ---- */}
      {state === RaffleState.Complete && winner ? (
        <div className={`mt-4 rounded-[16px] p-4 ${iAmWinner ? "bg-[rgba(204,255,0,0.16)]" : "bg-[rgb(var(--ink-rgb)_/_0.04)]"}`}>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            <p className="text-[13px] font-semibold">{iAmWinner ? "You won." : "Winner drawn"}</p>
          </div>
          <p className="num mt-1.5 text-[13px] text-ink">{shortAddress(winner)}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
            Drawn on chain from StonkPit entropy. {capitalize(prizePhrase)} is
            delivered to the winner on Ethereum by the team.
          </p>
          {iAmWinner ? (
            <p className="mt-2 text-[12px] font-semibold text-accent-ink">Congratulations — you&rsquo;ll be contacted for delivery.</p>
          ) : null}
        </div>
      ) : null}

      {/* ---- AwaitingDraw (sold out) ---- */}
      {state === RaffleState.AwaitingDraw ? (
        <div className="mt-4 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4">
          <p className="text-[13px] font-semibold">Raffle sold out</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-ink-2">
            <Dice5 className="h-3.5 w-3.5" aria-hidden="true" /> Draw pending — the winner is drawn from StonkPit entropy.
          </p>
        </div>
      ) : null}

      {/* ---- Refundable ---- */}
      {state === RaffleState.Refundable ? (
        <div className="mt-4 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-ink-2" aria-hidden="true" />
            <p className="text-[13px] font-semibold">Raffle closed — refunds open</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
            It didn&rsquo;t reach sell-out in time, so every ticket is refunded in
            full. Anyone can withdraw theirs — no permission needed.
          </p>
          {myPaidWei > 0n && !myRefunded ? (
            <Button variant="primary" size="lg" fullWidth className="mt-3" disabled={busy} onClick={() => void raffle.refund()}>
              {phase === "refunding" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Claim refund · {money.native(myPaidWei)}
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

      {/* ---- Closed unsold, refunds not yet opened ---- */}
      {windowElapsed ? (
        <div className="mt-4 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-4">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-ink-2" aria-hidden="true" />
            <p className="text-[13px] font-semibold">Window closed — didn&rsquo;t sell out</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
            The 24 hours are up and it didn&rsquo;t reach 200, so no draw happens
            and every ticket is refundable in full. Open refunds below — anyone
            can, it needs no permission — then each buyer withdraws theirs.
          </p>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-3"
            disabled={busy}
            onClick={() => void raffle.openRefunds()}
          >
            {phase === "opening" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Open refunds
          </Button>
        </div>
      ) : null}

      {/* ---- Open (buy) ---- */}
      {state === RaffleState.Open && !windowElapsed ? (
        <div className="mt-4">
          {/* Selector */}
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
              <span className="num text-[16px] font-semibold" aria-live="polite">{chosen}</span>
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

          {/* Quick picks */}
          {buyMax > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickPicks.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onClick={() => setQty(n)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    chosen === n
                      ? "bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]"
                      : "glass-chip text-ink-2 hover:text-ink"
                  }`}
                >
                  {n === perWallet ? `${n} max` : n}
                </button>
              ))}
            </div>
          ) : null}

          {/* Price breakdown */}
          {priceWei ? (
            <dl className="mt-3.5 space-y-1.5 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.03)] p-3.5 text-[12.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-ink-3">Ticket price</dt>
                <dd className="num text-ink">{money.native(priceWei)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-3">Quantity</dt>
                <dd className="num text-ink">×{chosen}</dd>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-[rgb(var(--line-rgb)_/_0.1)] pt-2">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="text-right">
                  <span className="num block font-semibold text-ink">{money.native(costWei)}</span>
                  {money.hasPrice ? <span className="num block text-[11px] text-ink-3">≈ {money.usd(costWei)}</span> : null}
                </dd>
              </div>
            </dl>
          ) : null}

          {/* CTA */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-3"
            disabled={busy || buyMax === 0 || insufficient}
            onClick={() => {
              if (!wallet.isConnected) return void wallet.connect();
              if (wallet.wrongNetwork) return void wallet.switchNetwork();
              void raffle.buy(chosen);
            }}
          >
            {phase === "buying" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Purchasing…
              </>
            ) : !wallet.isConnected ? (
              <>
                <Wallet className="h-4 w-4" aria-hidden="true" /> Connect wallet to enter
              </>
            ) : wallet.wrongNetwork ? (
              "Switch to Robinhood Chain"
            ) : buyMax === 0 ? (
              <>
                <Lock className="h-4 w-4" aria-hidden="true" />
                {perWalletLeft === 0 ? `${perWallet}-ticket limit reached` : "Sold out"}
              </>
            ) : insufficient ? (
              "Insufficient balance"
            ) : (
              <>
                <Ticket className="h-4 w-4" aria-hidden="true" /> Buy {chosen} {chosen === 1 ? "ticket" : "tickets"} · {money.native(costWei)}
              </>
            )}
          </Button>

          {/* Your entries + allowance + draw share */}
          {wallet.isConnected ? (
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.08)] p-3 text-center">
              <div>
                <p className="micro text-ink-3">Your entries</p>
                <p className="num mt-0.5 text-[15px] font-semibold">{myTickets}</p>
              </div>
              <div>
                <p className="micro text-ink-3">Allowance left</p>
                <p className="num mt-0.5 text-[15px] font-semibold">{perWalletLeft}</p>
              </div>
              <div>
                <p className="micro text-ink-3">Draw share</p>
                <p className="num mt-0.5 text-[15px] font-semibold">
                  {total > 0 ? `${(((myTickets + chosen) / total) * 100).toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            Draw share is your entries as a fraction of all {total} tickets if it
            sells out — the exact weight the on-chain draw gives you.
          </p>
        </div>
      ) : null}

      {phase === "error" && raffle.error ? (
        <ErrorState
          className="mt-3"
          title="Didn't go through"
          description={friendlyError(raffle.error)}
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

/** Turn a raw wallet/RPC message into something an ordinary buyer can read. */
function friendlyError(message: string): string {
  if (/rejected|denied/i.test(message)) return "You dismissed the transaction in your wallet.";
  if (/insufficient funds|exceeds balance/i.test(message)) return "Your wallet doesn't have enough ETH for this and gas.";
  if (/IncorrectPayment/i.test(message)) return "The price changed. Try again with the current price.";
  if (/SoldOutAlready/i.test(message)) return "Those tickets just sold out. Lower the quantity and retry.";
  if (/NotOpen/i.test(message)) return "The raffle just closed while you were buying.";
  return message;
}
