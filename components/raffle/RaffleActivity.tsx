"use client";

import { ExternalLink, Ticket } from "lucide-react";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useRaffle } from "@/lib/use-raffle";
import { useRaffleActivity } from "@/lib/use-raffle-activity";

/**
 * Recent ticket buys, each a real on-chain purchase read from the contract's
 * logs. Renders nothing until a raffle is deployed and someone has entered —
 * an empty feed is not shown as "no activity", it is simply absent, so the
 * page never displays a section that could only ever be empty.
 */
export function RaffleActivity({ className }: { className?: string }) {
  const raffle = useRaffle();
  const { buys } = useRaffleActivity(8);

  if (!raffle.configured || buys.length === 0) return null;

  return (
    <section className={className} aria-label="Recent ticket buys">
      <div className="mb-3 flex items-center gap-2">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
        <h2 className="text-[14px] font-semibold tracking-[-0.02em]">Recent entries</h2>
      </div>

      <ul className="space-y-2">
        {buys.map((b) => {
          const link = explorerUrl("tx", b.txHash);
          return (
            <li
              key={b.txHash}
              className="glass-card flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5"
            >
              <span className="flex items-center gap-2 text-[12.5px]">
                <Ticket className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                <span className="num text-ink">{shortAddress(b.buyer)}</span>
                <span className="text-ink-3">
                  bought {b.quantity} {b.quantity === 1 ? "ticket" : "tickets"}
                </span>
              </span>
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-ink-3 hover:text-ink-2"
                  aria-label="View on the explorer"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
