"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DocSection } from "@/data/docs";

/**
 * Sticky section index.
 *
 * The active item follows an IntersectionObserver rather than a scroll
 * listener, so it costs nothing per frame and stays correct when the user jumps
 * via an anchor.
 */
export function DocsNav({ sections }: { sections: DocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost intersecting section wins, so scrolling up selects the
        // section coming into view rather than the one leaving it.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Bias the band toward the top of the viewport, under the floating header.
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Documentation sections" className="lg:sticky lg:top-24 lg:self-start">
      <p className="micro mb-3">On this page</p>
      <ul className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:px-0">
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <li key={section.id} className="shrink-0 lg:shrink">
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-[10px] px-3 py-2 text-[13px] transition-colors lg:whitespace-normal",
                  isActive
                    ? "bg-[rgba(204,255,0,0.28)] font-medium text-accent-ink"
                    : "text-ink-2 hover:bg-[rgb(var(--ink-rgb)_/_0.04)] hover:text-ink",
                )}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
