"use client";

import { ArrowRight, Boxes, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/primitives";
import { MACHINES, type Machine } from "@/data/machines";
import { useLiveRound } from "@/lib/use-live-round";
import { usePool } from "@/lib/use-pool";
import { cn } from "@/lib/utils";

/**
 * The machine directory. Machines are Robacha's first-class product objects;
 * the Genesis Machine shows live pool state read from chain, and coming-soon
 * machines say so honestly (status comes from real config, not marketing).
 */
export function MachinesClient() {
  return (
    <PageContainer width="wide" className="pb-16 pt-8">
      <p className="micro">Machines</p>
      <h1 className="text-page-title mt-2.5 max-w-[22ch]">
        One machine, more ways to discover.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
        A Robacha machine takes a spin and returns a reward from a transparent
        pool. The Genesis Machine is live now; more are on the way.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {MACHINES.map((m) => (
          <MachineCard key={m.slug} machine={m} />
        ))}
      </div>
    </PageContainer>
  );
}

function MachineCard({ machine }: { machine: Machine }) {
  const live = machine.status === "live";
  return (
    <Link
      href={`/machines/${machine.slug}`}
      className="glass-card group flex flex-col rounded-[22px] p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
          {machine.type === "nft" ? <Boxes className="h-5 w-5" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
            live ? "bg-[rgba(142,197,0,0.16)] text-[#3f7d17]" : "bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3",
          )}
        >
          {live ? <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> : null}
          {live ? "Live" : "Coming soon"}
        </span>
      </div>

      <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">{machine.name}</h2>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-2">{machine.tagline}</p>

      {live ? <GenesisLive /> : null}

      <div className="mt-4 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2 group-hover:text-ink">
        {live ? "Open the machine" : "Learn more"}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}

/** Live badges for the Genesis Machine, read from the pool contract. */
function GenesisLive() {
  const { pool } = usePool();
  const round = useLiveRound();
  if (!pool) return null;
  const assets = new Set(pool.entries.map((e) => e.token.toLowerCase())).size;
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3 text-[11.5px] text-ink-3">
      <span className="num">{assets} assets</span>
      <span aria-hidden="true">·</span>
      <span className="num">{pool.name || `Pool #${pool.poolId}`}</span>
      {round.status === "open" ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="num text-ink-2">Round open</span>
        </>
      ) : null}
    </div>
  );
}
