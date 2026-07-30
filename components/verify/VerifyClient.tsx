"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Clock, Loader2, Search, X } from "lucide-react";
import type { RoundProof } from "@/app/api/round-proof/[roundId]/route";
import { Button } from "@/components/ui/Button";
import { explorerUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Check a round for yourself.
 *
 * Every product in this category says it is fair. The difference here is that
 * the claim decomposes into four things a stranger can check, and this page
 * checks them in front of you rather than showing a badge.
 *
 * It is built to be able to say no. A verifier that can only ever come back
 * green is decoration, so failed and unknown states are rendered as plainly as
 * passing ones, and every raw value used is on the page so the arithmetic can
 * be redone somewhere we did not write.
 */
export function VerifyClient() {
  const [input, setInput] = useState("");
  const [proof, setProof] = useState<RoundProof | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const check = useCallback(async (roundId: string) => {
    const id = Number(roundId);
    if (roundId !== "latest" && (!Number.isInteger(id) || id <= 0)) {
      setError("Enter a round number.");
      return;
    }
    setLoading(true);
    setError(null);
    setProof(null);
    setShowRaw(false);
    try {
      const response = await fetch(`/api/round-proof/${roundId === "latest" ? "latest" : id}`);
      if (!response.ok) throw new Error("could not read the chain");
      setProof((await response.json()) as RoundProof);
    } catch {
      setError("Couldn't reach the chain just now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Open on the newest revealed round, so the page proves something before
  // anyone types. Resolved server-side, since the newest round overall is
  // usually still open and has nothing to prove yet.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded) return;
    setSeeded(true);
    void check("latest");
  }, [seeded, check]);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void check(input);
        }}
        className="glass-panel flex flex-wrap items-center gap-2 rounded-[20px] p-3"
      >
        <label htmlFor="round" className="sr-only">
          Round number
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-[rgba(16,17,15,0.04)] px-3">
          <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <input
            id="round"
            value={input}
            onChange={(event) => setInput(event.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Round number, e.g. 3"
            className="num h-11 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Check it
        </Button>
      </form>

      {error ? (
        <p className="glass-card rounded-[16px] px-4 py-3 text-[12.5px] text-ink-2">{error}</p>
      ) : null}

      {proof && !proof.available ? (
        <div className="glass-card rounded-[20px] p-5">
          <p className="text-[13.5px] font-semibold">Nothing to check yet</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{proof.reason}</p>
        </div>
      ) : null}

      {proof?.available ? (
        <>
          <div className="glass-panel rounded-[24px] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-section-title text-[19px]">Round #{proof.roundId}</h2>
              <span className="num text-[12px] text-ink-3">{proof.state}</span>
            </div>

            <ol className="mt-4 space-y-3">
              {proof.checks.map((item, index) => (
                <li key={item.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      item.passed === true
                        ? "bg-accent-soft text-accent-ink"
                        : item.passed === false
                          ? "bg-[#fdecec] text-[#8f3434]"
                          : "bg-[rgba(16,17,15,0.06)] text-ink-3",
                    )}
                  >
                    {item.passed === true ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : item.passed === false ? (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold tracking-[-0.02em]">
                      {index + 1}. {item.label}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {proof.checks.every((c) => c.passed === true) ? (
              <p className="mt-5 rounded-[14px] bg-accent-soft px-4 py-3 text-[12.5px] leading-relaxed text-accent-ink">
                All four hold. The number that decided this round was sealed
                before anyone entered, and it recomputes from published inputs —
                which means it could not have been picked to suit any result.
              </p>
            ) : (
              <p className="mt-5 rounded-[14px] bg-[rgba(16,17,15,0.05)] px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
                Not every step could be confirmed. The raw values are below —
                check them yourself, and tell us what you find.
              </p>
            )}
          </div>

          <div className="glass-card rounded-[20px] p-5">
            <button
              type="button"
              onClick={() => setShowRaw((open) => !open)}
              aria-expanded={showRaw}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="text-[13px] font-semibold tracking-[-0.02em]">
                  Do it yourself
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-3">
                  Every value the check used. Nothing here comes from us — it is
                  all readable on the contracts.
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-ink-3 transition-transform",
                  showRaw && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {showRaw ? (
              <>
                <p className="mt-4 rounded-[12px] bg-[rgba(16,17,15,0.04)] px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2">
                  <span className="num">
                    keccak256(abi.encode(secret, chainId, randomnessContract,
                    roundId, entrantEntropy))
                  </span>
                  <span className="mt-1 block text-ink-3">
                    Run that and you should get the number below. Entrant entropy
                    is each entrant&rsquo;s address folded in order:{" "}
                    <span className="num">
                      entropy = keccak256(abi.encode(entropy, i, entrant))
                    </span>
                    , starting from zero.
                  </span>
                </p>

                <dl className="mt-3 space-y-2">
                  {Object.entries(proof.values).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex flex-col gap-0.5 border-t border-[rgba(20,24,18,0.07)] pt-2 sm:flex-row sm:items-baseline sm:gap-3"
                    >
                      <dt className="num shrink-0 text-[11px] text-ink-3 sm:w-52">{key}</dt>
                      <dd className="num min-w-0 break-all text-[11.5px] text-ink">
                        {value === null ? "—" : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {typeof proof.values.revealTx === "string" ? (
                  <a
                    href={explorerUrl("tx", proof.values.revealTx) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block text-[11.5px] text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
                  >
                    The reveal transaction, where the secret was published
                  </a>
                ) : null}
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
