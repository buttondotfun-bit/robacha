"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Coins, Dice5, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * What this is, for someone who has never seen it.
 *
 * A first-time visitor previously met a wallet button, a carousel and a lot of
 * nouns — pool, round, tier, draw fee — with no explanation of the shape of the
 * thing. People who do not already know how a gacha works were left to infer
 * it from a price breakdown.
 *
 * Four steps, no marketing. It says what happens, what it costs, that it is
 * chance, and where the money goes, because someone deciding whether to spend
 * needs those four things and nothing else. It never claims a return.
 *
 * Shown once and remembered locally. Deliberately not gated behind the legal
 * consent dialog: that one is a decision, this one is an explanation, and
 * stacking two modals on a first visit would get both dismissed unread.
 */

const KEY = "robacha.walkthrough.seen";

const STEPS = [
  {
    icon: Dice5,
    title: "It's a prize machine",
    body: "You pay for a spin and the machine gives you a random token. Which one, and how much, is down to chance — the odds are published on the page and they never change between spins.",
  },
  {
    icon: Wallet,
    title: "Spins go in a round of five",
    body: "Your spin joins a round. When five are in — or two minutes pass — the round closes and everyone's prize is worked out at once. Usually a couple of minutes, and you don't have to wait on the page.",
  },
  {
    icon: ShieldCheck,
    title: "We can't pick what you get",
    body: "The random number is sealed before your round even opens, then mixed with everyone who enters. We can refuse to unseal it, and then the round is cancelled and everyone gets a full refund — publicly recorded. What we can't do is choose your reward.",
  },
  {
    icon: Coins,
    title: "It's real money, and it can go down",
    body: "You're buying tokens whose value moves. Most of your spin price goes into the prize pool, and the rest is split between us and running costs — the exact split is shown before you sign. Only spend what you'd be fine losing.",
  },
];

export function Walkthrough() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only where someone might actually spend. Landing on /bag or /activity
    // first is rare and this would be an interruption rather than a help.
    if (pathname !== "/app") return;
    try {
      if (window.localStorage.getItem(KEY) === "1") return;
    } catch {
      return;
    }
    setOpen(true);
  }, [pathname]);

  function close() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* private mode; it will show again, which is the safe direction */
    }
    setOpen(false);
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="How this works"
      description={`${step + 1} of ${STEPS.length}`}
    >
      <div className="flex gap-3.5 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.035)] p-4">
        <span className="glass-micro grid h-9 w-9 shrink-0 place-items-center rounded-xl">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold tracking-[-0.02em]">
            {current.title}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
            {current.body}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <ol className="flex items-center gap-1.5" aria-label="Progress">
          {STEPS.map((s, index) => (
            <li
              key={s.title}
              aria-current={index === step ? "step" : undefined}
              className={`h-1.5 rounded-full transition-all ${
                index === step
                  ? "w-5 bg-ink"
                  : index < step
                    ? "w-1.5 bg-ink-3"
                    : "w-1.5 bg-[rgb(var(--ink-rgb)_/_0.15)]"
              }`}
            />
          ))}
        </ol>

        <div className="flex gap-2">
          {step > 0 ? (
            <Button variant="secondary" size="md" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="secondary" size="md" onClick={close}>
              Skip
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={() => (last ? close() : setStep((s) => s + 1))}
          >
            {last ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
