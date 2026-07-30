/**
 * The environment every glass surface sits above.
 *
 * One fixed, non-interactive layer for the whole app: large blurred light
 * fields, a technical grid, and a grain pass. Fixed + pointer-events-none means
 * it composites once and never reflows, which keeps the backdrop-filters above
 * it cheap.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Warm base wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,var(--wash-1)_0%,var(--wash-2)_38%,var(--wash-3)_100%)]" />

      {/* Technical grid, fading out toward the bottom */}
      <div className="cross-grid absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,#000_0%,#000_55%,transparent_92%)]" />
      <div className="dot-grid absolute inset-x-0 top-0 h-[720px] opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_20%,#000,transparent)]" />

      {/* Robin neon field behind the hero product */}
      <div className="absolute right-[-10%] top-[-14%] h-[760px] w-[860px] rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.16)_0%,rgba(204,255,0,0.06)_38%,transparent_68%)] blur-[16px]" />

      {/* Capsule pink, lower left of the fold */}
      <div className="absolute left-[-14%] top-[26%] h-[620px] w-[720px] rounded-full bg-[radial-gradient(circle,rgba(255,119,172,0.15)_0%,rgba(255,119,172,0.06)_42%,transparent_70%)] blur-[16px]" />

      {/* Cool reflection zone, mid page */}
      <div className="absolute left-[38%] top-[58%] h-[680px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(151,178,255,0.14)_0%,rgba(151,178,255,0.05)_44%,transparent_72%)] blur-[18px]" />

      {/* Second green field, deep page, keeps the lower half alive */}
      <div className="absolute bottom-[-8%] right-[6%] h-[640px] w-[760px] rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.10)_0%,rgba(204,255,0,0.035)_44%,transparent_72%)] blur-[18px]" />

      {/* Soft spotlight from above */}
      <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(to_bottom,var(--wash-top),transparent)]" />

      {/* Grain */}
      <div className="noise-overlay opacity-30" />
    </div>
  );
}

/**
 * A localised light field, dropped behind a specific section so the
 * environment responds to content instead of being uniformly lit.
 */
export function LightField({
  tone = "green",
  className,
  size = 620,
}: {
  tone?: "green" | "pink" | "cool" | "gold";
  className?: string;
  size?: number;
}) {
  const fill =
    tone === "pink"
      ? "rgba(255,119,172,0.18)"
      : tone === "cool"
        ? "rgba(151,178,255,0.16)"
        : tone === "gold"
          ? "rgba(232,196,106,0.18)"
          : "rgba(204,255,0,0.2)";

  // The glow is clipped to its section box. Without this the oversized
  // decorative circle inflates the document's scroll width on narrow screens.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className={`absolute rounded-full blur-[14px] ${className ?? ""}`}
        style={{
          height: size,
          width: size,
          background: `radial-gradient(circle, ${fill} 0%, transparent 68%)`,
        }}
      />
    </div>
  );
}

/**
 * Faint concentric rings used behind product visuals to imply an orbit.
 * Purely decorative; rotation is disabled under reduced motion.
 */
export function OrbitalRings({
  className,
  size = 720,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className ?? ""}`}
      style={{ height: size, width: size }}
    >
      <div className="orbit-slow absolute inset-0">
        <div className="absolute inset-0 rounded-full border border-[rgb(var(--ink-rgb)_/_0.05)]" />
        <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[rgba(204,255,0,0.75)] shadow-[0_0_10px_rgba(204,255,0,0.8)]" />
      </div>
      <div className="orbit-reverse absolute inset-[11%]">
        <div className="absolute inset-0 rounded-full border border-[rgb(var(--ink-rgb)_/_0.045)]" />
        <div className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[rgba(255,119,172,0.8)] shadow-[0_0_8px_rgba(255,119,172,0.7)]" />
      </div>
      <div className="absolute inset-[23%] rounded-full border border-dashed border-[rgb(var(--ink-rgb)_/_0.05)]" />
    </div>
  );
}
