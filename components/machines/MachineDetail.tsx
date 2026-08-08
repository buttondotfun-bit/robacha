"use client";

import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { type Machine } from "@/data/machines";
import { useLiveRound } from "@/lib/use-live-round";
import { usePool } from "@/lib/use-pool";
import { cn } from "@/lib/utils";

/**
 * A machine's detail page. Live machines surface real pool/round state; a
 * coming-soon machine is honest about it and links to its teaser. No fabricated
 * activity.
 */
export function MachineDetail({ machine }: { machine: Machine }) {
  const live = machine.status === "live";
  return (
    <PageContainer width="wide" className="pb-16 pt-8">
      <nav className="mb-4 text-[12px] text-ink-3" aria-label="Breadcrumb">
        <Link href="/machines" className="hover:text-ink-2">Machines</Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <span className="text-ink-2">{machine.name}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-page-title">{machine.name}</h1>
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
      <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
        {machine.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {live ? (
          <ButtonLink href={machine.href} variant="primary" size="lg">
            Open the machine <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        ) : (
          <ButtonLink href={machine.href} variant="secondary" size="lg">
            See what&rsquo;s coming <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        )}
      </div>

      {/* Facts */}
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Reward type" value={machine.rewardType} />
        <Fact label="Type" value={machine.type === "nft" ? "NFT machine" : "Token machine"} />
        <Fact label="Network" value="Robinhood Chain" />
        <Fact label="Status" value={live ? "Live" : "Coming soon"} />
      </div>

      {live && machine.poolSlug ? <GenesisLivePanel poolSlug={machine.poolSlug} /> : null}

      {/* How it works + transparency */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-[18px] p-5">
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">How it works</h2>
          <ul className="mt-3 space-y-2 text-[13px] text-ink-2">
            {[
              "Pick how many spins you want.",
              "Your spins enter the next round.",
              "A transparent pool draws each reward.",
              "Claim your pull through your wallet.",
            ].map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
          <Link href="/how-it-works" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-ink-2 hover:text-ink">
            Read how Robacha works <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="glass-card rounded-[18px] p-5">
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">Transparency</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            Every pool, its odds and every round are published from the contract.
          </p>
          <ul className="mt-3 space-y-1.5 text-[12.5px]">
            {machine.poolSlug ? (
              <li><TLink href={`/pools/${machine.poolSlug}`}>View the reward pool</TLink></li>
            ) : null}
            <li><TLink href="/verify">Verify a round</TLink></li>
            <li><TLink href="/docs">Contracts &amp; docs</TLink></li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}

function GenesisLivePanel({ poolSlug }: { poolSlug: string }) {
  const { pool } = usePool();
  const round = useLiveRound();
  if (!pool) return null;
  const assets = new Set(pool.entries.map((e) => e.token.toLowerCase())).size;
  return (
    <div className="mt-6 rounded-[18px] border border-[rgba(142,197,0,0.3)] bg-[rgba(142,197,0,0.05)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="micro text-ink-3">Live pool</p>
          <p className="mt-1 text-[15px] font-semibold">{pool.name || `Pool #${pool.poolId}`}</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="num text-[18px] font-semibold">{assets}</p>
            <p className="micro text-ink-3">assets</p>
          </div>
          <div>
            <p className="num text-[18px] font-semibold text-accent-ink">
              {round.status === "open" ? "Open" : round.status === "closing" ? "Closing" : "—"}
            </p>
            <p className="micro text-ink-3">round</p>
          </div>
        </div>
      </div>
      <Link href={`/pools/${poolSlug}`} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
        Open the pool <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3">
      <p className="micro text-ink-3">{label}</p>
      <p className="num mt-1.5 text-[13px] font-semibold text-ink">{value}</p>
    </div>
  );
}

function TLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">
      {children}
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}
