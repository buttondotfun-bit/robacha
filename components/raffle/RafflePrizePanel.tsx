"use client";

import Image from "next/image";
import { ArrowUpRight, Layers, ShieldCheck } from "lucide-react";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useRaffleConfig } from "@/lib/raffle-context";

/**
 * The prize presentation, for whichever raffle the surrounding context names.
 * The prize is the hero, framed in a soft white surface, with the collection's
 * facts and — stated honestly — how the prize and the money are actually
 * custodied.
 *
 * The important honesty: the raffle contract holds the *ticket money* on
 * Robinhood Chain, but the NFT lives on Ethereum and is delivered to the winner
 * by the team after the draw. This panel says exactly that rather than implying
 * the NFT sits in on-chain escrow, which it does not.
 */
export function RafflePrizePanel() {
  const { prize, stats: prizeStats, links, address, deliveryNote, shortName } = useRaffleConfig();
  const raffleContractLink = address ? explorerUrl("address", address) : null;

  // Only the facts that are genuinely set — a null (e.g. live floor/volume) is
  // dropped rather than rendered as an empty or invented cell.
  const stats: { label: string; value: string }[] = [
    { label: "Supply", value: prizeStats.supply },
    { label: "Floor", value: prizeStats.floor },
    { label: "Owners", value: prizeStats.owners },
    { label: "Volume", value: prizeStats.totalVolume },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value));

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
            src={prize.image}
            alt={prize.tokenId ? `${prize.name}, the raffle prize` : `The official ${prize.collection} collection mark`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 430px"
            className="object-cover"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.6)] px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            {prize.tokenId ? `The exact prize · ${prize.name}` : "Winning token shown at draw"}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <p className="text-[20px] font-semibold tracking-[-0.02em]">{prize.name}</p>
        <span className="glass-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-2">
          {prize.collection} · {prize.chain}
        </span>
      </div>

      {/* Collection facts — only what's genuinely fixed is quoted; live figures
          are linked (or dated), never invented. */}
      {stats.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3 text-[13px]">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
        </dl>
      ) : null}
      {prizeStats.asOf ? (
        <p className="mt-2 text-[10.5px] text-ink-3">
          Collection stats as of {prizeStats.asOf}, via OpenSea — tap through for live figures.
        </p>
      ) : (
        <a
          href={links.opensea}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-ink-3 hover:text-ink-2"
        >
          Live floor, volume and owners on OpenSea
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      )}

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
                  {address ? shortAddress(address) : ""} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
            </>
          }
        />
        <Row
          icon={<Layers className="h-3.5 w-3.5" aria-hidden="true" />}
          title={`${shortName} delivered cross-chain`}
          body={deliveryNote}
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
