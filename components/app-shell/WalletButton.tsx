"use client";

import { Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { shortAddress } from "@/lib/formatters";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import { explorerUrl, NETWORK_LABEL } from "@/lib/web3";
import { Button } from "@/components/ui/Button";

export function WalletButton({ className }: { className?: string }) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!wallet.isConnected) {
    return (
      <Button
        variant="primary"
        onClick={() => void wallet.connect()}
        disabled={wallet.isConnecting || !wallet.hasWallet}
        title={
          wallet.hasWallet
            ? undefined
            : "No browser wallet detected. Install one to connect."
        }
        className={className}
      >
        <Wallet className="h-4 w-4" aria-hidden="true" />
        {wallet.isConnecting
          ? "Connecting…"
          : wallet.hasWallet
            ? "Connect Wallet"
            : "No Wallet Found"}
      </Button>
    );
  }

  const address = wallet.address ?? "";
  const addressLink = explorerUrl("address", address);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="glass-chip inline-flex h-10 items-center gap-2 rounded-full px-3 pr-3.5 text-sm font-medium text-ink"
      >
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] shadow-[0_1px_3px_rgb(var(--ink-rgb)_/_0.18)]"
          style={{
            background: `conic-gradient(from 140deg, #ff9ec4, #ccff00, #a9d3f5, #ff9ec4)`,
          }}
          aria-hidden="true"
        />
        <span className="num text-[13px]">{shortAddress(address)}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="glass-nav glass-reflection absolute right-0 top-[calc(100%+10px)] z-50 w-[268px] rounded-[20px] p-2"
        >
          <div className="px-2 pb-2 pt-1">
            <p className="micro">Connected wallet</p>
            <p className="num mt-1 break-all text-[12px] text-ink-2">
              {address}
            </p>
            {wallet.balance ? (
              <p className="num mt-2 text-[12px] text-ink">{wallet.balance}</p>
            ) : null}
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#8ec500]"
                aria-hidden="true"
              />
              {NETWORK_LABEL}
            </p>
          </div>

          <div className="my-1 h-px bg-[rgb(var(--line-rgb)_/_0.08)]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void navigator.clipboard?.writeText(address).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1_400);
              });
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? "Address copied" : "Copy address"}
          </button>

          {addressLink ? (
            <a
              role="menuitem"
              href={addressLink}
              target="_blank"
              rel="noreferrer noopener"
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View on explorer
            </a>
          ) : null}

          <Link
            role="menuitem"
            href="/bag"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
          >
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            View My Bag
          </Link>

          <div className="my-1 h-px bg-[rgb(var(--line-rgb)_/_0.08)]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void wallet.disconnect();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
