"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useConsent } from "@/lib/use-consent";

/**
 * One-time acknowledgement before using the paid product.
 *
 * Three separate checkboxes rather than a single "I agree to everything": each
 * one is a distinct claim, and bundling them is how people end up agreeing to
 * things they never read. Nothing is pre-ticked and the button stays disabled
 * until all three are set, so acceptance is always a deliberate act.
 *
 * This gate is a browser-local UX control. It does not verify age, it does not
 * check location, and it is not a substitute for real onboarding checks. It
 * also cannot be more meaningful than the documents behind it — those are
 * still drafting outlines pending review.
 */
export function EntryGate() {
  const { legal, acceptLegal } = useConsent();
  const [checks, setChecks] = useState({ age: false, terms: false, risk: false });

  const ready = checks.age && checks.terms && checks.risk;

  if (legal) return null;

  return (
    <Dialog
      open
      dismissible={false}
      onClose={() => {
        /* Unreachable: the gate is not dismissible. */
      }}
      title="Before you spin"
      description="ROBACHA is a paid, chance-based product. Please confirm three things."
    >
      <div className="space-y-3">
        <Check
          checked={checks.age}
          onChange={(v) => setChecks((c) => ({ ...c, age: v }))}
        >
          I am 18 or older, and old enough to use a paid chance-based product
          where I live.
        </Check>

        <Check
          checked={checks.terms}
          onChange={(v) => setChecks((c) => ({ ...c, terms: v }))}
        >
          I&rsquo;ve read the{" "}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-ink">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
            Privacy Policy
          </Link>
          .
        </Check>

        <Check
          checked={checks.risk}
          onChange={(v) => setChecks((c) => ({ ...c, risk: v }))}
        >
          I understand every spin is chance, that tokens can lose value, and
          that money spent on spins is spent — not invested.{" "}
          <Link href="/legal/risk" className="underline underline-offset-2 hover:text-ink">
            Risk Disclosure
          </Link>
        </Check>
      </div>

      <p className="mt-5 text-[11.5px] leading-relaxed text-ink-3">
        ROBACHA is an independent project built for Robinhood Chain. It is not
        affiliated with, endorsed by, or operated by Robinhood. If a chance-based
        product is restricted where you live, please don&rsquo;t use it.
      </p>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-6"
        disabled={!ready}
        onClick={acceptLegal}
      >
        {ready ? "Continue" : "Tick all three to continue"}
      </Button>
    </Dialog>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-[rgba(16,17,15,0.035)] px-4 py-3.5 transition-colors hover:bg-[rgba(16,17,15,0.055)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#8ec500]"
      />
      <span className="text-[12.5px] leading-[1.65] text-ink-2">{children}</span>
    </label>
  );
}
