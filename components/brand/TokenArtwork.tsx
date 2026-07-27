import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { RewardToken } from "@/types/token";

/**
 * Locally drawn fallback artwork.
 *
 * Real tokens render their hosted logo via <TokenLogo>. This is what shows when
 * a logo is missing or fails to load, so the grid never renders a broken image.
 * The shape and palette are derived from the token's contract address, which
 * means any token — including ones added to the chain tomorrow — gets a stable,
 * distinct mark without anyone authoring one.
 */

const KINDS = [
  "cat",
  "coin",
  "blob",
  "orb",
  "pixel",
  "spark",
  "ring",
  "ghost",
  "bolt",
  "drop",
  "star",
  "bar",
] as const;

type Kind = (typeof KINDS)[number];

/** Muted, light-theme-safe palettes. Index chosen by address hash. */
const PALETTES: { bg: [string, string]; fg: string; detail: string }[] = [
  { bg: ["#FFF3D6", "#FFE1A8"], fg: "#F4B740", detail: "#10110F" },
  { bg: ["#E9F7EC", "#CFEDD8"], fg: "#3E9E63", detail: "#10110F" },
  { bg: ["#FFEFF5", "#FFD8E7"], fg: "#F26FA4", detail: "#FFFFFF" },
  { bg: ["#F0F6FF", "#D9E8FB"], fg: "#5B93D6", detail: "#FFFFFF" },
  { bg: ["#F1EEFC", "#DCD3F5"], fg: "#7B5FC4", detail: "#FFFFFF" },
  { bg: ["#FFF1E4", "#FFDCC2"], fg: "#E0954E", detail: "#10110F" },
  { bg: ["#EEF7FA", "#D2EAF2"], fg: "#4293AE", detail: "#FFFFFF" },
  { bg: ["#F5FFDC", "#E4F9A8"], fg: "#9BC706", detail: "#10110F" },
  { bg: ["#FFF0F0", "#FBD9D9"], fg: "#D95A5A", detail: "#FFFFFF" },
  { bg: ["#F6F7F2", "#E5E8DC"], fg: "#8D9384", detail: "#10110F" },
];

/** FNV-1a — small, stable, and enough to spread addresses across buckets. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function artworkFor(token: Pick<RewardToken, "contract" | "symbol">) {
  const seed = hash(`${token.contract}:${token.symbol}`);
  return {
    kind: KINDS[seed % KINDS.length] as Kind,
    palette: PALETTES[(seed >>> 8) % PALETTES.length],
  };
}

interface TokenArtworkProps {
  token: RewardToken;
  className?: string;
  style?: CSSProperties;
  rounded?: "card" | "full" | "none";
}

export function TokenArtwork({
  token,
  className,
  style,
  rounded = "card",
}: TokenArtworkProps) {
  const { kind, palette } = artworkFor(token);
  const gradientId = `robacha-art-${token.id}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn(
        "block h-full w-full",
        rounded === "card" && "rounded-[12px]",
        rounded === "full" && "rounded-full",
        className,
      )}
      style={style}
      role="img"
      aria-label={`${token.name} token artwork`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={palette.bg[0]} />
          <stop offset="100%" stopColor={palette.bg[1]} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${gradientId})`} />
      <Shape kind={kind} fg={palette.fg} detail={palette.detail} />
    </svg>
  );
}

function Shape({
  kind,
  fg,
  detail,
}: {
  kind: Kind;
  fg: string;
  detail: string;
}) {
  switch (kind) {
    case "cat":
      return (
        <g>
          <path d="M18 26 16 13l11 6Z" fill={fg} />
          <path d="M46 26 48 13l-11 6Z" fill={fg} />
          <circle cx="32" cy="35" r="16" fill={fg} />
          <circle cx="26" cy="33" r="2.5" fill={detail} />
          <circle cx="38" cy="33" r="2.5" fill={detail} />
          <path
            d="M28 41c1.6 2 6.4 2 8 0"
            stroke={detail}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
    case "coin":
      return (
        <g>
          <circle cx="32" cy="32" r="17" fill={fg} />
          <circle
            cx="32"
            cy="32"
            r="17"
            fill="none"
            stroke={detail}
            strokeWidth="2.4"
            opacity="0.85"
          />
          <circle cx="32" cy="32" r="8.5" fill={detail} opacity="0.85" />
        </g>
      );
    case "blob":
      return (
        <g>
          <path
            d="M32 13c11 0 19 7 19 17s-7 20-19 20-19-9-19-19S21 13 32 13Z"
            fill={fg}
          />
          <circle cx="26" cy="31" r="2.6" fill={detail} />
          <circle cx="38" cy="31" r="2.6" fill={detail} />
          <path
            d="M27 39c2 2.6 8 2.6 10 0"
            stroke={detail}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
    case "orb":
      return (
        <g>
          <circle cx="32" cy="32" r="17" fill={fg} />
          <ellipse cx="26" cy="25" rx="6" ry="4.4" fill={detail} opacity="0.55" />
          <circle
            cx="32"
            cy="32"
            r="17"
            fill="none"
            stroke="#10110f"
            strokeWidth="1.4"
            opacity="0.16"
          />
        </g>
      );
    case "pixel":
      return (
        <g fill={fg}>
          <rect x="16" y="16" width="10" height="10" rx="2" />
          <rect x="28" y="16" width="10" height="10" rx="2" opacity="0.65" />
          <rect x="40" y="16" width="8" height="10" rx="2" opacity="0.4" />
          <rect x="16" y="28" width="10" height="10" rx="2" opacity="0.55" />
          <rect x="28" y="28" width="10" height="10" rx="2" fill={detail} />
          <rect x="40" y="28" width="8" height="10" rx="2" opacity="0.7" />
          <rect x="16" y="40" width="10" height="8" rx="2" opacity="0.35" />
          <rect x="28" y="40" width="10" height="8" rx="2" opacity="0.6" />
          <rect x="40" y="40" width="8" height="8" rx="2" />
        </g>
      );
    case "spark":
      return (
        <g>
          <path
            d="M32 12c2.2 11 7 15.8 18 18-11 2.2-15.8 7-18 18-2.2-11-7-15.8-18-18 11-2.2 15.8-7 18-18Z"
            fill={fg}
          />
          <circle cx="32" cy="30" r="4" fill={detail} opacity="0.8" />
        </g>
      );
    case "ring":
      return (
        <g>
          <circle
            cx="32"
            cy="32"
            r="16"
            fill="none"
            stroke={fg}
            strokeWidth="7.5"
          />
          <circle cx="32" cy="16" r="4.6" fill={detail} />
        </g>
      );
    case "ghost":
      return (
        <g>
          <path
            d="M16 32a16 16 0 0 1 32 0v18l-5.3-4-5.4 4-5.3-4-5.4 4-5.3-4Z"
            fill={fg}
          />
          <circle cx="26" cy="30" r="2.8" fill={detail} />
          <circle cx="38" cy="30" r="2.8" fill={detail} />
        </g>
      );
    case "bolt":
      return (
        <g>
          <path d="M36 11 19 36h10l-3 17 19-26H34l2-16Z" fill={fg} />
          <path
            d="M36 11 19 36h10l-3 17"
            fill="none"
            stroke={detail}
            strokeWidth="1.6"
            opacity="0.5"
          />
        </g>
      );
    case "drop":
      return (
        <g>
          <path
            d="M32 12c8 10 14 16.5 14 23a14 14 0 1 1-28 0c0-6.5 6-13 14-23Z"
            fill={fg}
          />
          <ellipse cx="26" cy="34" rx="3.4" ry="5" fill={detail} opacity="0.5" />
        </g>
      );
    case "star":
      return (
        <g>
          <path
            d="m32 11 6.4 13.4L53 26.4l-10.6 10.2L45 51l-13-6.9L19 51l2.6-14.4L11 26.4l14.6-2Z"
            fill={fg}
          />
          <circle cx="32" cy="31" r="4.6" fill={detail} opacity="0.75" />
        </g>
      );
    case "bar":
      return (
        <g fill={fg}>
          <rect x="14" y="34" width="9" height="16" rx="3" opacity="0.5" />
          <rect x="27" y="24" width="9" height="26" rx="3" />
          <rect
            x="40"
            y="16"
            width="9"
            height="34"
            rx="3"
            fill={detail}
            opacity="0.9"
          />
        </g>
      );
    default:
      return <circle cx="32" cy="32" r="16" fill={fg} />;
  }
}
