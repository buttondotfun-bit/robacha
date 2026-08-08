import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Dice5,
  Gift,
  Lock,
  Sparkles,
  Wallet,
} from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { NFT_SPIN_CANDIDATES } from "@/data/nft-spins";
import { NETWORK_LABEL } from "@/lib/web3";
import { RafflePromo } from "@/components/raffle/RafflePromo";
import { RobContextLink } from "@/components/rob/RobContextLink";
import { SpinTabs } from "@/components/gacha/SpinTabs";
import { NftSpinStage } from "./NftSpinStage";

/**
 * NFT Spins — the next Robacha machine, built as a product but honestly
 * pre-launch. The message leads; the machine and the candidate collections
 * follow at size. Nothing is asserted that a contract would have to answer for:
 * the collections are labelled candidates (real ERC-721s on Robinhood Chain,
 * see data/nft-spins.ts), and there are no odds, inventory, activity or winners
 * until a pool exists. The spin control is present and locked, with the reason
 * on it, and the live/reveal states are described as the plan rather than shown
 * as happening.
 */
export function NftSpinsTeaser() {
  const x = SOCIAL_LINKS[0];

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      <SpinTabs className="mb-3" />
      {/* Cross-product strip, kept slim so NFT Spins stays dominant. */}
      <RafflePromo variant="bar" className="mb-5" />

      {/* ---------------- Hero: message first ---------------- */}
      <Reveal className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <p className="micro text-ink-3">NFT Spins</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-2.5 py-1 text-[10.5px] font-semibold text-ink-2">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Coming soon
            </span>
          </div>
          <h1 className="text-display mt-3 leading-[0.95]">
            Spin the machine.
            <br />
            Pull an NFT.
          </h1>
          <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">
            The Robacha machine is expanding beyond tokens. Spin into an NFT
            reward pool and pull a collectible straight to your wallet — same
            chain, same provable draw.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <ButtonLink href={x.href} external variant="primary" size="lg">
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Get the drop first
            </ButtonLink>
            <ButtonLink href="/app" variant="secondary" size="lg">
              Spin token pools <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>

        {/* Pool concept card */}
        <div className="glass-card rounded-[22px] p-5">
          <div className="flex items-center justify-between">
            <p className="micro text-ink-3">NFT reward pool</p>
            <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-2">
              <Lock className="h-3 w-3" aria-hidden="true" /> Opening soon
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <PoolStat label="Pool" value="—" />
            <PoolStat label="NFTs" value="—" />
            <PoolStat label="Collections" value={String(NFT_SPIN_CANDIDATES.length)} sub="candidates" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            Inventory and odds appear here when a pool is funded and live — read
            straight from the contract, never guessed.
          </p>
        </div>
      </Reveal>

      {/* ---------------- The machine ---------------- */}
      <Reveal delay={40} className="glass-panel glass-reflection glass-highlight relative mt-6 overflow-hidden rounded-[28px]">
        <span className="noise-overlay" aria-hidden="true" />
        <div className="cross-grid absolute inset-0" aria-hidden="true" />
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-11 rounded-t-[28px] border-b border-[rgb(var(--line-rgb)_/_0.07)] bg-[linear-gradient(180deg,rgb(var(--edge-rgb)_/_0.85),rgb(var(--edge-rgb)_/_0.25))]">
          <span className="absolute left-1/2 top-[18px] h-[5px] w-16 -translate-x-1/2 rounded-full bg-[rgb(var(--line-rgb)_/_0.14)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]" />
          <span className="absolute left-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
          <span className="absolute right-5 top-[15px] h-2.5 w-2.5 rounded-full bg-[rgb(var(--line-rgb)_/_0.1)]" />
        </div>

        <div className="relative px-3 pb-6 pt-14 sm:px-6 sm:pt-16">
          <NftSpinStage className="mt-2" />

          {/* Redesigned locked state — intentional, not a grey slab. */}
          <div className="mx-auto mt-6 max-w-[440px] text-center">
            <p className="text-[15px] font-semibold tracking-[-0.01em]">NFT Spins open soon.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              Follow {x.handle} for the first live pool. Candidates below are real
              collections — the prize list and its odds are published from the
              contract before the first spin.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <ButtonLink href={x.href} external variant="primary" size="md">
                <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Get the drop first
              </ButtonLink>
              <ButtonLink href="/app" variant="secondary" size="md">Spin token pools</ButtonLink>
            </div>
          </div>

          <div aria-hidden="true" className="mx-auto mt-6 h-6 max-w-[220px] rounded-b-[14px] rounded-t-[4px] border border-t-0 border-[rgb(var(--line-rgb)_/_0.09)] bg-[linear-gradient(180deg,rgb(var(--ink-rgb)_/_0.07),rgb(var(--ink-rgb)_/_0.02))] shadow-[inset_0_3px_8px_rgb(var(--ink-rgb)_/_0.12)]" />
        </div>
      </Reveal>

      {/* ---------------- Collections coming to the machine ---------------- */}
      <section className="mt-14">
        <SectionHeader
          eyebrow="Coming to the machine"
          title="Real collections, not placeholders."
          description="Every one is a verified ERC-721 on Robinhood Chain. They're pool candidates — shown as examples of what NFT Spins could hold, not confirmed prizes."
          className="mb-6"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {NFT_SPIN_CANDIDATES.map((c) => (
            <a
              key={c.address}
              href={c.opensea}
              target="_blank"
              rel="noreferrer"
              className="glass-card group overflow-hidden rounded-[20px] transition-transform hover:-translate-y-1"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-[rgb(var(--ink-rgb)_/_0.05)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt={`${c.name} — candidate collection`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm backdrop-blur-sm">
                  Candidate
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-[13.5px] font-semibold">
                    {c.name} <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent-ink" aria-hidden="true" />
                  </p>
                  <p className="text-[11px] text-ink-3">{NETWORK_LABEL}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ---------------- Same machine, different prize ---------------- */}
      <section className="mt-14">
        <SectionHeader eyebrow="Why NFT Spins" title="Same machine. Different prize." className="mb-6" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Idea icon={<Boxes className="h-4 w-4" aria-hidden="true" />} title="Discover" body="Pull NFTs from collections across Robinhood Chain, through the machine you already know." />
          <Idea icon={<Wallet className="h-4 w-4" aria-hidden="true" />} title="Own" body="A pulled NFT settles to your wallet per the production contract — yours, not held by us." />
          <Idea icon={<Sparkles className="h-4 w-4" aria-hidden="true" />} title="Verify" body="Inventory, odds and every result are inspectable on chain." />
        </div>
      </section>

      {/* ---------------- How NFT spins work ---------------- */}
      <section className="mt-14">
        <SectionHeader eyebrow="How it works" title="Spin. Draw. Reveal. Own." className="mb-6" />
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HowStep n="01" title="Spin" body="Enter the active NFT reward pool." />
          <HowStep n="02" title="Draw" body="The machine derives a result from Robacha's production entropy." />
          <HowStep n="03" title="Reveal" body="The capsule opens and the selected NFT is revealed." />
          <HowStep n="04" title="Own" body="The NFT settles to your wallet per the production contract." />
        </ol>
      </section>

      {/* ---------------- Verifiable draw ---------------- */}
      <section className="mt-8">
        <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-[18px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">
              <Dice5 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.01em]">Verifiable draw</p>
              <p className="mt-0.5 max-w-[60ch] text-[12px] leading-relaxed text-ink-2">
                NFT Spins will draw from the same StonkPit entropy the token
                machine uses today — sealed before the spin, so the result can be
                checked on chain rather than trusted.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-ink-2">
            <FlowPill>Entropy sealed</FlowPill>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            <FlowPill>Spin entered</FlowPill>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            <FlowPill>Result verifiable</FlowPill>
          </div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="mt-14">
        <div className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-8 text-center sm:p-10">
          <span className="noise-overlay" aria-hidden="true" />
          <div className="relative mx-auto max-w-[44ch]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-3 py-1 text-[11.5px] font-semibold text-ink-2">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" /> NFT Spins are next
            </span>
            <h2 className="mt-4 text-[26px] font-semibold tracking-[-0.02em]">The machine is expanding.</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              A new way to spin for NFTs is coming to Robacha. Follow to catch the first live pool.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <ButtonLink href={x.href} external variant="primary" size="lg">
                <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Follow for launch
              </ButtonLink>
              <ButtonLink href="/app" variant="secondary" size="lg">
                Spin token pools <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet ecosystem footnote — a link, not a payment path (NFT Spins is
          native ETH). Discovery without a shill. */}
      <div className="mt-10 flex justify-center">
        <RobContextLink />
      </div>
    </PageContainer>
  );
}

function PoolStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.03)] py-2.5">
      <p className="num text-[18px] font-semibold">{value}</p>
      <p className="micro text-ink-3">{label}</p>
      {sub ? <p className="text-[9.5px] text-ink-3">{sub}</p> : null}
    </div>
  );
}

function Idea({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-card rounded-[18px] p-5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">{icon}</span>
      <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

function HowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <span className="num text-[12px] font-semibold text-accent-ink">{n}</span>
      <p className="mt-1.5 text-[14px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

function FlowPill({ children }: { children: React.ReactNode }) {
  return <span className="glass-chip inline-flex items-center rounded-full px-3 py-1.5">{children}</span>;
}
