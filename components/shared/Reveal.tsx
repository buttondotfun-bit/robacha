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
 *
 * Forwards every other prop to the rendered element. Without that, wrapping a
 * card in this silently drops attributes the styling depends on — `data-rarity`
 * went missing on the tier cards, which left the capsules with no
 * `--rarity-glow` to read and rendered them black.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
} & React.HTMLAttributes<HTMLElement>) {
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
      {...rest}
      ref={ref as never}
      data-reveal={state === "idle" ? undefined : state}
      style={
        delay
          ? ({ ...rest.style, "--reveal-delay": `${delay}ms` } as React.CSSProperties)
          : rest.style
      }
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
