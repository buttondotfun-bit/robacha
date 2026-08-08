import Image from "next/image";
import { ArrowUpRight, Layers, ShieldCheck } from "lucide-react";
import { contracts, explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { RAFFLE_PRIZE, RAFFLE_PRIZE_LINKS, RAFFLE_PRIZE_STATS } from "@/data/raffle";

/**
 * The prize presentation. The Meebit is the hero here, framed in a soft white
 * surface, with the collection's dated stats and — stated honestly — how the
 * prize and the money are actually custodied.
 *
 * The important honesty: this raffle's contract holds the *ticket money* on
 * Robinhood Chain, but the Meebit lives on Ethereum and is delivered to the
 * winner by the team after the draw. This panel says exactly that rather than
 * implying the NFT sits in on-chain escrow, which it does not.
 */
export function RafflePrizePanel() {
  const raffleContractLink = contracts.raffle ? explorerUrl("address", contracts.raffle) : null;

  return (
    <div className="glass-card rounded-[24px] p-4 sm:p-5">
      <p className="micro text-ink-3">The prize</p>

      {/* Artwork in a soft frame with a subtle pastel halo. */}
      <div className="relative mt-2.5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-[26px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(204,255,0,0.12),rgba(255,158,196,0.08)_60%,transparent_75%)]"
        />
        <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-white/60">
          <Image
            src={RAFFLE_PRIZE.image}
            alt="The official Meebits collection mark"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 430px"
            className="object-cover"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.6)] px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            Winning token shown at draw
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <p className="text-[20px] font-semibold tracking-[-0.02em]">{RAFFLE_PRIZE.name}</p>
        <span className="glass-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-2">
          {RAFFLE_PRIZE.collection} · {RAFFLE_PRIZE.chain}
        </span>
      </div>

      {/* Collection stats — a dated OpenSea snapshot, labelled as one. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3 text-[13px]">
        <Stat label="Floor" value={RAFFLE_PRIZE_STATS.floor} />
        <Stat label="Owners" value={RAFFLE_PRIZE_STATS.owners} />
        <Stat label="Volume" value={RAFFLE_PRIZE_STATS.totalVolume} />
        <Stat label="Supply" value={RAFFLE_PRIZE_STATS.supply} />
      </dl>
      <p className="mt-2 text-[10.5px] text-ink-3">
        Collection stats as of {RAFFLE_PRIZE_STATS.asOf}, via OpenSea — tap through for live figures.
      </p>

      {/* Prize status — the true custody mechanism. */}
      <div className="mt-3.5 space-y-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3.5">
        <p className="micro text-ink-3">Prize status</p>
        <Row
          icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
          title="Ticket money held on-chain"
          body={
            <>
              Escrowed by the raffle contract on Robinhood Chain — released only
              on a real draw, or refunded.{" "}
              {raffleContractLink ? (
                <a href={raffleContractLink} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-0.5 text-ink-2 hover:text-ink">
                  {contracts.raffle ? shortAddress(contracts.raffle) : ""} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
            </>
          }
        />
        <Row
          icon={<Layers className="h-3.5 w-3.5" aria-hidden="true" />}
          title="Meebit delivered cross-chain"
          body="The Meebit is an Ethereum NFT, so the winner receives it by hand from the team after the draw — the one step the contract can't perform itself."
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="micro">{label}</dt>
      <dd className="num mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

function Row({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3">{body}</p>
      </div>
    </div>
  );
}
