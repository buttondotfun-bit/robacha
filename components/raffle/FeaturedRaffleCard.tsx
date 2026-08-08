"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, ShieldCheck } from "lucide-react";
import { RaffleProgress } from "./RaffleProgress";
import { contracts, explorerUrl } from "@/lib/config";
import { RAFFLE_PRIZE, RAFFLE_PRIZE_LINKS } from "@/data/raffle";
import { RaffleState, type RaffleView } from "@/lib/use-raffle";
import { useMoney } from "@/lib/use-money";
import { useSecondsTick } from "@/lib/use-tick";

/**
 * The market's featured raffle — the platform's own Chimpers draw, rendered as
 * the page centerpiece. Every figure (price, caps, sold count, remaining time,
 * winner, status) is read from the RobachaRaffle contract via `useRaffle`; the
 * collection, chain and links come from the configured prize. Nothing is
 * hardcoded that the contract answers for.
 *
 * Honesty note: this raffle's NFT lives on Ethereum and is delivered by hand,
 * so this card claims only what its contract enforces — the money, the draw and
 * the refunds — and never that the contract custodies the Chimper.
 */
export function FeaturedRaffleCard({ raffle }: { raffle: RaffleView }) {
  const money = useMoney();
  const now = useSecondsTick();

  if (!raffle.configured) return null;

  const cap = raffle.cap ?? 0;
  const sold = raffle.ticketsSold ?? 0;
  const remaining = Math.max(0, cap - sold);
  const pct = cap > 0 ? Math.min(100, (sold / cap) * 100) : 0;
  const msLeft = raffle.closesAt !== null ? raffle.closesAt * 1000 - now : 0;
  const live = raffle.state === RaffleState.Open && msLeft > 0;

  const priceLabel = raffle.priceWei
    ? (money.hasPrice ? money.usd(raffle.priceWei) : null) ?? money.native(raffle.priceWei)
    : "—";

  const status = statusOf(raffle.state, msLeft, now, raffle);
  const raffleContractLink = contracts.raffle ? explorerUrl("address", contracts.raffle) : null;

  return (
    <div
      data-rarity="grail"
      className="glass-panel glass-reflection relative overflow-hidden rounded-[28px]"
    >
      <span className="noise-overlay" aria-hidden="true" />
      <div className="relative grid gap-0 lg:grid-cols-[minmax(0,0.42fr)_1fr]">
        {/* Artwork */}
        <div className="group relative aspect-square w-full overflow-hidden lg:aspect-auto lg:min-h-[340px]">
          <Image
            src={RAFFLE_PRIZE.image}
            alt="Chimper #2272, the raffle prize"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 440px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[10.5px] font-semibold text-ink shadow-sm backdrop-blur-sm">
            Featured
          </span>
          {live ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(20,20,20,0.6)] px-2.5 py-1 text-[10.5px] font-semibold text-white backdrop-blur-sm">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#a6e22e]" aria-hidden="true" />
              LIVE · {status.countdown}
            </span>
          ) : null}
        </div>

        {/* Details */}
        <div className="flex flex-col p-5 sm:p-7">
          <p className="micro text-ink-3">Featured raffle</p>
          <h2 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">
            Win a Chimper
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-2">
            {cap > 0 ? `${cap} tickets` : "—"} · {priceLabel} each ·{" "}
            <span className="text-ink-3">{RAFFLE_PRIZE.collection} on {RAFFLE_PRIZE.chain}</span>
          </p>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[14px] font-semibold tracking-[-0.01em]">
                <span className="num">{sold}</span>
                <span className="text-ink-3"> / {cap} tickets sold</span>
              </span>
              <span className="num text-[12px] text-ink-3">{pct.toFixed(pct < 10 ? 1 : 0)}% filled</span>
            </div>
            <RaffleProgress value={sold} max={cap} className="mt-2" />
            <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3">
              <span>{status.footnote}</span>
              {live ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" /> {status.countdown} remaining
                </span>
              ) : null}
            </div>
          </div>

          {/* Stat row */}
          <dl className="mt-5 grid grid-cols-4 gap-3 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
            <Stat label="Ticket">{priceLabel}</Stat>
            <Stat label="Remaining">{cap > 0 ? remaining : "—"}</Stat>
            <Stat label="Max / wallet">{raffle.maxPerWallet ?? "—"}</Stat>
            <Stat label="Winner">1</Stat>
          </dl>

          {/* Reassurance — true of this contract: funds escrow + refunds. */}
          <p className="mt-4 rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.03)] px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2">
            {cap > 0 ? (
              <>If all {cap} tickets sell, one wallet wins Chimper #2272. If it doesn&rsquo;t sell out, every ticket is refunded in full.</>
            ) : (
              <>Sell out and one wallet wins; otherwise every ticket is refunded in full.</>
            )}
          </p>

          {/* CTA + secondary links */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/raffle/chimpers"
              className="btn-cta group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96)_0%,rgba(204,255,0,0.98)_46%,rgba(186,232,0,0.98)_100%)] text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5"
            >
              {live ? "Enter the raffle" : "View the raffle"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-3 text-[11.5px] text-ink-3">
              <a href={RAFFLE_PRIZE_LINKS.opensea} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink-2">
                OpenSea <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </a>
              {raffleContractLink ? (
                <a href={raffleContractLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink-2">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Contract
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="micro text-ink-3">{label}</dt>
      <dd className="num mt-0.5 text-[15px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

function statusOf(
  state: number | null,
  msLeft: number,
  _now: number,
  raffle: RaffleView,
): { countdown: string; footnote: string } {
  const countdown = fmt(msLeft);
  if (state === RaffleState.Open && msLeft > 0) {
    return { countdown, footnote: "Live now" };
  }
  if (state === RaffleState.AwaitingDraw) return { countdown: "", footnote: "Sold out — drawing the winner" };
  if (state === RaffleState.Complete && raffle.winner) return { countdown: "", footnote: "Winner drawn" };
  if (state === RaffleState.Refundable) return { countdown: "", footnote: "Refunds open" };
  return { countdown: "", footnote: "Opening soon" };
}

function fmt(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
