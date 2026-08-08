"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, Layers, Sparkles, X } from "lucide-react";

/**
 * A one-time welcome for first-time visitors.
 *
 * Shown once, then never again — dismissal is remembered in localStorage
 * (`robacha:welcomed`), so this is a device-local nudge, not tracking. It reads
 * that key before painting anything, opening only when it's absent, and closing
 * writes it. Nothing here spins, charges or fabricates: it's three honest lines
 * about what Robacha is, and every path out is a real link. Respects
 * prefers-reduced-motion via the shared globals.
 */

const KEY = "robacha:welcomed";

const POINTS = [
  { icon: Compass, title: "Discover", body: "Projects across Robinhood Chain, surfaced by real on-chain activity." },
  { icon: Sparkles, title: "Spin", body: "Pull a reward from a transparent pool with published odds." },
  { icon: Layers, title: "Collect", body: "Rewards land in your wallet. Everything's verifiable." },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(KEY) === "1";
    } catch {
      seen = true; // storage blocked → don't nag
    }
    if (!seen) {
      // A short beat so it doesn't fight the first paint.
      const t = window.setTimeout(() => setOpen(true), 650);
      return () => window.clearTimeout(t);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={dismiss} aria-hidden="true" />

      <div className="glass-panel glass-reflection relative w-full max-w-[440px] overflow-hidden rounded-[24px] p-6 shadow-[0_30px_80px_-24px_rgb(var(--ink-rgb)_/_0.4)]">
        <span className="noise-overlay" aria-hidden="true" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-[rgb(var(--ink-rgb)_/_0.05)] hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative">
          <span className="micro text-accent-ink">Welcome to Robacha</span>
          <h2 id="welcome-title" className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">
            The discovery layer for Robinhood Chain.
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            Spin transparent reward pools and discover projects across the
            ecosystem — with published odds and verifiable draws.
          </p>

          <ul className="mt-5 space-y-3">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.title} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-soft text-accent-ink">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold tracking-[-0.01em]">{p.title}</span>
                    <span className="block text-[12px] leading-relaxed text-ink-2">{p.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/app"
              onClick={dismiss}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(204,255,0,0.98),rgba(186,232,0,0.98))] px-5 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)]"
            >
              Spin the machine <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="glass-chip inline-flex h-11 items-center justify-center rounded-full px-5 text-[14px] font-semibold text-ink"
            >
              Look around
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
