"use client";

import Link from "next/link";
import { Coins, Plus, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { HubRaffleState } from "@/lib/abi/robacha-raffle-hub";
import { useHubRaffles, useHubStatus } from "@/lib/use-raffle-hub";
import { RaffleCard } from "./RaffleCard";
import { LaunchpadUnavailable } from "./LaunchpadUnavailable";

/**
 * The launchpad: browse every raffle the hub holds, and start your own.
 *
 * The list is the hub's own record, newest first. Before the hub is deployed
 * the page shows its "opens soon" state; once it's live but empty it invites
 * the first listing rather than faking one.
 */
export function LaunchpadClient() {
  const { configured, listingsPaused, feeBps } = useHubStatus();
  const { raffles, isLoading } = useHubRaffles();

  const live = raffles.filter((r) => r.state === HubRaffleState.Open);
  const settled = raffles.filter((r) => r.state !== HubRaffleState.Open);
  const feePct = (feeBps / 100).toFixed(feeBps % 100 === 0 ? 0 : 1);

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      {/* Hero */}
      <Reveal className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-6 sm:p-8">
        <span className="noise-overlay" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[52ch]">
            <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> NFT Raffle Launchpad
            </span>
            <h1 className="text-display mt-4">Raffle your NFT.</h1>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
              Escrow one of your Robinhood Chain NFTs, set the ticket price and the
              cap, and launch. Sell out and you keep 90% of the take — the winner
              is drawn on chain and the NFT is released to them automatically. If
              it doesn&rsquo;t sell out, every ticket refunds in full and your NFT
              comes back. The platform takes {feePct}% only on a sellout.
            </p>
            {configured && !listingsPaused ? (
              <ButtonLink href="/launchpad/create" variant="primary" size="lg" className="mt-6">
                <Plus className="h-4 w-4" aria-hidden="true" /> Create a raffle
              </ButtonLink>
            ) : null}
          </div>

          <ul className="grid gap-2.5 text-[12.5px]">
            <Perk icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>Contract escrows the NFT &amp; the money</Perk>
            <Perk icon={<Ticket className="h-4 w-4" aria-hidden="true" />}>Winner drawn from StonkPit entropy</Perk>
            <Perk icon={<Coins className="h-4 w-4" aria-hidden="true" />}>Full refunds if it doesn&rsquo;t sell out</Perk>
          </ul>
        </div>
      </Reveal>

      {/* Body */}
      {!configured ? (
        <div className="mt-6">
          <LaunchpadUnavailable />
        </div>
      ) : listingsPaused && raffles.length === 0 ? (
        <div className="mt-6 glass-card rounded-[20px] p-8 text-center text-[13px] text-ink-3">
          New listings are paused right now. Check back soon.
        </div>
      ) : raffles.length === 0 ? (
        <div className="mt-6 glass-card rounded-[24px] p-10 text-center">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">No raffles yet</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-[13px] text-ink-2">
            Be the first to list. Escrow an NFT, set your terms, and open tickets in a minute.
          </p>
          <ButtonLink href="/launchpad/create" variant="primary" size="lg" className="mt-5">
            <Plus className="h-4 w-4" aria-hidden="true" /> Create the first raffle
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {live.length > 0 ? (
            <Section title="Live now" count={live.length}>
              {live.map((r) => <RaffleCard key={r.id} raffle={r} />)}
            </Section>
          ) : null}
          {settled.length > 0 ? (
            <Section title="Ended" count={settled.length}>
              {settled.map((r) => <RaffleCard key={r.id} raffle={r} />)}
            </Section>
          ) : null}
          {isLoading && raffles.length === 0 ? <p className="text-[13px] text-ink-3">Loading raffles…</p> : null}
        </div>
      )}
    </PageContainer>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h2>
        <span className="num text-[12px] text-ink-3">{count}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Perk({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-2 text-ink-2">
      <span className="text-accent-ink">{icon}</span>
      {children}
    </li>
  );
}
