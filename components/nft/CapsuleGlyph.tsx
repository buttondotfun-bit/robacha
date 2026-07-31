import { cn } from "@/lib/utils";

/**
 * The capsule, small.
 *
 * Same object as the hero preview, drawn once so a tier card, a list row and
 * the big render are unmistakably the same thing at different sizes. It reads
 * its colour from the rarity tokens, so a new tier gets a capsule for free —
 * nothing here knows what Grail or Legendary mean.
 *
 * `id` is required because the gradients are referenced by id inside the SVG,
 * and two of these on one page with the same id would make the second inherit
 * the first's colours.
 */
export function CapsuleGlyph({
  id,
  className,
  title,
}: {
  id: string;
  className?: string;
  title?: string;
}) {
  const lid = `cap-lid-${id}`;
  const base = `cap-base-${id}`;

  return (
    <svg
      viewBox="0 0 80 80"
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={lid} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="rgb(var(--rarity-glow) / 1)" />
          <stop offset="100%" stopColor="rgb(var(--rarity-glow) / 0.6)" />
        </linearGradient>
        <linearGradient id={base} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="rgb(var(--surface-rgb) / 0.95)" />
          <stop offset="100%" stopColor="rgb(var(--surface-rgb) / 0.55)" />
        </linearGradient>
      </defs>
      <path d="M8 40a32 32 0 0 0 64 0Z" fill={`url(#${base})`} />
      <path d="M8 40a32 32 0 0 1 64 0Z" fill={`url(#${lid})`} />
      <rect
        x="5"
        y="36.5"
        width="70"
        height="7"
        rx="3.5"
        fill="rgb(var(--surface-rgb) / 0.96)"
      />
      <ellipse cx="27" cy="23" rx="9" ry="6" fill="rgb(var(--sheen-rgb) / 0.4)" />
    </svg>
  );
}
