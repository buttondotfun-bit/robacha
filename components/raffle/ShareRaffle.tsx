"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";

/**
 * Share the raffle — copy the direct link or open a pre-filled X post. Nothing
 * is posted automatically; the X action just opens the composer. The URL is the
 * page's own canonical link, so a shared raffle always resolves to a real page.
 */
export function ShareRaffle() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function url(): string {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }

  function copy() {
    void navigator.clipboard?.writeText(url()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  const tweet = `https://x.com/intent/tweet?text=${encodeURIComponent(
    "I'm entering the Meebit raffle on @robachadotfun 🎰\n\n200 tickets. One Meebit.",
  )}&url=${encodeURIComponent(url())}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="glass-chip inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Share
      </button>
      {open ? (
        <div role="menu" className="glass-nav glass-reflection absolute right-0 top-[calc(100%+8px)] z-40 w-[200px] rounded-[16px] p-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a
            role="menuitem"
            href={tweet}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Share to X
          </a>
        </div>
      ) : null}
    </div>
  );
}
