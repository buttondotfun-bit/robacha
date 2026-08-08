"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  RefreshCcw,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { Tabs } from "@/components/ui/Tabs";
import { CapsuleGlyph } from "@/components/nft/CapsuleGlyph";
import { RaffleCard } from "@/components/launchpad/RaffleCard";
import { FeaturedRaffleCard } from "./FeaturedRaffleCard";
import { RobContextLink } from "@/components/rob/RobContextLink";
import { HubRaffleState } from "@/lib/abi/robacha-raffle-hub";
import { useRaffleMarket } from "@/lib/use-raffle-market";
import { useSecondsTick } from "@/lib/use-tick";
import type { HubRaffle } from "@/lib/use-raffle-hub";
import { isDenylisted } from "@/data/collections";

/**
 * The raffle marketplace.
 *
 * A real product surface built from real state: the featured Meebit raffle
 * (its own contract) leads, a stats strip sums what the contracts actually
 * hold, and a filterable grid shows the community raffles on the hub — with an
 * honest empty state, never a fabricated card, when none exist yet. Every
 * figure traces back to a contract read via `useRaffleMarket`.
 */

type TabKey = "live" | "upcoming" | "ended";

export function RaffleGallery() {
  const { meebit, community, stats } = useRaffleMarket();
  const now = useSecondsTick();
  const [tab, setTab] = useState<TabKey>("live");

  // Denylisted collections are hidden from the grid — the chain still holds the
  // raffle, but Robacha's own UI won't surface a flagged one (a direct link to
  // its page still shows, hard-warned).
  const visible = useMemo(() => community.filter((r) => !isDenylisted(r.nft)), [community]);
  const buckets = useMemo(() => bucketize(visible, now), [visible, now]);
  const shown = buckets[tab];

  // Only surface stats the contracts can back; a zero is honest, but hide the
  // strip entirely before anything at all has happened.
  const showStats = stats.totalRaffles > 0 && (stats.ticketsSold > 0 || stats.liveRaffles > 0 || stats.nftsAwarded > 0);

  const tabOptions: { value: TabKey; label: string; count: number }[] = [
    { value: "live", label: "Live", count: buckets.live.length },
    { value: "upcoming", label: "Upcoming", count: buckets.upcoming.length },
    { value: "ended", label: "Ended", count: buckets.ended.length },
  ];

  return (
    <PageContainer width="wide" className="pb-16 pt-5">
      {/* ---------------- Hero (compact) ---------------- */}
      <Reveal>
        <p className="micro text-ink-3">Raffles</p>
        <h1 className="text-display mt-2">Win real things.</h1>
        <p className="mt-2.5 max-w-[52ch] text-[14px] leading-relaxed text-ink-2">
          Trustless NFT raffles on Robinhood Chain. Enter a live draw or launch
          one of your own.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <a
            href="#raffles"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb))] px-5 text-[13px] font-semibold text-[rgb(var(--surface-rgb))] transition-transform hover:-translate-y-0.5"
          >
            Explore raffles
          </a>
          <Link
            href="/launchpad"
            className="glass-chip inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Launch a raffle
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Reveal>

      {/* ---------------- Stats strip ---------------- */}
      {showStats ? (
        <Reveal delay={40} className="mt-6">
          <div className="glass-card grid grid-cols-3 divide-x divide-[rgb(var(--line-rgb)_/_0.08)] rounded-[18px]">
            <StatCell label="Live raffles" value={stats.liveRaffles} />
            <StatCell label="Tickets sold" value={stats.ticketsSold} />
            <StatCell label="NFTs awarded" value={stats.nftsAwarded} />
          </div>
        </Reveal>
      ) : null}

      {/* ---------------- Featured ---------------- */}
      <Reveal delay={60} className="mt-6">
        <FeaturedRaffleCard raffle={meebit} />
      </Reveal>

      {/* ---------------- Gallery ---------------- */}
      <section id="raffles" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Community raffles</h2>
          {/* Tabs only earn their place once there are community raffles to
              filter — an all-zero strip beside a live featured raffle reads as a
              contradiction, so it's hidden until the hub has entries. */}
          {community.length > 0 ? (
            <div className="hide-scrollbar max-w-full overflow-x-auto">
              <Tabs
                label="Filter raffles"
                options={tabOptions}
                value={tab}
                onChange={(v) => setTab(v as TabKey)}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          {community.length === 0 ? (
            <EmptyState />
          ) : shown.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((r) => (
                <RaffleCard key={r.id} raffle={r} />
              ))}
            </div>
          ) : (
            <p className="glass-card rounded-[16px] px-5 py-8 text-center text-[13px] text-ink-3">
              No {tab} raffles right now.
            </p>
          )}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mt-12">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">How raffles work</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Step n="01" title="Enter" body="Buy one or more raffle tickets." />
          <Step n="02" title="Sell out" body="When every ticket is sold, the draw becomes eligible." />
          <Step n="03" title="Draw" body="A winner is selected from StonkPit's onchain entropy." />
          <Step n="04" title="Settle" body="The winner receives the NFT; a raffle that doesn't sell out refunds in full." />
        </div>
      </section>

      {/* ---------------- Launch your own ---------------- */}
      <section className="mt-8">
        <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-6 sm:p-8">
          <span className="noise-overlay" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Launch your own raffle.</h2>
              <p className="mt-2 max-w-[50ch] text-[13.5px] leading-relaxed text-ink-2">
                Escrow an eligible Robinhood Chain NFT, choose your ticket
                economics, and let the contract handle the draw and the refunds.
                You keep 90% on a sellout.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MiniStep n="01" title="Deposit NFT" />
                <MiniStep n="02" title="Set raffle" />
                <MiniStep n="03" title="Winner settles onchain" />
              </div>
              <Link
                href="/launchpad"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96)_0%,rgba(204,255,0,0.98)_46%,rgba(186,232,0,0.98)_100%)] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5"
              >
                Open the launchpad
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {/* Neutral Robacha objects — NFT → capsule → winner. No fake art. */}
            <div className="flex items-center justify-center gap-3 rounded-[20px] bg-[rgb(var(--ink-rgb)_/_0.03)] p-5">
              <FlowNode label="NFT">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-[rgb(var(--surface-rgb))]">
                  <Ticket className="h-4 w-4 text-ink-3" aria-hidden="true" />
                </span>
              </FlowNode>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
              <FlowNode label="Raffle">
                <span data-rarity="grail">
                  <CapsuleGlyph id="raffle-launch-flow" className="h-11 w-11" />
                </span>
              </FlowNode>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
              <FlowNode label="Winner">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[rgb(var(--edge-rgb)_/_0.9)] bg-[rgb(var(--surface-rgb))]">
                  <Wallet className="h-4 w-4 text-ink-3" aria-hidden="true" />
                </span>
              </FlowNode>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Trust strip ---------------- */}
      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Trust icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} title="Onchain escrow">
          Ticket money is held by the contract, never by us — released only after a real draw.
        </Trust>
        <Trust icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />} title="Automatic refunds">
          If a raffle doesn&rsquo;t sell out in time, every ticket is refundable in full, permissionlessly.
        </Trust>
        <Trust icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />} title="Verifiable settlement">
          The winner is drawn from StonkPit&rsquo;s onchain entropy, and every raffle is inspectable onchain.
        </Trust>
      </section>

      {/* Quiet ecosystem footnote — a link, not a payment path (raffles take
          native ETH). Kept well away from the buy panel. */}
      <div className="mt-10 flex justify-center">
        <RobContextLink />
      </div>
    </PageContainer>
  );
}

// ---------------------------------------------------------------- sub-parts
function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="micro text-ink-3">{label}</p>
      <p className="num mt-1 text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <span className="num text-[12px] font-semibold text-accent-ink">{n}</span>
      <p className="mt-1.5 text-[14px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

function MiniStep({ n, title }: { n: string; title: string }) {
  return (
    <div className="rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--surface-rgb)_/_0.5)] px-3 py-2.5">
      <span className="num text-[11px] font-semibold text-accent-ink">{n}</span>
      <p className="mt-0.5 text-[12.5px] font-medium leading-snug">{title}</p>
    </div>
  );
}

function FlowNode({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3">{label}</span>
    </div>
  );
}

function Trust({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">{icon}</span>
        <p className="text-[13px] font-semibold tracking-[-0.01em]">{title}</p>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card relative overflow-hidden rounded-[22px] p-8 text-center sm:p-10">
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 opacity-[0.14]" data-rarity="grail">
        <CapsuleGlyph id="raffle-empty" className="h-40 w-40" />
      </span>
      <div className="relative mx-auto max-w-[42ch]">
        <h3 className="text-[18px] font-semibold tracking-[-0.02em]">Your NFT could be next.</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          Launch a trustless raffle for an NFT you own. The contract escrows the
          NFT, handles ticket sales, draws the winner and settles automatically.
        </p>
        <Link
          href="/launchpad"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96)_0%,rgba(204,255,0,0.98)_46%,rgba(186,232,0,0.98)_100%)] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)] transition-transform hover:-translate-y-0.5"
        >
          Launch a raffle
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- helpers
function bucketize(community: HubRaffle[], now: number) {
  const live: HubRaffle[] = [];
  const upcoming: HubRaffle[] = [];
  const ended: HubRaffle[] = [];
  for (const r of community) {
    const started = now >= r.openAt * 1000;
    const expired = now >= r.closesAt * 1000;
    if (r.state === HubRaffleState.Complete || r.state === HubRaffleState.Refundable || r.state === HubRaffleState.Cancelled) {
      ended.push(r);
    } else if (r.state === HubRaffleState.AwaitingDraw) {
      live.push(r);
    } else if (!started) {
      upcoming.push(r);
    } else if (expired) {
      ended.push(r);
    } else {
      live.push(r);
    }
  }
  return { live, upcoming, ended };
}
