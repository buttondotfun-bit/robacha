"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageCircleQuestion, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ASSISTANT_ENTRIES,
  matchEntry,
  type AssistantAnswer,
  type AssistantContext,
  type AssistantEntry,
} from "@/lib/assistant/knowledge";
import { PUBLIC_PAID_SPINS_ENABLED } from "@/lib/config";
import { useMoneyState } from "@/lib/use-money-state";
import type { ActivePool, PoolReadiness } from "@/lib/use-pool";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";

/**
 * Help panel for the spin page.
 *
 * Answers come from a reviewed knowledge base, not a language model, and every
 * figure inside them is resolved from live contract state when the question is
 * asked. That is the whole point: these are questions about someone's money —
 * where it is, when it comes back, whether it is stuck — and on those, a
 * fluent guess is worse than no answer. When nothing matches, it says so and
 * hands off rather than improvising.
 */
export function SpinAssistant({
  pool,
  readiness,
  className,
}: {
  pool: ActivePool | null;
  readiness: PoolReadiness | null;
  className?: string;
}) {
  const wallet = useWallet();
  const money = useMoneyState();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<AssistantEntry | null>(null);
  const [missed, setMissed] = useState(false);

  const ctx: AssistantContext = useMemo(
    () => ({
      pool,
      readiness,
      money,
      connected: wallet.isConnected,
      spinsEnabled: PUBLIC_PAID_SPINS_ENABLED,
    }),
    [pool, readiness, money, wallet.isConnected],
  );

  const answer: AssistantAnswer | null = active ? active.answer(ctx) : null;

  // Money questions lead — they are why someone opens this.
  const suggestions = useMemo(() => {
    const order = { money: 0, timing: 1, playing: 2, trust: 3 } as const;
    return [...ASSISTANT_ENTRIES].sort(
      (a, b) => order[a.group] - order[b.group],
    );
  }, []);

  const filtered = query.trim()
    ? suggestions.filter((e) =>
        (e.question + " " + e.keywords.join(" "))
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
      )
    : suggestions;

  function ask(entry: AssistantEntry) {
    setActive(entry);
    setMissed(false);
    setQuery("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const hit = matchEntry(query);
    if (hit) {
      ask(hit);
      return;
    }
    setActive(null);
    setMissed(true);
  }

  return (
    <section
      className={cn("glass-card rounded-[22px] p-5", className)}
      aria-label="Spin help"
    >
      <div className="flex items-center gap-2">
        <span className="glass-micro grid h-8 w-8 place-items-center rounded-[11px]">
          <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold tracking-[-0.02em]">
            Questions about your money?
          </p>
          <p className="text-[11.5px] leading-snug text-ink-3">
            Straight answers, checked against the contract right now.
          </p>
        </div>
      </div>

      {/* A live money banner outranks anything the user might ask. */}
      {money.hasRefund ? (
        <div className="mt-4 rounded-[14px] border border-[#d8ecb0] bg-accent-soft px-3.5 py-3">
          <p className="text-[12.5px] font-medium text-accent-ink">
            You have {money.refundableDisplay} ETH to withdraw
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-accent-ink/80">
            From a spin that couldn&rsquo;t be completed. Only your wallet can
            take it out.
          </p>
          <Link
            href="/bag"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink underline decoration-dotted underline-offset-2"
          >
            Go to My Bag
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-4">
        <label htmlFor="assistant-q" className="sr-only">
          Ask a question about spinning
        </label>
        <div className="glass-input flex items-center gap-2 rounded-full px-3.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
          <input
            id="assistant-q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setMissed(false);
            }}
            placeholder="Ask anything — refunds, waiting, costs…"
            className="h-10 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setMissed(false);
              }}
              aria-label="Clear"
              className="shrink-0 text-ink-3 transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </form>

      {answer ? (
        <div
          className={cn(
            "mt-4 rounded-[16px] px-4 py-3.5",
            answer.tone === "warn"
              ? "border border-[#eadfc4] bg-[#fdfaf2]"
              : answer.tone === "good"
                ? "border border-[#d8ecb0] bg-accent-soft"
                : "bg-[rgb(var(--ink-rgb)_/_0.035)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-semibold leading-snug text-ink">
              {active?.question}
            </p>
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close answer"
              className="shrink-0 text-ink-3 transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {answer.body.map((paragraph, index) => (
            <p
              key={index}
              className="mt-2 text-[12.5px] leading-relaxed text-ink-2"
            >
              {paragraph}
            </p>
          ))}

          {answer.action ? (
            <Link
              href={answer.action.href}
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-ink underline decoration-dotted underline-offset-2 hover:text-accent-ink"
            >
              {answer.action.label}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {missed ? (
        <div className="mt-4 rounded-[16px] border border-[#eadfc4] bg-[#fdfaf2] px-4 py-3.5">
          <p className="text-[12.5px] font-medium text-ink">
            I don&rsquo;t have a checked answer for that one.
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
            I&rsquo;d rather say that than guess at something involving your
            money. Try one of the questions below, or the docs have the full
            detail.
          </p>
          <Link
            href="/docs"
            className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-ink underline decoration-dotted underline-offset-2"
          >
            Read the docs
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {filtered.map((entry) => (
          <li key={entry.id}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => ask(entry)}
              className={cn(
                "h-8 rounded-full px-3 text-[12px] font-normal",
                active?.id === entry.id && "border-[#d8ecb0] bg-accent-soft",
              )}
            >
              {entry.question}
            </Button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-3">
          Nothing matches &ldquo;{query}&rdquo;. Clear the box to see every
          question.
        </p>
      ) : null}
    </section>
  );
}
