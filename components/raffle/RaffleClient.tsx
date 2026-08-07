import { ArrowUpRight, Check, Lock, RefreshCcw, Ticket } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { RAFFLE_OUTCOMES, RAFFLE_PRIZE, RAFFLE_RULES } from "@/data/raffle";

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
            <span className="glass-chip inline-flex h-8 w-fit items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
              <Ticket className="h-3 w-3" aria-hidden="true" />
              Raffle · opening soon
            </span>

            <h1 className="text-display mt-4">
              Win a Meebit.
            </h1>

            <p className="mt-4 max-w-[48ch] text-[14px] leading-relaxed text-ink-2">
              200 tickets, $10 each, 24 hours. Sell out and one wallet takes
              home a Meebit — one of 20,000 voxel characters on Ethereum. Don&rsquo;t
              sell out, and every ticket is refunded in full.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* No pay button: there is nothing to pay into yet, and a live
                  till without a contract is the exact thing this page refuses
                  to be. */}
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.08)] px-5 py-3 text-[14px] font-semibold text-ink-3">
                <Lock className="h-4 w-4" aria-hidden="true" />
                Tickets open soon
              </span>
              <ButtonLink href={x.href} external variant="secondary" size="lg">
                <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Follow for the drop
              </ButtonLink>
            </div>
          </div>

          {/* Prize card. Represents the prize honestly — the collection, on the
              chain it lives on, with a link to see real Meebits — without
              putting a specific token here that is not the one that will be
              raffled. */}
          <div
            data-rarity="grail"
            className="glass-card relative flex flex-col gap-4 overflow-hidden rounded-[24px] p-6"
          >
            <div
              aria-hidden="true"
              className="rarity-breathe pointer-events-none absolute left-1/2 top-1/3 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[8px]"
              style={{
                background:
                  "radial-gradient(circle, rgb(var(--rarity-glow) / 0.3) 0%, transparent 68%)",
              }}
            />
            <p className="micro relative">The prize</p>
            <p className="relative text-[28px] font-semibold leading-none tracking-[-0.03em]">
              {RAFFLE_PRIZE.name}
            </p>
            <dl className="relative grid grid-cols-2 gap-3 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4 text-[13px]">
              <div>
                <dt className="micro">Collection</dt>
                <dd className="mt-0.5 font-medium text-ink">{RAFFLE_PRIZE.collection}</dd>
              </div>
              <div>
                <dt className="micro">Chain</dt>
                <dd className="mt-0.5 font-medium text-ink">{RAFFLE_PRIZE.chain}</dd>
              </div>
              <div>
                <dt className="micro">Supply</dt>
                <dd className="num mt-0.5 font-medium text-ink">{RAFFLE_PRIZE.supply}</dd>
              </div>
              <div>
                <dt className="micro">Floor (ref.)</dt>
                <dd className="num mt-0.5 font-medium text-ink">{RAFFLE_PRIZE.floorReference}</dd>
              </div>
            </dl>
            <a
              href={RAFFLE_PRIZE.openseaUrl}
              target="_blank"
              rel="noreferrer"
              className="relative inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink underline decoration-dotted underline-offset-2"
            >
              See Meebits on OpenSea
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
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

        {/* The honest part, stated rather than hidden: the prize is cross-chain,
            so its delivery is by hand, and the buying mechanism is not live. */}
        <p className="relative mt-5 text-[11.5px] leading-relaxed text-ink-3">
          The Meebit is an Ethereum NFT and ROBACHA runs on Robinhood Chain, so
          the prize is sent to the winner by hand across chains. Tickets are not
          on sale yet — how they are bought, drawn and refunded is published
          before the raffle opens, the same way every pool&rsquo;s odds are.
        </p>
      </Reveal>
    </PageContainer>
  );
}
