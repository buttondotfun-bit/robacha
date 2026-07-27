"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

type Level = "nav" | "panel" | "card" | "quiet" | "chip" | "micro";

const LEVEL_CLASS: Record<Level, string> = {
  nav: "glass-nav",
  panel: "glass-panel",
  card: "glass-card",
  quiet: "glass-quiet",
  chip: "glass-chip",
  micro: "glass-micro",
};

export interface GlassSurfaceProps {
  level?: Level;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Adds the top-left specular sweep. */
  reflection?: boolean;
  /** Adds the 1px lit bevel along the top edge. */
  highlight?: boolean;
  /** Adds fine grain (auto-disabled on mobile by the stylesheet). */
  noise?: boolean;
  /** Follows the pointer with a soft illumination. Desktop only. */
  spotlight?: boolean;
  as?: "div" | "section" | "article" | "aside" | "header" | "footer" | "li";
}

/**
 * The single glass material component. Every translucent surface in the app is
 * this with a different level, so retuning the system happens in globals.css
 * rather than across dozens of class lists.
 */
export function GlassSurface({
  level = "card",
  children,
  className,
  style,
  reflection,
  highlight,
  noise,
  spotlight,
  as: Tag = "div",
}: GlassSurfaceProps) {
  const ref = useRef<HTMLElement | null>(null);

  // Pointer position drives --mx/--my for .glass-spotlight. Written straight to
  // the node so tracking never triggers a React render.
  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!spotlight) return;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      node.style.setProperty(
        "--mx",
        `${((event.clientX - rect.left) / rect.width) * 100}%`,
      );
      node.style.setProperty(
        "--my",
        `${((event.clientY - rect.top) / rect.height) * 100}%`,
      );
    },
    [spotlight],
  );

  return (
    <Tag
      // @ts-expect-error — ref type varies with the polymorphic tag
      ref={ref}
      onPointerMove={spotlight ? onPointerMove : undefined}
      style={style}
      className={cn(
        LEVEL_CLASS[level],
        reflection && "glass-reflection",
        highlight && "glass-highlight",
        spotlight && "glass-spotlight",
        className,
      )}
    >
      {noise ? <span className="noise-overlay" aria-hidden="true" /> : null}
      {children}
    </Tag>
  );
}

/** Level 2 — hero console, app stage, dashboards, CTA chamber. */
export function GlassPanel(props: Omit<GlassSurfaceProps, "level">) {
  return <GlassSurface level="panel" reflection highlight noise {...props} />;
}

/** Level 3 — content cards. */
export function GlassCard({
  className,
  interactive,
  ...props
}: Omit<GlassSurfaceProps, "level"> & { interactive?: boolean }) {
  return (
    <GlassSurface
      level="card"
      reflection
      highlight
      className={cn(
        interactive &&
          "transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
      {...props}
    />
  );
}

/** Level 4 — chips, badges, segmented controls. */
export function GlassChip({
  className,
  children,
  tone = "neutral",
  dot,
  as: Tag = "span",
}: {
  className?: string;
  children: ReactNode;
  tone?: "neutral" | "accent" | "live";
  dot?: boolean;
  as?: "span" | "div" | "li";
}) {
  return (
    <Tag
      className={cn(
        "glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium",
        tone === "neutral" && "text-ink-2",
        tone === "accent" &&
          "border-[rgba(163,204,0,0.42)] bg-[rgba(204,255,0,0.22)] text-accent-ink",
        tone === "live" && "text-ink-2",
        className,
      )}
    >
      {dot ? (
        <span
          className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#8ec500] shadow-[0_0_8px_rgba(142,197,0,0.9)]"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Tag>
  );
}

/** Level 5 — dark data readout. Deliberately rare. */
export function GlassMicro({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "glass-micro num inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]",
        className,
      )}
    >
      {children}
    </span>
  );
}
