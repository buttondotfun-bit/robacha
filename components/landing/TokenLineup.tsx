"use client";

import { Check, Clock } from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useLineup } from "@/lib/use-lineup";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";

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
  const { tokens: upcoming } = useLineup();

  // One card per token, not per reward slot — a token in two tiers is still
  // one token, and listing it twice would overstate the lineup.
  const live = Array.from(
    new Map((pool?.entries ?? []).map((entry) => [entry.token.toLowerCase(), entry])).values(),
  );

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
                  logoUrl={market.get(token.address)?.logoUrl}
                  size={28}
                  rounded="none"
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                {token.name}
              </span>
              <span className="num shrink-0 text-[10.5px] text-ink-3">
                {token.allowlisted ? "Approved" : "Lined up"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="relative py-16 sm:py-20" aria-label="Token lineup">
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
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {live.map((entry) => (
                <li
                  key={entry.token}
                  className="glass-card flex items-center gap-3 rounded-[18px] p-4"
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.85)] [container-type:inline-size]">
                    <TokenAvatar
                      address={entry.token}
                      symbol={entry.symbol}
                      logoUrl={market.get(entry.token)?.logoUrl}
                      size={40}
                      rounded="none"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold tracking-[-0.02em]">
                      {entry.name ?? entry.symbol ?? "Unknown token"}
                    </p>
                    <p className="num truncate text-[11.5px] text-ink-3">
                      ${entry.symbol ?? "?"}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent-ink"
                    title="In the published reward slots right now"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Loaded
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {upcoming.length > 0 ? (
          <>
            <p className="micro mb-3 mt-8">Next in</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((token) => (
                <li
                  key={token.address}
                  className="glass-card flex items-center gap-3 rounded-[18px] p-4"
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.85)] opacity-70 [container-type:inline-size]">
                    <TokenAvatar
                      address={token.address}
                      symbol={token.symbol}
                      logoUrl={market.get(token.address)?.logoUrl}
                      size={40}
                      rounded="none"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold tracking-[-0.02em]">
                      {token.name}
                    </p>
                    <p className="num truncate text-[11.5px] text-ink-3">
                      ${token.symbol}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] px-2 py-0.5 text-[10.5px] font-medium text-ink-3"
                    title={
                      token.allowlisted
                        ? "Approved as a reward token on the registry, not yet in a pool"
                        : "Not yet approved on the registry"
                    }
                  >
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {token.allowlisted ? "Approved" : "Lined up"}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 max-w-[76ch] text-[11.5px] leading-relaxed text-ink-3">
              These are going in — we&rsquo;re working through approving each
              one on the contract and stocking the vault before it can pay out.
              Until a token shows as loaded above, it isn&rsquo;t in the machine
              and can&rsquo;t be pulled. No odds or amounts are set for them yet,
              so we&rsquo;re not going to invent any.
              {upcoming.some((t) => t.allowlisted) ? (
                <>
                  {" "}
                  &ldquo;Approved&rdquo; means the pool registry accepts it as a
                  reward token — you can check that yourself on the contract.
                </>
              ) : null}
            </p>

            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {upcoming.map((token) => {
                const url = explorerUrl("token", token.address);
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
