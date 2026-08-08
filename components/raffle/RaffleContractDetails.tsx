"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, Dice5 } from "lucide-react";
import { explorerUrl } from "@/lib/config";
import { useRaffleConfig } from "@/lib/raffle-context";
import { shortAddress } from "@/lib/formatters";
import { useRaffle, RaffleState } from "@/lib/use-raffle";
import { cn } from "@/lib/utils";

/**
 * On-chain transparency: the addresses, the caps and the settlement status, each
 * read from the deployed raffle (or the configured prize) and linked to its
 * explorer. Plus a verifiable-draw note — accurate because this raffle really
 * does draw from StonkPit's entropy, the same source the gacha uses.
 */
export function RaffleContractDetails({ className }: { className?: string }) {
  const raffle = useRaffle();
  const { prize, address } = useRaffleConfig();
  const [open, setOpen] = useState(false);

  const raffleLink = address ? explorerUrl("address", address) : null;
  const nftLink = `https://etherscan.io/address/${prize.contract}`;

  const settlement =
    raffle.state === RaffleState.Complete
      ? "Winner drawn"
      : raffle.state === RaffleState.AwaitingDraw
        ? "Sold out · drawing"
        : raffle.state === RaffleState.Refundable
          ? "Closed · refunds open"
          : raffle.state === RaffleState.Open
            ? "Live"
            : "—";

  const closesAt =
    raffle.closesAt !== null ? new Date(raffle.closesAt * 1000).toUTCString().replace("GMT", "UTC") : "—";

  return (
    <section className={className}>
      {/* Verifiable draw */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-[16px] p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">
            <Dice5 className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em]">Verifiable draw</p>
            <p className="mt-0.5 max-w-[60ch] text-[11.5px] leading-relaxed text-ink-2">
              The winner is drawn from StonkPit&rsquo;s on-chain entropy — the same
              randomness the gacha uses — so neither we nor the creator can pick it,
              and the result can be checked on chain after settlement.
            </p>
          </div>
        </div>
        {raffleLink ? (
          <a
            href={raffleLink}
            target="_blank"
            rel="noreferrer"
            className="glass-chip inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-medium text-ink-2 hover:text-ink"
          >
            Verify on the explorer <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {/* Expandable on-chain details */}
      <div className="mt-3 glass-card overflow-hidden rounded-[16px]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left"
        >
          <span className="text-[13px] font-semibold tracking-[-0.01em]">View on-chain details</span>
          <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        {open ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-[rgb(var(--line-rgb)_/_0.08)] px-4 py-4 text-[12.5px] sm:grid-cols-2">
            <DetailLink label="Raffle contract" value={address ? shortAddress(address) : "—"} href={raffleLink} />
            <DetailLink label="Prize NFT contract" value={shortAddress(prize.contract)} href={nftLink} />
            <Detail label="Token ID" value={prize.tokenId ? `#${prize.tokenId}` : "Revealed at draw"} />
            <Detail label="Ticket currency" value="ETH (Robinhood Chain)" />
            <Detail label="Total tickets" value={raffle.cap !== null ? String(raffle.cap) : "—"} />
            <Detail label="Max per wallet" value={raffle.maxPerWallet !== null ? String(raffle.maxPerWallet) : "—"} />
            <Detail label="Closes" value={closesAt} />
            <Detail label="Settlement status" value={settlement} />
          </dl>
        ) : null}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="num text-right text-ink">{value}</dd>
    </div>
  );
}

function DetailLink({ label, value, href }: { label: string; value: string; href: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="num text-right text-ink">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink-2">
            {value} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
