"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Check,
  Clock,
  Coins,
  Dice5,
  Gavel,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Ticket,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { RobContextLink } from "@/components/rob/RobContextLink";
import { ButtonLink } from "@/components/ui/Button";
import { XIcon } from "@/components/brand/XIcon";
import { SOCIAL_LINKS } from "@/lib/constants";
import { contracts, explorerUrl } from "@/lib/config";
import { NFT_SPIN_CANDIDATES } from "@/data/nft-spins";
import { useHubStatus } from "@/lib/use-raffle-hub";

/**
 * Real, verified Robinhood Chain collections shown as example prizes in the
 * preview — the same collections the NFT-spins reel is drawn from, each linking
 * to its own OpenSea page. They illustrate what a creator's raffle could hold;
 * the card is labelled a preview and shows no specific token id, so it never
 * implies one of these is actually being raffled.
 */
const PREVIEW_COLLECTIONS = NFT_SPIN_CANDIDATES.filter((c) =>
  ["StonkBrokers", "Chain Mancers", "CASHCAT"].includes(c.name),
);

/**
 * The NFT-raffle launchpad — a product landing page, not a holding page.
 *
 * The hub contract is live, so every claim here is one the contract actually
 * keeps: NFT escrow, on-chain winner selection from StonkPit entropy, automatic
 * settlement and fail-closed refunds, a 90/10 split read from the contract.
 * It's live wherever the hub address is configured (production); with no hub
 * configured (local dev), it degrades to an intentional opening-soon preview of
 * the real product rather than an empty "coming soon" box.
 */
export function LaunchpadClient() {
  const { configured, listingsPaused, feeBps } = useHubStatus();
  // Live wherever the hub is actually deployed (production) and not paused;
  // locally, with no hub address configured, it shows the opening-soon preview.
  const live = configured && !listingsPaused;

  const feePct = feeBps / 100;
  const creatorPct = 100 - feePct;
  const x = SOCIAL_LINKS[0];
  const contractLink = contracts.raffleHub ? explorerUrl("address", contracts.raffleHub) : null;

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      {/* ---------------- Hero ---------------- */}
      <Reveal className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="micro text-ink-3">NFT Raffle Launchpad</p>
          <h1 className="text-display mt-2 leading-[0.95]">
            Raffle
            <br />
            your NFT.
          </h1>
          <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">
            Turn an NFT you own into a trustless raffle on Robinhood Chain. Choose
            the ticket economics, escrow the prize, and let the contract handle
            settlement.
          </p>

          <ul className="mt-5 flex flex-wrap gap-2">
            <TrustChip>NFT held in escrow</TrustChip>
            <TrustChip>On-chain winner selection</TrustChip>
            <TrustChip>Automatic settlement &amp; refunds</TrustChip>
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {live ? (
              <ButtonLink href="/launchpad/create" variant="primary" size="lg">
                Create a raffle
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            ) : (
              <span className="inline-flex h-12 items-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-5 text-[14px] font-semibold text-ink-3">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
                Opening soon
              </span>
            )}
            <Link
              href="/raffle"
              className="glass-chip inline-flex h-12 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Explore raffles
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Preview card — clearly a preview, neutral Robacha art. */}
        <PreviewCard creatorPct={creatorPct} />
      </Reveal>

      {/* ---------------- Builder preview ---------------- */}
      <section className="mt-20">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <BuilderPreview live={live} creatorPct={creatorPct} feePct={feePct} />
          <div className="lg:pt-2">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Launch a raffle in a minute.</h2>
            <p className="mt-2 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-2">
              The builder walks through the whole listing: pick an eligible NFT
              from your wallet, set the ticket economics, and review before the NFT
              moves into escrow. No code, no custody by us.
            </p>
            <ol className="mt-5 space-y-3">
              <BuildLine n="01" title="Pick your NFT" body="Connect and choose an NFT you own on Robinhood Chain." />
              <BuildLine n="02" title="Set the terms" body="Ticket price, supply, wallet cap and duration — all yours." />
              <BuildLine n="03" title="Escrow &amp; launch" body="Approve, then the NFT enters the contract and sales open." />
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mt-20">
        <SectionHead eyebrow="How it works" title="From your wallet to the winner’s." />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HowStep icon={<Boxes className="h-4 w-4" aria-hidden="true" />} n="01" title="Choose your NFT" body="Connect your wallet and select an eligible NFT you own." />
          <HowStep icon={<Ticket className="h-4 w-4" aria-hidden="true" />} n="02" title="Set the raffle" body="Choose ticket price, ticket count, wallet cap and duration." />
          <HowStep icon={<Lock className="h-4 w-4" aria-hidden="true" />} n="03" title="Escrow & launch" body="The NFT moves into the raffle contract and ticket sales open." />
          <HowStep icon={<Trophy className="h-4 w-4" aria-hidden="true" />} n="04" title="Settle" body="Sell out and the winner gets the NFT; otherwise every ticket refunds in full." />
        </div>
      </section>

      {/* ---------------- Creator economics ---------------- */}
      <section className="mt-20">
        <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-6 sm:p-8">
          <span className="noise-overlay" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <SectionHead eyebrow="Creator economics" title={`Creators keep ${creatorPct}%.`} />
              <p className="mt-3 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-2">
                Run a raffle for an NFT you already own and let the contract manage
                ticket sales, settlement and refunds. The protocol only takes its
                cut on a sellout — nothing if it doesn&rsquo;t fill.
              </p>

              {/* Split bar */}
              <div className="mt-5">
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="bg-[#a6d900] transition-[width] duration-500" style={{ width: `${creatorPct}%` }} />
                  <div className="bg-[rgb(var(--ink-rgb)_/_0.16)] transition-[width] duration-500" style={{ width: `${feePct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className="font-semibold">Creator · {creatorPct}%</span>
                  <span className="text-ink-3">Robacha · {feePct}%</span>
                </div>
              </div>
            </div>

            {/* Example */}
            <div className="rounded-[18px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-5">
              <p className="micro text-ink-3">Example economics</p>
              <p className="mt-1 text-[13px] text-ink-2">200 tickets × $10 = <span className="num font-semibold text-ink">$2,000</span> gross</p>
              <dl className="mt-3 space-y-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-3">Creator ({creatorPct}%)</dt>
                  <dd className="num font-semibold text-accent-ink">${(2000 * creatorPct) / 100}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-3">Robacha ({feePct}%)</dt>
                  <dd className="num text-ink">${(2000 * feePct) / 100}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[10.5px] leading-relaxed text-ink-3">
                Illustrative only — a worked example of the {creatorPct}/{feePct} split
                the contract enforces, not historical revenue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- You control / Robacha handles ---------------- */}
      <section className="mt-20 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="Your call" title="You control the raffle." />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniCard icon={<Coins className="h-4 w-4" aria-hidden="true" />} title="Ticket price" body="Set how much each entry costs." />
            <MiniCard icon={<Ticket className="h-4 w-4" aria-hidden="true" />} title="Ticket supply" body="Choose how many entries can be sold." />
            <MiniCard icon={<Wallet className="h-4 w-4" aria-hidden="true" />} title="Wallet cap" body="Limit how many tickets one wallet can buy." />
            <MiniCard icon={<Clock className="h-4 w-4" aria-hidden="true" />} title="Duration" body="Choose how long the raffle stays open." />
          </div>
        </div>
        <div>
          <SectionHead eyebrow="Handled for you" title="Robacha handles the rest." />
          <div className="mt-5 space-y-2.5">
            <HandleLine icon={<Lock className="h-4 w-4" aria-hidden="true" />} title="Escrow" body="Prize custody is held by the contract, not by us." />
            <HandleLine icon={<Ticket className="h-4 w-4" aria-hidden="true" />} title="Ticket accounting" body="Every confirmed entry is recorded on chain." />
            <HandleLine icon={<Dice5 className="h-4 w-4" aria-hidden="true" />} title="Winner selection" body="A weighted ticket is drawn from StonkPit entropy." />
            <HandleLine icon={<Trophy className="h-4 w-4" aria-hidden="true" />} title="Settlement" body="Prize and proceeds settle per the raffle contract." />
            <HandleLine icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />} title="Refunds" body="If a raffle doesn’t sell out, tickets refund in full." />
          </div>
        </div>
      </section>

      {/* ---------------- Verifiable / trust ---------------- */}
      <section className="mt-20">
        <SectionHead eyebrow="Trust" title="Built to be verified." />
        <p className="mt-3 max-w-[56ch] text-[13.5px] leading-relaxed text-ink-2">
          A raffle involving real money and NFTs shouldn&rsquo;t rest on &ldquo;trust
          us.&rdquo; The NFT, the ticket money and the draw are all held and run by
          the contract — you can read it yourself.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TrustBlock icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} title="NFT escrow" body="The prize sits in the contract until the raffle settles." />
          <TrustBlock icon={<Ticket className="h-4 w-4" aria-hidden="true" />} title="Ticket accounting" body="Every entry and payment is recorded on chain." />
          <TrustBlock icon={<Dice5 className="h-4 w-4" aria-hidden="true" />} title="Winner selection" body="Drawn from StonkPit entropy — no private server roll." />
          <TrustBlock icon={<Gavel className="h-4 w-4" aria-hidden="true" />} title="Settlement" body="Payouts and refunds follow the contract, not us." />
        </div>

        {/* Randomness visualization */}
        <div className="mt-4 glass-card rounded-[18px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.01em]">Verifiable randomness</p>
              <p className="mt-1 max-w-[52ch] text-[12px] leading-relaxed text-ink-2">
                Winner selection uses Robacha&rsquo;s production entropy pipeline —
                the same StonkPit source the spin machine draws from — rather than a
                number generated on a private server.
              </p>
            </div>
            {contractLink ? (
              <a
                href={contractLink}
                target="_blank"
                rel="noreferrer"
                className="glass-chip inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-medium text-ink-2 hover:text-ink"
              >
                View contract <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-ink-2">
            <FlowPill>Miner prints</FlowPill>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            <FlowPill>Sealed entropy</FlowPill>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            <FlowPill>Raffle result</FlowPill>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            <FlowPill>Verifiable outcome</FlowPill>
          </div>
        </div>
      </section>

      {/* ---------------- Who this is for ---------------- */}
      <section className="mt-20">
        <SectionHead eyebrow="Who it’s for" title="Built for NFT communities." />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniCard icon={<Trophy className="h-4 w-4" aria-hidden="true" />} title="Collection founders" body="Run a featured community raffle." />
          <MiniCard icon={<Wallet className="h-4 w-4" aria-hidden="true" />} title="Collectors" body="Raffle an NFT you already own." />
          <MiniCard icon={<Boxes className="h-4 w-4" aria-hidden="true" />} title="Projects" body="Use NFTs for ecosystem activations." />
          <MiniCard icon={<Users className="h-4 w-4" aria-hidden="true" />} title="Communities" body="Create transparent reward campaigns." />
        </div>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      <section className="mt-20">
        <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-8 text-center sm:p-10">
          <span className="noise-overlay" aria-hidden="true" />
          <div className="relative mx-auto max-w-[46ch]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-3 py-1 text-[11.5px] font-semibold text-ink-2">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
              {live ? "Launchpad open" : "Launchpad · opening soon"}
            </span>
            <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">
              {live ? "Your NFT could be the next prize." : "The contracts are being finalized before creator raffles go live."}
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {live ? (
                <ButtonLink href="/launchpad/create" variant="primary" size="lg">
                  Create a raffle <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              ) : (
                <ButtonLink href={x.href} external variant="primary" size="lg">
                  <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Follow for launch
                </ButtonLink>
              )}
              <Link
                href="/raffle"
                className="glass-chip inline-flex h-12 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Explore live raffles <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet ecosystem footnote — a link, not a payment path (the launchpad
          takes native ETH). */}
      <div className="mt-10 flex justify-center">
        <RobContextLink />
      </div>
    </PageContainer>
  );
}

// ------------------------------------------------------------------ sub-parts
function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <li className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-ink-2">
      <Check className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> {children}
    </li>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="micro text-ink-3">{eyebrow}</p>
      <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">{title}</h2>
    </div>
  );
}

function PreviewCard({ creatorPct }: { creatorPct: number }) {
  const items = PREVIEW_COLLECTIONS;
  const [i, setI] = useState(0);

  // Gently rotate through the real example collections; hold still for anyone
  // who prefers reduced motion.
  useEffect(() => {
    if (items.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % items.length), 3600);
    return () => window.clearInterval(id);
  }, [items.length]);

  const active = items[i] ?? null;

  return (
    <div className="glass-card relative overflow-hidden rounded-[24px] p-5">
      <div className="flex items-center justify-between">
        <p className="micro text-ink-3">Your raffle · preview</p>
        <span className="glass-chip rounded-full px-2 py-0.5 text-[10px] font-medium text-ink-3">UI preview</span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-[rgb(var(--ink-rgb)_/_0.03)]">
          {items.map((c, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={c.address}
              src={c.image}
              alt={`${c.name} — example collection`}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0"}`}
            />
          ))}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.02em]">
            <span className="truncate">{active ? active.name : "Your NFT"}</span>
            {active ? <BadgeCheck className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" /> : null}
          </p>
          <p className="text-[11.5px] text-ink-3">Example prize · real Robinhood Chain collection</p>
          {active ? (
            <a
              href={active.opensea}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink"
            >
              View on OpenSea <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>

      {/* which example is showing */}
      {items.length > 1 ? (
        <div className="mt-3 flex items-center gap-1.5">
          {items.map((c, idx) => (
            <button
              key={c.address}
              type="button"
              aria-label={`Show ${c.name}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-[#a6d900]" : "w-1.5 bg-[rgb(var(--ink-rgb)_/_0.14)]"}`}
            />
          ))}
        </div>
      ) : null}

      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4 text-center">
        <PreviewStat label="Ticket" value="$10" />
        <PreviewStat label="Tickets" value="200" />
        <PreviewStat label="Duration" value="24h" />
        <PreviewStat label="You keep" value={`${creatorPct}%`} />
        <PreviewStat label="Winner" value="1" />
        <PreviewStat label="Refunds" value="Full" />
      </dl>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="micro text-ink-3">{label}</dt>
      <dd className="num mt-0.5 text-[14px] font-semibold">{value}</dd>
    </div>
  );
}

function BuilderPreview({ live, creatorPct, feePct }: { live: boolean; creatorPct: number; feePct: number }) {
  return (
    <div className="relative">
      <div className={`glass-card rounded-[22px] p-5 sm:p-6 ${live ? "" : "select-none"}`} aria-hidden={live ? undefined : true}>
        <p className="micro text-ink-3">Launch a raffle</p>
        <div className="mt-3 space-y-3">
          <MockField label="NFT" value="Select NFT" muted />
          <div className="grid grid-cols-2 gap-3">
            <MockField label="Ticket price" value="$10" />
            <MockField label="Total tickets" value="200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MockField label="Max per wallet" value="25" />
            <MockField label="Duration" value="24 hours" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MockField label="Creator proceeds" value={`${creatorPct}%`} />
            <MockField label="Robacha protocol" value={`${feePct}%`} />
          </div>
          <div className="mt-1 grid h-12 place-items-center rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.85),rgba(204,255,0,0.85))] text-[14px] font-semibold text-[var(--on-accent)]">
            Launch raffle
          </div>
        </div>
      </div>

      {/* Opening-soon overlay while public creation is gated. */}
      {!live ? (
        <div className="absolute inset-0 grid place-items-center rounded-[22px] bg-[rgb(var(--surface-rgb)_/_0.55)] backdrop-blur-[2px]">
          <div className="rounded-full bg-[rgb(var(--surface-rgb))] px-4 py-2 text-[12px] font-semibold shadow-[0_8px_24px_-8px_rgb(var(--ink-rgb)_/_0.2)]">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" /> Launchpad opening soon
            </span>
          </div>
        </div>
      ) : (
        <Link href="/launchpad/create" className="absolute inset-0 rounded-[22px]" aria-label="Open the raffle builder" />
      )}
    </div>
  );
}

function MockField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-medium text-ink-2">{label}</p>
      <div className={`flex h-10 items-center rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-[rgb(var(--surface-rgb))] px-3 text-[13px] ${muted ? "text-ink-3" : "num text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function BuildLine({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="num mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-[11px] font-semibold text-accent-ink">{n}</span>
      <div>
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{body}</p>
      </div>
    </li>
  );
}

function HowStep({ icon, n, title, body }: { icon: React.ReactNode; n: string; title: string; body: string }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">{icon}</span>
        <span className="num text-[11px] font-semibold text-ink-3">{n}</span>
      </div>
      <p className="mt-3 text-[14px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

function MiniCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-2">{icon}</span>
      <p className="mt-2.5 text-[13.5px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

function HandleLine({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.08)] p-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">{icon}</span>
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{body}</p>
      </div>
    </div>
  );
}

function TrustBlock({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">{icon}</span>
      <p className="mt-2.5 text-[13px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

function FlowPill({ children }: { children: React.ReactNode }) {
  return <span className="glass-chip inline-flex items-center rounded-full px-3 py-1.5">{children}</span>;
}
