"use client";

import { Check, Clock } from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useLineup } from "@/lib/use-lineup";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { NETWORK_LABEL } from "@/lib/web3";

/**
 * Which tokens the machine holds, and which are lined up next.
 *
 * The two halves come from deliberately different places. What is *in* the
 * machine is read live from the pool contract — so it cannot name a token the
 * machine does not actually hold, and it updates itself the moment a new pool
 * version goes live. What is *next* is a stated intention, which no contract
 * can be asked about, so it is a written list and is labelled as intent rather
 * than dressed up as fact.
 *
 * The distinction is the whole point of the section. "In the machine" is
 * checkable: the token is in the published reward slots right now. "Next in"
 * is a plan, and plans slip. Blurring them would be the easy version and would
 * make the checkable half worth less.
 *
 * "Listed on Robacha" is likewise a fact rather than a phrase — it means the
 * registry's `allowlistedTokens()` returns true for that contract — so it is
 * read from chain per token, and one that has not been listed yet says so.
 *
 * No odds, amounts or dates on the upcoming half. Those do not exist until a
 * pool version is published containing the token.
 */

/**
 * Where an off-chain token actually lives, and where to go and look at it.
 *
 * A table rather than a branch per chain, because the label and the explorer
 * link have to agree and previously did not have to: both hardcoded BNB, so
 * the first token from anywhere else would have been announced as BNB Chain
 * and linked to a BscScan page that does not exist. Adding a chain now means
 * adding a row, and forgetting the link is a type error rather than a wrong
 * page.
 */
const FOREIGN_CHAINS: Record<string, { label: string; explorer: string }> = {
  bsc: { label: "BNB Chain", explorer: "https://bscscan.com/token/" },
  ethereum: { label: "Ethereum", explorer: "https://etherscan.io/token/" },
};

export function TokenLineup({
  variant = "full",
}: {
  /**
   * `strip` is for the spin page, which is already dense — a compact row that
   * says what is coming without competing with the machine someone came to
   * play. It carries the same two-state distinction, because the honesty of
   * the section is in that split rather than in its size.
   */
  variant?: "full" | "strip";
} = {}) {
  const { pool } = usePool();
  const { tokens: lineup } = useLineup();

  // One card per token, not per reward slot — a token in two tiers is still
  // one token, and listing it twice would overstate the lineup.
  const live = Array.from(
    new Map((pool?.entries ?? []).map((entry) => [entry.token.toLowerCase(), entry])).values(),
  );

  // A token that has arrived stops being upcoming, whatever the written list
  // still says. That list is edited by hand and the pool changes without it,
  // so the two drift — and they drifted, leaving tokens advertised as "next in"
  // while the machine was already paying them out. Deriving this from the
  // contract means the stale half can only ever be too long, never wrong.
  const loaded = new Set(live.map((entry) => entry.token.toLowerCase()));
  const upcoming = lineup.filter((token) => !loaded.has(token.address.toLowerCase()));

  const market = useTokenMarket([
    ...live.map((entry) => entry.token),
    ...upcoming.map((token) => token.address),
  ]);

  if (live.length === 0 && upcoming.length === 0) return null;

  if (variant === "strip") {
    return (
      <section className="glass-panel rounded-[24px] p-4" aria-label="Token lineup">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold tracking-[-0.02em]">
            More tokens are coming
          </p>
          <span className="num text-[11px] text-ink-3">
            {live.length} loaded · {upcoming.length} next
          </span>
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
          The machine holds {live.map((e) => e.symbol ?? "?").join(" and ")}
          {" "}right now. These are going in next — they can&rsquo;t be pulled
          until they show as loaded.
        </p>

        {/* auto-fit rather than breakpoints: this strip renders both in a
            352px column and across the full width beneath the machine, and
            those are container widths, not viewport widths. */}
        <ul
          className="mt-3 grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          {upcoming.map((token) => (
            <li
              key={token.address}
              className="flex items-center gap-2.5 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-3 py-2.5"
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--edge-rgb)_/_0.8)] opacity-80 [container-type:inline-size]">
                <TokenAvatar
                  address={token.address}
                  symbol={token.symbol}
                  logoUrl={token.logo ?? market.get(token.address)?.logoUrl}
                  size={28}
                  rounded="none"
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                {token.name}
              </span>
              <span className="num shrink-0 text-[10.5px] text-ink-3">
                {!token.onThisChain
                  ? "Watching"
                  : token.allowlisted
                    ? "Approved"
                    : "Lined up"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="relative py-11 sm:py-14" aria-label="Token lineup">
      <PageContainer width="wide">
        <SectionHeader
          eyebrow="The lineup"
          title="What's in the machine."
          description="The tokens below are read straight from the pool contract — that's what's loaded right now. More are on the way."
          className="mb-6"
        />

        {live.length > 0 ? (
          <>
            <p className="micro mb-3">In the machine now</p>
            {/* A compact wrap of loaded tokens rather than a wall of cards —
                the full inventory, odds and amounts live on the pool page. */}
            <ul className="flex flex-wrap gap-2">
              {live.map((entry) => (
                <li
                  key={entry.token}
                  className="glass-chip flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3"
                  title="In the published reward slots right now"
                >
                  <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.85)] [container-type:inline-size]">
                    <TokenAvatar
                      address={entry.token}
                      symbol={entry.symbol}
                      logoUrl={market.get(entry.token)?.logoUrl}
                      size={24}
                      rounded="none"
                    />
                  </span>
                  <span className="num text-[12px] font-medium text-ink">
                    {entry.symbol ? `$${entry.symbol}` : (entry.name ?? "?")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="num mt-3 flex items-center gap-1.5 text-[12px] text-ink-3">
              <Check className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
              {live.length} reward {live.length === 1 ? "asset" : "assets"} loaded
              {upcoming.length ? ` · ${upcoming.length} next` : ""}
            </p>
          </>
        ) : null}

        {upcoming.length > 0 ? (
          <>
            <p className="micro mb-3 mt-8">Next in</p>
            <ul className="flex flex-wrap gap-2">
              {upcoming.map((token) => (
                <li
                  key={token.address}
                  className="glass-chip flex items-center gap-2 rounded-full py-1 pl-1.5 pr-2.5"
                  title={
                    !token.onThisChain
                      ? "Lives on another chain — needs a Robinhood Chain contract before it can be a reward"
                      : token.allowlisted
                        ? "Approved as a reward token on the registry, not yet in a pool"
                        : "Not yet approved on the registry"
                  }
                >
                  <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.85)] opacity-80 [container-type:inline-size]">
                    <TokenAvatar
                      address={token.address}
                      symbol={token.symbol}
                      logoUrl={token.logo ?? market.get(token.address)?.logoUrl}
                      size={24}
                      rounded="none"
                    />
                  </span>
                  <span className="num text-[12px] font-medium text-ink-2">${token.symbol}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-ink-3">
                    <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                    {!token.onThisChain ? "Watching" : token.allowlisted ? "Approved" : "Lined up"}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 max-w-[70ch] text-[11.5px] leading-relaxed text-ink-3">
              Being approved on the contract and stocked before they can pay out —
              until a token shows as loaded above it can&rsquo;t be pulled, and no
              odds or amounts are set for it yet.
              {upcoming.some((t) => !t.onThisChain) ? (
                <>{" "}<span className="text-ink-2">Watching</span> means it lives on another chain and needs a {NETWORK_LABEL} contract first.</>
              ) : null}
            </p>

            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {upcoming.map((token) => {
                // An address from another chain resolves to nothing on the
                // Robinhood explorer, which reads as a broken link rather than
                // as a token that lives somewhere else.
                const foreign = FOREIGN_CHAINS[token.chain ?? ""];
                const url = token.onThisChain
                  ? explorerUrl("token", token.address)
                  : foreign
                    ? `${foreign.explorer}${token.address}`
                    : null;
                return url ? (
                  <li key={token.address}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="num text-[11px] text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
                    >
                      ${token.symbol} {shortAddress(token.address)}
                    </a>
                  </li>
                ) : null;
              })}
            </ul>
          </>
        ) : null}
      </PageContainer>
    </section>
  );
}
