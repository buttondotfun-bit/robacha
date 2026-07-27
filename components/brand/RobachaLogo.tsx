import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * ROBACHA brand mark.
 *
 * The wordmark is drawn as stroked geometry rather than set in a typeface:
 * thick round-capped monoline letterforms give the inflated, bubbly feel the
 * brand wants, render identically everywhere, and never wait on a webfont.
 * Each letter sits on a slightly irregular baseline so it reads hand-made.
 *
 * The capsule mark is the official ROBACHA gacha ball: a pink shell with a
 * bowed seam, gloss highlights and the lime release button. It is drawn as
 * vector geometry rather than shipped as a raster so it stays crisp from a
 * 16px favicon up to the social card, at a fraction of the bytes.
 */

export function RobachaCapsuleRing({
  className,
  style,
  title,
}: {
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  // Gradient ids must be unique per instance: several marks render on one page
  // and duplicate ids would make later ones inherit the first one's fills.
  const id = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      <defs>
        <linearGradient id={`${id}-shell`} x1="0.22" y1="0.08" x2="0.78" y2="0.96">
          <stop offset="0" stopColor="#FCD8EA" />
          <stop offset="0.46" stopColor="#F8B7D8" />
          <stop offset="1" stopColor="#F09CC7" />
        </linearGradient>
        <linearGradient id={`${id}-btn`} x1="0.25" y1="0.15" x2="0.8" y2="0.9">
          <stop offset="0" stopColor="#C3E84A" />
          <stop offset="1" stopColor="#8CC318" />
        </linearGradient>
        <radialGradient id={`${id}-sheen`} cx="0.34" cy="0.24" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Shell */}
      <circle
        cx="50"
        cy="50"
        r="40.5"
        fill={`url(#${id}-shell)`}
        stroke="#C4457F"
        strokeWidth="5.2"
      />
      <circle cx="50" cy="50" r="38" fill={`url(#${id}-sheen)`} />

      {/* Seam, bowed to read as a sphere rather than a disc */}
      <path
        d="M11.5 51.2 Q50 55.4 88.5 51.2"
        fill="none"
        stroke="#C4457F"
        strokeWidth="4.4"
        strokeLinecap="round"
      />

      {/* Rim light along the lower right */}
      <path
        d="M78 72 A34 34 0 0 1 34 84"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.42"
      />

      {/* Gloss */}
      <g fill="#ffffff">
        <ellipse
          cx="31.5"
          cy="33"
          rx="3.4"
          ry="8.2"
          transform="rotate(-38 31.5 33)"
          opacity="0.92"
        />
        <ellipse
          cx="40.5"
          cy="25.8"
          rx="2.7"
          ry="4.4"
          transform="rotate(-38 40.5 25.8)"
          opacity="0.92"
        />
      </g>

      {/* Capsule release button */}
      <circle cx="35.2" cy="57.4" r="12.4" fill="#3A3A3C" />
      <circle cx="35.2" cy="57.4" r="9" fill={`url(#${id}-btn)`} />
      <circle cx="32.2" cy="54.2" r="3.1" fill="#EAF8A4" opacity="0.95" />
    </svg>
  );
}

/**
 * "robacha" drawn on a 210×54 grid with the baseline at y=36 and the x-height
 * top at y=16. `b` and `h` carry ascenders up to y=6.
 */
export function RobachaWordmark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 210 54"
      className={cn("overflow-visible", className)}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* r */}
        <g transform="rotate(-2.2 14 26)">
          <path d="M10 36V17" />
          <path d="M10 24c0-6.5 7-9 13-6.5" />
        </g>

        {/* o */}
        <g transform="rotate(1.4 44 26)">
          <path d="M44 16c-5.6 0-10.2 4.5-10.2 10S38.4 36 44 36s10.2-4.5 10.2-10S49.6 16 44 16Z" />
        </g>

        {/* b */}
        <g transform="rotate(-1.4 74 22)">
          <path d="M69 36V6" />
          <path d="M69 20.5c0-4.5 15.5-4.5 15.5 7.8s-15.5 12.2-15.5 7.7" />
        </g>

        {/* a */}
        <g transform="rotate(2 104 26)">
          <path d="M113 17v19" />
          <path d="M113 22c0-6-16.5-6-16.5 4.8s16.5 10.6 16.5 4.8" />
        </g>

        {/* c */}
        <g transform="rotate(-1.6 134 26)">
          <path d="M142.5 21.5c-3.4-4.4-10.2-6-15-2.6s-5.6 11.6-.9 15.4 11.9 1.6 15.4-2.4" />
        </g>

        {/* h */}
        <g transform="rotate(1.8 164 22)">
          <path d="M155 36V6" />
          <path d="M155 24.5c0-6.5 16.5-7.5 16.5 1.8V36" />
        </g>

        {/* a */}
        <g transform="rotate(-2.2 194 26)">
          <path d="M200 17v19" />
          <path d="M200 22c0-6-16.5-6-16.5 4.8s16.5 10.6 16.5 4.8" />
        </g>
      </g>
    </svg>
  );
}

export interface RobachaLogoProps {
  className?: string;
  /** Mark height in px. The wordmark scales from it. */
  size?: number;
  variant?: "full" | "mark";
}

export function RobachaLogo({
  className,
  size = 28,
  variant = "full",
}: RobachaLogoProps) {
  const markStyle: CSSProperties = { height: size, width: size };

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <RobachaCapsuleRing style={markStyle} />
        <span className="sr-only">ROBACHA</span>
      </span>
    );
  }

  const wordHeight = size * 0.78;

  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <RobachaCapsuleRing style={markStyle} />
      <RobachaWordmark
        style={{ height: wordHeight, width: (wordHeight * 210) / 54 }}
      />
      <span className="sr-only">ROBACHA</span>
    </span>
  );
}
