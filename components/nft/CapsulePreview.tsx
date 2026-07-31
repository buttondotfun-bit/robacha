import { RobachaCapsuleRing } from "@/components/brand/RobachaLogo";

/**
 * The capsule, large, as the hero of the mint page.
 *
 * Drawn rather than shown. The real artwork does not exist yet, and putting a
 * mockup here that looked like a finished asset would be selling something we
 * have not made — the same reasoning that keeps the upcoming machines blurred.
 * What this does instead is show the *form*: a capsule, in the tier colours the
 * machine already uses, so the drop reads as part of the same product.
 *
 * Labelled as a placeholder on the page, not hidden in a caption nobody reads.
 */
export function CapsulePreview({ rarity = "legendary" }: { rarity?: string }) {
  return (
    <div
      data-rarity={rarity}
      className="glass-panel glass-reflection glass-highlight relative aspect-square w-full overflow-hidden rounded-[28px]"
    >
      <span className="noise-overlay" aria-hidden="true" />
      <div className="cross-grid absolute inset-0" aria-hidden="true" />

      {/* Rarity light behind the capsule. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[8px]"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--rarity-glow) / 0.34) 0%, transparent 68%)",
        }}
      />

      <div className="relative grid h-full place-items-center p-8">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full max-h-[340px] max-w-[340px] drop-shadow-[0_24px_48px_rgb(var(--ink-rgb)_/_0.28)]"
          role="img"
          aria-label="Robacha capsule, placeholder artwork"
        >
          <defs>
            <linearGradient id="cap-lid" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="rgb(var(--rarity-glow) / 1)" />
              <stop offset="100%" stopColor="rgb(var(--rarity-glow) / 0.62)" />
            </linearGradient>
            <linearGradient id="cap-base" x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0%" stopColor="rgb(var(--surface-rgb) / 0.95)" />
              <stop offset="100%" stopColor="rgb(var(--surface-rgb) / 0.6)" />
            </linearGradient>
          </defs>

          {/* Bottom half */}
          <path d="M20 100a80 80 0 0 0 160 0Z" fill="url(#cap-base)" />
          {/* Lid, carrying the rarity colour */}
          <path d="M20 100a80 80 0 0 1 160 0Z" fill="url(#cap-lid)" />
          {/* Seam */}
          <rect
            x="16"
            y="93"
            width="168"
            height="15"
            rx="7.5"
            fill="rgb(var(--surface-rgb) / 0.96)"
          />
          <rect
            x="16"
            y="93"
            width="168"
            height="4"
            rx="2"
            fill="rgb(var(--sheen-rgb) / 0.5)"
          />
          {/* Specular highlight */}
          <ellipse cx="68" cy="56" rx="24" ry="15" fill="rgb(var(--sheen-rgb) / 0.42)" />
        </svg>

        {/* Brand mark set into the capsule's face. */}
        <span className="absolute bottom-[26%] left-1/2 -translate-x-1/2">
          <RobachaCapsuleRing style={{ height: 34, width: 34 }} />
        </span>
      </div>

      <p className="absolute inset-x-0 bottom-4 text-center text-[11px] text-ink-3">
        Placeholder artwork — the real capsules are still being drawn.
      </p>
    </div>
  );
}
