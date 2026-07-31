"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades its children up as they scroll into view.
 *
 * Written so a failure can never hide content. The hidden state is applied by
 * the effect rather than in the server markup, so if the script never runs, the
 * observer is unsupported, or the user has asked for reduced motion, the
 * children are simply visible — the default is "shown" and the animation is the
 * exception. Getting that backwards is how a scroll-reveal ends up serving a
 * blank page to a crawler.
 *
 * Unobserves after the first reveal. Content that re-hides when you scroll back
 * up is a distraction, not an effect.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"idle" | "pending" | "in">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return; // stays "idle", which renders visible
    }

    // Already on screen at mount: reveal without hiding it first, so the
    // top of the page never flashes.
    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.9) {
      setState("in");
      return;
    }

    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("in");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal={state === "idle" ? undefined : state}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
