import Image from "next/image";
import { ArrowUpRight, Check, Globe, Lock, MessageCircle, RefreshCcw } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import {
  RAFFLE_OUTCOMES,
  RAFFLE_PRIZE,
  RAFFLE_PRIZE_LINKS,
  RAFFLE_PRIZE_STATS,
  RAFFLE_RULES,
} from "@/data/raffle";
import { RaffleTicketPanel } from "./RaffleTicketPanel";
import { RaffleStatusChip, RaffleDisclosure } from "./RaffleStatusChip";
import { RaffleActivity } from "./RaffleActivity";

/**
 * The Meebit raffle page.
 *
 * An announcement, not a till. Tickets are not on sale here — there is no
 * contract to hold the money, enforce the caps, or pay the refund it promises,
 * and collecting $10 a head into a wallet on trust is the one thing a platform
 * built on "verify, don't trust" must not do. So the page carries the prize,
 * the exact rules and the two outcomes in full, and the ticket control is an
 * honest "opens soon" that sends people to follow rather than to pay.
 *
 * The refund promise is set out as plainly as the prize, because until a
 * contract enforces it, it is the only assurance a buyer has, and hiding it
 * would be the tell of something that did not intend to keep it.
 */
export function RaffleClient() {
  const x = SOCIAL_LINKS[0];

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      {/* ---------------- Hero ---------------- */}
      <Reveal className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-6 sm:p-8">
        <span className="noise-overlay" aria-hidden="true" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <RaffleStatusChip />

            <h1 className="text-display mt-4">
              Win a Meebit.
            </h1>

            <p className="mt-4 max-w-[48ch] text-[14px] leading-relaxed text-ink-2">
              200 tickets, $10 each, 24 hours. Sell out and one wallet takes
              home a Meebit — one of 20,000 voxel characters on Ethereum. Don&rsquo;t
              sell out, and every ticket is refunded in full.
            </p>

            {/* The ticket surface. It reads the deployed contract and, until
                one exists, falls back to the announcement below — no live till
                without a contract behind it. */}
            <div className="mt-6">
              <RaffleTicketPanel
                fallback={
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)] px-5 py-3 text-[14px] font-semibold text-ink-3">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Tickets open soon
                    </span>
                    <ButtonLink href={x.href} external variant="secondary" size="lg">
                      <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      Follow for the drop
                    </ButtonLink>
                  </div>
                }
              />
            </div>
          </div>

          {/* Prize card. A representative Meebit and the collection's live-ish
              stats, each stat stamped with the date it was read and linked to
              OpenSea for the current number — a dated snapshot said to be one,
              not a stale figure passed off as current. */}
          <div
            data-rarity="grail"
            className="glass-card relative overflow-hidden rounded-[24px] p-5"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-[rgb(var(--edge-rgb)_/_0.8)]">
              <Image
                src={RAFFLE_PRIZE.image}
                alt="The official Meebits collection mark"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 460px"
                className="object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.6)] px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                Official Meebits — winning token shown at draw
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-2">
              <div>
                <p className="micro">The prize</p>
                <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">
                  {RAFFLE_PRIZE.name}
                </p>
              </div>
              <span className="glass-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-2">
                {RAFFLE_PRIZE.collection} · {RAFFLE_PRIZE.chain}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3 text-[13px]">
              <div>
                <dt className="micro">Floor</dt>
                <dd className="num mt-0.5 font-medium text-ink">{RAFFLE_PRIZE_STATS.floor}</dd>
              </div>
              <div>
                <dt className="micro">Total volume</dt>
                <dd className="num mt-0.5 font-medium text-ink">{RAFFLE_PRIZE_STATS.totalVolume}</dd>
              </div>
              <div>
                <dt className="micro">Owners</dt>
                <dd className="num mt-0.5 font-medium text-ink">{RAFFLE_PRIZE_STATS.owners}</dd>
              </div>
              <div>
                <dt className="micro">Supply</dt>
                <dd className="num mt-0.5 font-medium text-ink">{RAFFLE_PRIZE_STATS.supply}</dd>
              </div>
            </dl>

            <p className="mt-2.5 text-[10.5px] text-ink-3">
              Stats as of {RAFFLE_PRIZE_STATS.asOf}, via OpenSea — tap through for live figures.
            </p>

            {/* Official Meebits links, so a buyer can vet the collection at its
                own sources rather than ours. */}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3">
              <PrizeLink href={RAFFLE_PRIZE_LINKS.opensea} icon={<ArrowUpRight className="h-3 w-3" />}>
                OpenSea
              </PrizeLink>
              <PrizeLink href={RAFFLE_PRIZE_LINKS.website} icon={<Globe className="h-3 w-3" />}>
                meebits.app
              </PrizeLink>
              <PrizeLink href={RAFFLE_PRIZE_LINKS.x} icon={<XIcon className="h-3 w-3" />}>
                @MeebitsNFTs
              </PrizeLink>
              <PrizeLink href={RAFFLE_PRIZE_LINKS.discord} icon={<MessageCircle className="h-3 w-3" />}>
                Discord
              </PrizeLink>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------------- Rules ---------------- */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {RAFFLE_RULES.map((rule, i) => (
          <Reveal
            key={rule.label}
            delay={i * 60}
            className="glass-card rounded-[18px] p-4"
          >
            <p className="micro">{rule.label}</p>
            <p className="num mt-1.5 text-[20px] font-semibold tracking-[-0.02em]">
              {rule.value}
            </p>
            {rule.hint ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">{rule.hint}</p>
            ) : null}
          </Reveal>
        ))}
      </div>

      {/* ---------------- The two outcomes ---------------- */}
      <Reveal
        delay={80}
        className="glass-panel glass-reflection relative mt-4 overflow-hidden rounded-[28px] p-6 sm:p-8"
      >
        <span className="noise-overlay" aria-hidden="true" />
        <div className="relative grid gap-5 sm:grid-cols-2">
          <div className="rounded-[18px] bg-[rgba(204,255,0,0.1)] p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(163,204,0,0.25)]">
                <Check className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
              </span>
              <p className="text-[13px] font-semibold">If it sells out</p>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              {RAFFLE_OUTCOMES.soldOut}
            </p>
          </div>

          <div className="rounded-[18px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)]">
                <RefreshCcw className="h-3.5 w-3.5 text-ink-2" aria-hidden="true" />
              </span>
              <p className="text-[13px] font-semibold">If it doesn&rsquo;t</p>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              {RAFFLE_OUTCOMES.notSoldOut}
            </p>
          </div>
        </div>

        {/* The cross-chain / trust note, swapped for the live state. */}
        <RaffleDisclosure className="relative mt-5 text-[11.5px] leading-relaxed text-ink-3" />
      </Reveal>

      {/* Recent on-chain ticket buys. Renders only once a raffle is live and
          someone has entered. */}
      <RaffleActivity className="mt-4" />
    </PageContainer>
  );
}

function PrizeLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-ink-2 transition-colors hover:text-ink"
    >
      {icon}
      {children}
    </a>
  );
}
