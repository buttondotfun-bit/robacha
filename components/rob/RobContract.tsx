"use client";

import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { ROB_TOKEN } from "@/data/rob-token";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * The $ROB contract, shown the honest way, in the two shapes the app needs it.
 *
 * Both live here because the address is safety-critical: a ticker cannot be
 * owned, so this address is the only thing that tells the real token from a
 * copy, and every place it appears must copy cleanly and link somewhere the
 * reader can verify it. Doing that once means it can never drift between the
 * footer, the popover and the /rob page.
 */

/** The little "Official" shield. Marks the one real address, nothing more. */
export function RobOfficialPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent-ink",
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      Official
    </span>
  );
}

/**
 * Clipboard copy that degrades to selecting the address when the clipboard is
 * unavailable (insecure origin, denied permission). The address is the one
 * value on any page where a person quietly assuming they copied it, then
 * pasting something else into a wallet, costs them money — so failure selects
 * the node rather than silently doing nothing.
 */
function useCopyRobAddress(nodeId?: string) {
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ROB_TOKEN.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_400);
    } catch {
      if (!nodeId) return;
      const node = document.getElementById(nodeId);
      if (!node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setSelected(true);
      setTimeout(() => setSelected(false), 4_000);
    }
  }, [nodeId]);

  return { copied, selected, copy };
}

/**
 * The full address as a verifiable block: whole (never truncated), selectable,
 * with a copy button and an explorer link. This is the safety control — used in
 * the footer and on the /rob page wherever "here is the real contract" needs to
 * stand on its own.
 */
export function RobContractLine({ className }: { className?: string }) {
  const addressId = useId();
  const { copied, selected, copy } = useCopyRobAddress(addressId);
  const tokenLink = explorerUrl("token", ROB_TOKEN.address);

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.045)] p-3.5 sm:flex-row sm:items-center">
        <code
          id={addressId}
          className="num min-w-0 flex-1 break-all text-[13px] leading-relaxed text-ink select-all"
        >
          {ROB_TOKEN.address}
        </code>
        <button
          type="button"
          onClick={copy}
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

      {selected ? (
        <p role="status" className="mt-2 text-[11.5px] text-ink-3">
          Your browser blocked the clipboard, so we selected the address instead
          — copy it with your keyboard.
        </p>
      ) : null}

      {tokenLink ? (
        <a
          href={tokenLink}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 underline decoration-dotted underline-offset-4 hover:text-ink"
        >
          Verify it on the explorer
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

/**
 * A compact one-line badge: short address + copy button, for dense surfaces
 * like the header popover where the full block would not fit. The full address
 * is always one verify-link away, so shortening here is fine — this is a
 * convenience, not the safety control.
 */
export function RobContractBadge({ className }: { className?: string }) {
  const { copied, copy } = useCopyRobAddress();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-[rgb(var(--ink-rgb)_/_0.045)] py-1 pl-3 pr-1.5",
        className,
      )}
    >
      <span className="num min-w-0 flex-1 truncate text-[11.5px] text-ink-2">
        {shortAddress(ROB_TOKEN.address, 6)}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy the $ROB contract address"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-[rgb(var(--edge-rgb)_/_0.6)] hover:text-ink"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
