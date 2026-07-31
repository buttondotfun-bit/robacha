"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RewardToken } from "@/types/token";
import { TokenArtwork } from "./TokenArtwork";

/**
 * A token's real logo, sourced from the chain indexer.
 *
 * Falls back to locally drawn artwork whenever a logo is absent or fails to
 * load, so a dead CDN or an unlisted token can never leave a broken image in
 * the grid. Every call site uses this rather than <TokenArtwork> directly.
 */
export function TokenLogo({
  token,
  className,
  rounded = "card",
  /** Rendered width in CSS px — drives the responsive image request. */
  size = 64,
  priority,
}: {
  token: RewardToken;
  className?: string;
  rounded?: "card" | "full" | "none";
  size?: number;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const radius =
    rounded === "card"
      ? "rounded-[12px]"
      : rounded === "full"
        ? "rounded-full"
        : "";

  if (!token.logoUrl || failed) {
    return (
      <TokenArtwork token={token} rounded={rounded} className={className} />
    );
  }

  return (
    <span
      className={cn(
        // aspect-square supplies the intrinsic ratio that <Image fill> needs.
        // The SVG fallback carried its own viewBox ratio; a plain box does not,
        // and h-full inside an auto-height parent resolves to zero.
        // Not themed on purpose — see TokenAvatar: token art assumes a light
        // plate, so a dark one would hide transparent logos.
        "relative block aspect-square w-full overflow-hidden bg-white/70",
        radius,
        className,
      )}
    >
      <Image
        src={token.logoUrl}
        alt={`${token.name} logo`}
        fill
        // The artwork chamber is square at every call site.
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setFailed(true)}
        priority={priority}
        unoptimized={false}
      />
    </span>
  );
}
