"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  question: string;
  answer: string;
}

export function Accordion({
  items,
  className,
  defaultOpen,
}: {
  items: AccordionItem[];
  className?: string;
  /** Index opened on first render, or none. */
  defaultOpen?: number;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen ?? null);
  const baseId = useId();

  return (
    <div
      className={cn("divide-y divide-[rgba(20,24,18,0.08)]", className)}
    >
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        return (
          <div
            key={item.question}
            className={cn(
              "-mx-3 rounded-2xl px-3 transition-colors duration-200",
              // The active row lights up from within the glass.
              isOpen && "bg-[rgba(255,255,255,0.5)]",
            )}
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-ink-2"
              >
                <span className="text-[15.5px] font-medium tracking-[-0.022em]">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "glass-chip grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen && "rotate-45",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[68ch] pb-5 pr-10 text-[14px] leading-relaxed text-ink-2">
                    {item.answer}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
