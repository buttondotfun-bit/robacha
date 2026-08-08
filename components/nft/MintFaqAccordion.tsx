"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NFT_FACTS } from "@/data/nft";
import { cn } from "@/lib/utils";

/**
 * The mint FAQ as accordion rows — same honest answers as before, far less
 * visual weight. First row open by default so the section never reads as empty.
 */
export function MintFaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="glass-card overflow-hidden rounded-[20px]">
      {NFT_FACTS.map((fact, i) => {
        const isOpen = open === i;
        return (
          <div key={fact.question} className={cn(i > 0 && "border-t border-[rgb(var(--line-rgb)_/_0.08)]")}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{fact.question}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {isOpen ? (
              <p className="px-5 pb-4 text-[12.5px] leading-relaxed text-ink-2">{fact.answer}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
