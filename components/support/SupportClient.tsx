"use client";

import { useState } from "react";
import { CheckCircle2, Clock, ExternalLink, Loader2, Wallet } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { Button } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/lib/constants";
import { RoundState, usePendingSpins } from "@/lib/use-pending-spins";
import { useWallet } from "@/lib/use-wallet";

/**
 * Where someone goes when their money looks stuck.
 *
 * The first thing here is a diagnostic, not a contact form, because most of
 * what people would write in asking about is answerable from chain state and
 * fixable by them without waiting for a reply. A round that has closed but not
 * settled can be pushed along by anyone — including the person waiting on it —
 * so this offers that directly.
 *
 * The contact links come after, and they are the accounts that actually exist.
 * Nothing here promises a response time we have not committed to.
 */

const X_LINK = SOCIAL_LINKS[0];

export function SupportClient() {
  const wallet = useWallet();
  // usePendingSpins polls on its own, so a pushed round updates without
  // anything here having to refetch it.
  const { pending, isLoading } = usePendingSpins();

  return (
    <div className="space-y-8">
      <section>
        <header className="mb-3">
          <h2 className="text-section-title text-[19px]">Check a spin</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            Connect the wallet you spun with and this reads its exact state from
            the contract. Most stuck spins can be unstuck from here.
          </p>
        </header>

        <div className="glass-panel rounded-[24px] p-5">
          {!wallet.isConnected ? (
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
              <p className="text-[12.5px] text-ink-2">
                Connect your wallet to see the state of your spins.
              </p>
            </div>
          ) : isLoading ? (
            <p className="text-[12.5px] text-ink-3">Reading the contract…</p>
          ) : pending.length === 0 ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold">
                  Nothing of yours is waiting.
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                  This wallet has no spin mid-flight. Anything you have already
                  won is in My Bag, claimed or ready to claim.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {pending.map((row) => (
                <StuckRow key={row.roundId} row={row} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <header className="mb-3">
          <h2 className="text-section-title text-[19px]">Still stuck?</h2>
        </header>

        <div className="glass-panel space-y-4 rounded-[24px] p-5">
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            Message us on X with your wallet address and the round number from
            above. Those two things are enough to look anything up — never send
            anyone your seed phrase or private key, including us. We will never
            ask for either.
          </p>

          <a
            href={X_LINK.href}
            target="_blank"
            rel="noreferrer"
            className="glass-chip inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium text-ink"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {X_LINK.handle}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>

          <p className="border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4 text-[11.5px] leading-relaxed text-ink-3">
            Everything this platform does is on chain, so you can also verify
            any of it yourself without us — every round, entry and payout is
            public.
          </p>
        </div>
      </section>
    </div>
  );
}

function StuckRow({
  row,
}: {
  row: ReturnType<typeof usePendingSpins>["pending"][number];
}) {
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // A round still inside its own window is not stuck; it is waiting for
  // entrants, and there is nothing to push.
  const canPush = row.state !== RoundState.Open && !row.withdrawable;

  async function push() {
    setWorking(true);
    setResult(null);
    try {
      const response = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: row.roundId }),
      });
      const body = (await response.json()) as { ok?: boolean; state?: string };
      setResult(
        body.ok
          ? `Round is now ${body.state}.`
          : "That did not go through. Try again shortly, or message us.",
      );
    } catch {
      setResult("Could not reach the server. Try again shortly.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <li className="rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.035)] px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold">{row.label}</p>
        <span className="num shrink-0 text-[11px] text-ink-3">
          round #{row.roundId} · {row.entries} {row.entries === 1 ? "spin" : "spins"}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{row.detail}</p>

      {row.withdrawable ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-accent-ink">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Your money is waiting in My Bag — go there to withdraw it.
        </p>
      ) : canPush ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={() => void push()} disabled={working}>
            {working ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            {working ? "Pushing it along…" : "Push this round along"}
          </Button>
          {result ? <p className="text-[12px] text-ink-2">{result}</p> : null}
        </div>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Still taking entries — nothing to fix yet.
        </p>
      )}
    </li>
  );
}
