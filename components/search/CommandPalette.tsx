"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Coins, FileText, Search, TrendingUp } from "lucide-react";
import { buildSearchItems, searchItems, type SearchItem, type SearchKind } from "@/lib/search-index";
import { cn } from "@/lib/utils";

/**
 * The ⌘K universal search palette.
 *
 * Mounted once, globally. Opens on ⌘K / Ctrl+K or a `robacha:search` event (the
 * header search buttons dispatch it, so the same palette serves keyboard and
 * touch). It searches the static index in lib/search-index — machines, curated
 * projects and destinations — so it only ever matches things that exist and
 * never fetches or fabricates. Full keyboard control; navigating closes it.
 */

const KIND_ICON: Record<SearchKind, typeof Search> = {
  machine: Coins,
  project: Boxes,
  page: FileText,
};

const KIND_LABEL: Record<SearchKind, string> = {
  machine: "Machine",
  project: "Project",
  page: "Page",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  // Open on ⌘K / Ctrl+K, and on the header's custom event.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("robacha:search", onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("robacha:search", onEvent);
    };
  }, []);

  // Only mount the panel while open, so its query/selection start fresh every
  // time — no reset-in-effect, and closed means zero cost.
  if (!open) return null;
  return <Palette onClose={() => setOpen(false)} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => buildSearchItems(), []);
  const results = useMemo(() => searchItems(all, query), [all, query]);

  // Focus the input and lock body scroll for the palette's lifetime. These are
  // DOM side effects, not React state, so they belong in an effect.
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, []);

  function go(item: SearchItem | undefined) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search Robacha"
    >
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div className="glass-panel relative w-full max-w-[560px] overflow-hidden rounded-[20px] shadow-[0_30px_80px_-24px_rgb(var(--ink-rgb)_/_0.4)]">
        <div className="flex items-center gap-2.5 border-b border-[rgb(var(--line-rgb)_/_0.08)] px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search machines, projects, pages…"
            className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden shrink-0 rounded-md border border-[rgb(var(--line-rgb)_/_0.12)] px-1.5 py-0.5 text-[10px] font-medium text-ink-3 sm:block">Esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-ink-3">No matches. Try a machine, project or page.</p>
          ) : (
            <ul>
              {results.map((item, i) => {
                const Icon = KIND_ICON[item.kind];
                const StockIcon = item.id === "machine-tokenized-stocks" ? TrendingUp : Icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors",
                        i === active ? "bg-[rgb(var(--ink-rgb)_/_0.05)]" : "hover:bg-[rgb(var(--ink-rgb)_/_0.03)]",
                      )}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-ink">
                        <StockIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13.5px] font-medium text-ink">{item.title}</span>
                          {item.status === "live" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(142,197,0,0.16)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#3f7d17]">
                              <span className="h-1 w-1 rounded-full bg-[#8ec500]" aria-hidden="true" /> Live
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-[11.5px] text-ink-3">{item.subtitle}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[rgb(var(--ink-rgb)_/_0.04)] px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.05em] text-ink-3">
                        {KIND_LABEL[item.kind]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
