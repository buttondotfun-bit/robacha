"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { ROB_TOKEN } from "@/data/rob-token";
import { explorerUrl } from "@/lib/config";
import { NETWORK_LABEL } from "@/lib/web3";

/**
 * The official $ROB contract address.
 *
 * Published for one reason: a ticker cannot be owned, so the address is the
 * only thing that tells the real token apart from a copy deployed under the
 * same symbol. That makes this section a safety control rather than
 * promotion, and it shapes every decision below.
 *
 * The address is shown in full rather than truncated. A shortened address is
 * exactly what an impersonator needs — matching first and last characters is
 * cheap to grind, and someone comparing `0x7B7D…5b7E` against a fake has
 * checked almost nothing. It is also selectable text with a copy button, so
 * nobody has to retype it, since a hand-copied address is how people lose
 * money to a single wrong character.
 *
 * The explorer link matters as much as the address. Anyone can put an address
 * on a website; the point is that the reader can leave and verify the symbol
 * and supply against the chain rather than trusting this page.
 *
 * No price, market cap, or utility claim. $ROB does nothing in the product
 * today — spins are priced in native ETH and the gacha has no ERC-20 payment
 * path — so anything beyond identity would be a promise the contracts do not
 * back.
 */
const addressId = "rob-contract-address";

export function RobToken() {
  const [copied, setCopied] = useState(false);
  /** True when the clipboard refused and the address was selected instead. */
  const [fallback, setFallback] = useState(false);
  const tokenLink = explorerUrl("token", ROB_TOKEN.address);

  return (
    <section className="relative py-16 sm:py-20" aria-label="ROB token contract">
      <PageContainer width="wide">
        <SectionHeader
          eyebrow="Our token"
          title={`This is the real $${ROB_TOKEN.symbol}.`}
          description="Anyone can launch a token using our ticker, and people do. The address below is the only one that's ours — check it before you buy anything."
          className="mb-6"
        />

        <div className="glass-card rounded-[22px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.02em]">
              ${ROB_TOKEN.symbol}
            </span>
            <span className="num text-[12.5px] text-ink-3">{ROB_TOKEN.name}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent-ink">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Official
            </span>
          </div>

          <p className="micro mb-2 mt-5">Contract address</p>

          {/* Shown whole, and wrapped rather than truncated — a shortened
              address is not something a reader can actually check. */}
          <div className="flex flex-col gap-3 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.045)] p-3.5 sm:flex-row sm:items-center">
            <code
              id={addressId}
              className="num min-w-0 flex-1 break-all text-[13px] leading-relaxed text-ink select-all"
            >
              {ROB_TOKEN.address}
            </code>
            <button
              type="button"
              onClick={async () => {
                // The clipboard is not guaranteed: the API is missing on an
                // insecure origin and rejects when permission is denied. An
                // unhandled rejection would leave the button silently saying
                // "Copy" forever, and this is the one value on the page where
                // a person quietly assuming they copied it, then pasting
                // something else into a wallet, costs them money. On failure
                // the address is selected instead, so the manual copy they now
                // have to do is one keystroke rather than a careful retype.
                try {
                  await navigator.clipboard.writeText(ROB_TOKEN.address);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1_400);
                } catch {
                  const node = document.getElementById(addressId);
                  if (!node) return;
                  const range = document.createRange();
                  range.selectNodeContents(node);
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  setFallback(true);
                  setTimeout(() => setFallback(false), 4_000);
                }
              }}
              className="glass-quiet inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Announced politely rather than as an error: nothing is broken,
              the address is simply now selected and waiting to be copied. */}
          {fallback ? (
            <p role="status" className="mt-2 text-[11.5px] text-ink-3">
              Your browser blocked the clipboard, so we selected the address
              instead — copy it with your keyboard.
            </p>
          ) : null}

          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { term: "Network", value: NETWORK_LABEL },
              { term: "Decimals", value: String(ROB_TOKEN.decimals) },
              {
                term: "Total supply",
                value: ROB_TOKEN.totalSupply.toLocaleString("en-US"),
              },
            ].map((row) => (
              <div
                key={row.term}
                className="rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-3.5 py-3"
              >
                <dt className="micro">{row.term}</dt>
                <dd className="num mt-1 text-[13px] text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>

          {tokenLink ? (
            <a
              href={tokenLink}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 underline decoration-dotted underline-offset-4 hover:text-ink"
            >
              Check it on the explorer
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}

          <p className="mt-4 max-w-[76ch] text-[11.5px] leading-relaxed text-ink-3">
            Those figures come from the contract itself — symbol, decimals and
            supply are all things you can read back on the explorer rather than
            take from us. $ROB doesn&rsquo;t do anything in the machine yet:
            spins are paid in ETH, and we&rsquo;ll say so here if that ever
            changes. We will never DM you asking you to buy it.
          </p>
        </div>
      </PageContainer>
    </section>
  );
}
