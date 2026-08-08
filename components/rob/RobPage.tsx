"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  Flame,
  Gift,
  Layers,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { LightField } from "@/components/shared/AmbientBackground";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/Glass";
import { RobBurnedCard } from "@/components/gacha/RobBurnedCard";
import { ROB_MARKET_URL, ROB_TOKEN } from "@/data/rob-token";
import { explorerUrl } from "@/lib/config";
import { formatAmount, formatUsd } from "@/lib/formatters";
import { useRobBurnStats, useRobMarketData } from "@/lib/use-rob";
import { ROB_BURN_ADDRESS } from "@/lib/use-rob-burned";
import { NETWORK_LABEL } from "@/lib/web3";
import { RobContractBadge, RobContractLine, RobOfficialPill } from "./RobContract";
import { RobMarketStats } from "./RobMarketStats";

/**
 * The $ROB hub.
 *
 * One page that says what $ROB is and, for each claim, where to check it. The
 * discipline of the whole layer lives here: every utility described is one the
 * contracts actually back today, every market figure is live-or-"—", the burn
 * is a running total not a promise, and the address is verifiable in full. It
 * reads as a product page, never a token shill — no price target, no "BUY", no
 * fabricated metric.
 */

/** One utility, with an honest live/planned status rather than a claim. */
function UtilityCard({
  icon,
  title,
  body,
  status,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  status: "Live" | "Planned";
  action?: ReactNode;
}) {
  return (
    <div className="glass-card flex h-full flex-col rounded-[20px] p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
          {icon}
        </span>
        <span
          className={
            status === "Live"
              ? "inline-flex items-center gap-1 rounded-full bg-[rgba(142,197,0,0.16)] px-2 py-0.5 text-[10.5px] font-medium text-accent-ink"
              : "inline-flex items-center gap-1 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-2 py-0.5 text-[10.5px] font-medium text-ink-3"
          }
        >
          {status === "Live" ? (
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#8ec500]"
              aria-hidden="true"
            />
          ) : null}
          {status}
        </span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-2">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** A single step of the buyback loop. */
function LoopStep({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <li className="glass-quiet relative flex-1 rounded-[18px] p-4">
      <span className="num text-[11px] font-semibold text-accent-ink">
        {String(index).padStart(2, "0")}
      </span>
      <p className="mt-1 text-[13px] font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{body}</p>
    </li>
  );
}

function EconomicStat({
  label,
  value,
  sub,
  href,
  linkLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string | null;
  linkLabel: string;
}) {
  return (
    <div className="glass-quiet rounded-[18px] p-5">
      <p className="micro">{label}</p>
      <p className="num mt-2 text-[22px] font-semibold leading-none tracking-[-0.03em]">
        {value}
      </p>
      {sub ? <p className="mt-2 text-[12px] text-ink-2">{sub}</p> : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
        >
          {linkLabel}
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

export function RobPage() {
  const market = useRobMarketData();
  const burn = useRobBurnStats();
  const contractLink = explorerUrl("token", ROB_TOKEN.address);
  const burnLink = explorerUrl("address", ROB_BURN_ADDRESS);
  const pairLink = market.pairAddress
    ? explorerUrl("address", market.pairAddress)
    : null;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-x-clip pb-12 pt-6 sm:pb-16 sm:pt-10">
        <LightField tone="green" size={760} className="left-1/2 top-0 -translate-x-1/2 opacity-70" />
        <PageContainer width="wide" className="relative">
          <div className="mx-auto max-w-[46rem] text-center">
            <div className="flex justify-center">
              <span className="h-16 w-16 overflow-hidden rounded-2xl border border-[rgb(var(--edge-rgb)_/_0.8)] shadow-[0_10px_30px_-12px_rgb(var(--ink-rgb)_/_0.3)] [container-type:inline-size]">
                <TokenAvatar
                  address={ROB_TOKEN.address}
                  symbol={ROB_TOKEN.symbol}
                  logoUrl={market.logoUrl}
                  size={64}
                  rounded="none"
                  priority
                />
              </span>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2">
              <h1 className="text-display">
                ${ROB_TOKEN.symbol}
              </h1>
              <RobOfficialPill />
            </div>

            <p className="mx-auto mt-4 max-w-[44ch] text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
              The token behind the machine. Robacha&rsquo;s official utility
              token on {NETWORK_LABEL} — spend it to spin, win it from pools,
              and watch protocol fees buy it back and burn it.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/app" variant="primary" size="lg">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Spend $ROB to spin
              </ButtonLink>
              <ButtonLink
                href={ROB_MARKET_URL}
                variant="secondary"
                size="lg"
                external
              >
                View market
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>

            <div className="mt-7 flex justify-center">
              <div className="flex items-center gap-2">
                <span className="micro">Official contract</span>
                <RobContractBadge />
              </div>
            </div>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {[
                { label: "Use it to spin", icon: <Sparkles className="h-3.5 w-3.5" /> },
                { label: "Win it from pools", icon: <Gift className="h-3.5 w-3.5" /> },
                { label: "Bought back & burned", icon: <Flame className="h-3.5 w-3.5" /> },
              ].map((chip) => (
                <li key={chip.label}>
                  <GlassChip as="span" className="h-8 text-[12px]">
                    <span className="text-accent-ink" aria-hidden="true">
                      {chip.icon}
                    </span>
                    {chip.label}
                  </GlassChip>
                </li>
              ))}
            </ul>
          </div>
        </PageContainer>
      </section>

      {/* Live market */}
      <section className="relative py-8 sm:py-10">
        <PageContainer width="wide">
          <Reveal>
            <RobMarketStats />
          </Reveal>
        </PageContainer>
      </section>

      {/* Utility */}
      <section className="relative py-8 sm:py-10">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="What it does"
            title="Utility that the contracts actually back."
            description="Everything here is live on chain today, or clearly labelled as planned. No utility is claimed that a contract can't do."
            className="mb-6"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <UtilityCard
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
              title="Spend it to spin"
              status="Live"
              body="Pay for a spin in $ROB. Your own wallet swaps it for exactly the ETH the spin costs, then spins — you stay the player and keep whatever you pull. The machine itself is still priced in ETH."
              action={
                <ButtonLink href="/app" variant="ghost" size="sm">
                  Open the machine
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </ButtonLink>
              }
            />
            <UtilityCard
              icon={<Gift className="h-4 w-4" aria-hidden="true" />}
              title="Win it from pools"
              status="Live"
              body="When a live pool loads $ROB into its reward slots, you can pull it like any other token. Whether it's loaded right now is always read straight from the pool contract, never assumed."
              action={
                <ButtonLink href="/app" variant="ghost" size="sm">
                  See the live pool
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </ButtonLink>
              }
            />
            <UtilityCard
              icon={<Flame className="h-4 w-4" aria-hidden="true" />}
              title="Bought back &amp; burned"
              status="Live"
              body="Protocol margin funds a keeper that buys $ROB on the open market and sends it to a dead address — permanently out of supply. It only fires once margin builds past a floor, so the honest figure starts at zero."
            />
            <UtilityCard
              icon={<Layers className="h-4 w-4" aria-hidden="true" />}
              title="More is planned"
              status="Planned"
              body="We'll add $ROB uses here as the contracts grow to support them — and say so plainly, on chain, when we do. No roadmap promises beyond what ships."
            />
          </div>
        </PageContainer>
      </section>

      {/* Burn loop + counter */}
      <section className="relative py-8 sm:py-10">
        <LightField tone="gold" size={620} className="right-[4%] top-[10%] opacity-70" />
        <PageContainer width="wide" className="relative">
          <SectionHeader
            eyebrow="The burn"
            title="How fees turn into burned $ROB."
            description="A loop, not a promise: spins earn the protocol margin, that margin buys $ROB, and the $ROB is sent somewhere no one can spend it."
            className="mb-6"
          />
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[24px] p-5 sm:p-6">
              <span className="noise-overlay" aria-hidden="true" />
              <ol className="relative flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <LoopStep
                  index={1}
                  title="Players spin"
                  body="Every paid spin sends its price to the machine, in ETH — whether the player paid in ETH or swapped in from $ROB."
                />
                <LoopStep
                  index={2}
                  title="Protocol earns margin"
                  body="A share of activity accrues to the protocol treasury as margin, tracked on chain."
                />
                <LoopStep
                  index={3}
                  title="Keeper buys $ROB"
                  body="Once margin passes a floor, a keeper spends part of it buying $ROB from the open market."
                />
                <LoopStep
                  index={4}
                  title="$ROB is burned"
                  body="The bought $ROB is sent to a dead address — out of circulation, verifiable by anyone."
                />
              </ol>
              <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
                Buybacks are threshold-gated and can pause; nothing here is a
                schedule or a guaranteed amount. The only claim is the running
                total, which anyone can read at the dead address.
              </p>
            </div>
            <RobBurnedCard />
          </div>
        </PageContainer>
      </section>

      {/* Economics */}
      <section className="relative py-8 sm:py-10">
        <PageContainer width="wide">
          <SectionHeader
            eyebrow="The numbers"
            title="Only what the chain can show."
            description="Supply is fixed and read from the contract; burned is the dead address's own balance; liquidity is live market data. Each links to its source."
            className="mb-6"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <EconomicStat
              label="Total supply"
              value={`${formatAmount(ROB_TOKEN.totalSupply)}`}
              sub={`${ROB_TOKEN.totalSupply.toLocaleString("en-US")} $ROB · ${ROB_TOKEN.decimals} decimals`}
              href={contractLink}
              linkLabel="Read the contract"
            />
            <EconomicStat
              label="Burned so far"
              value={
                burn.amount === null
                  ? "…"
                  : burn.hasBurned
                    ? `${formatAmount(burn.amount)}`
                    : "None yet"
              }
              sub={
                burn.hasBurned
                  ? "Sent to a dead address, out of supply."
                  : "Buybacks begin once margin builds up."
              }
              href={burnLink}
              linkLabel="Verify the dead address"
            />
            <EconomicStat
              label="Pool liquidity"
              value={
                market.liquidityUsd !== null
                  ? formatUsd(market.liquidityUsd, { compact: true })
                  : "—"
              }
              sub="ROB/WETH pool depth, live from the market."
              href={pairLink ?? ROB_MARKET_URL}
              linkLabel={pairLink ? "View the pool" : "View the market"}
            />
          </div>
        </PageContainer>
      </section>

      {/* Verify */}
      <section className="relative pb-14 pt-8 sm:pb-20 sm:pt-10">
        <PageContainer width="narrow">
          <div className="glass-card rounded-[24px] p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold tracking-[-0.02em]">
                Verify you have the real ${ROB_TOKEN.symbol}
              </p>
              <RobOfficialPill />
            </div>
            <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-ink-2">
              A ticker can&rsquo;t be owned, and copies of ${ROB_TOKEN.symbol}
              get deployed under the same symbol. The address below is the only
              one that&rsquo;s ours — check it before you trade anything, and
              never trust a DM telling you to buy.
            </p>
            <RobContractLine className="mt-4" />
          </div>
        </PageContainer>
      </section>
    </>
  );
}
