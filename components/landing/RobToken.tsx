"use client";

import { ArrowUpRight, Flame, Gift, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { RobContractLine, RobOfficialPill } from "@/components/rob/RobContract";
import { ROB_MARKET_URL, ROB_TOKEN } from "@/data/rob-token";
import { NETWORK_LABEL } from "@/lib/web3";

/**
 * $ROB on the home page: what it is, what it does, and — crucially — the real
 * address so a copy can't pass for it.
 *
 * The address block stays a safety control rather than promotion. A ticker
 * cannot be owned, so this address is the only thing that tells the real token
 * apart from an impersonator deployed under the same symbol, which is why it is
 * shown in full, selectable, copyable and linked to the explorer via
 * `RobContractLine` — the same verifiable block the footer and /rob page use.
 *
 * What changed from "identity only": $ROB now has real, on-chain utility — it
 * can be spent to spin (the wallet swaps it to the exact ETH a spin costs), it
 * can be won from a pool that loads it, and protocol fees buy it back and burn
 * it. Those are stated as what the contracts do, never as a reason to buy, and
 * the deeper page carries the live market. No price, target, or projection sits
 * on the home page.
 */

function UtilityRow({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold tracking-[-0.02em]">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
      </div>
    </li>
  );
}

export function RobToken() {
  return (
    <section className="relative py-11 sm:py-14" aria-label="ROB token">
      <PageContainer width="wide">
        <SectionHeader
          eyebrow="The token behind the machine"
          title={`Meet $${ROB_TOKEN.symbol}.`}
          description="Robacha's official utility token. Use it in the machine, win it from pools, watch it burn — and always check you've got the real one."
          className="mb-6"
          action={
            <ButtonLink href={ROB_TOKEN.route} variant="secondary" size="md">
              Explore ${ROB_TOKEN.symbol}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
          {/* What it does */}
          <div className="glass-card rounded-[22px] p-5 sm:p-6">
            <ul className="space-y-4">
              <UtilityRow
                icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                title="Use it to spin"
                body="Pay for a spin in $ROB — your wallet swaps it for exactly the ETH the spin costs, then spins."
              />
              <UtilityRow
                icon={<Gift className="h-4 w-4" aria-hidden="true" />}
                title="Win it from pools"
                body="When a live pool loads $ROB as a reward, you can pull it like any other token — read straight from the pool."
              />
              <UtilityRow
                icon={<Flame className="h-4 w-4" aria-hidden="true" />}
                title="Watch it burn"
                body="Protocol fees buy $ROB back and send it to a dead address — a running total anyone can verify."
              />
            </ul>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
              <ButtonLink href={ROB_TOKEN.route} variant="primary" size="sm">
                About $ROB
              </ButtonLink>
              <ButtonLink href={ROB_MARKET_URL} variant="ghost" size="sm" external>
                View market
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>

          {/* Verify it's real */}
          <div className="glass-card rounded-[22px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.02em]">
                ${ROB_TOKEN.symbol}
              </span>
              <span className="num text-[12.5px] text-ink-3">{ROB_TOKEN.name}</span>
              <RobOfficialPill />
            </div>

            <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-2">
              Anyone can launch a token using our ticker, and people do. The
              address below is the only one that&rsquo;s ours — check it before
              you buy anything.
            </p>

            <RobContractLine className="mt-4" />

            <dl className="mt-5 grid grid-cols-3 gap-2">
              {[
                { term: "Network", value: NETWORK_LABEL },
                { term: "Decimals", value: String(ROB_TOKEN.decimals) },
                {
                  term: "Supply",
                  value: ROB_TOKEN.totalSupply.toLocaleString("en-US"),
                },
              ].map((row) => (
                <div
                  key={row.term}
                  className="rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-3 py-2.5"
                >
                  <dt className="micro">{row.term}</dt>
                  <dd className="num mt-1 text-[12.5px] text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
              Symbol, decimals and supply are all read back from the contract on
              the explorer. We&rsquo;ll never DM you asking you to buy it.
            </p>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
