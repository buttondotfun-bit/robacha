"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * A reward token's visual identity.
 *
 * When a real logo is available for the token's contract address, it is shown.
 * When one is not, this falls back to a deterministic mark: the token's own
 * symbol over a hue derived from its address — recognisable and stable, but
 * obviously generic.
 *
 * Production rule: ROBACHA does not invent brand artwork. The fallback is
 * visibly a placeholder, never a fabricated logo, and a logo is only ever
 * resolved by contract address — never by matching a ticker.
 */

function hueFor(address: string): number {
  let h = 0;
  for (let i = 2; i < address.length; i += 1) {
    h = (h * 31 + address.charCodeAt(i)) % 360;
  }
  return h;
}

export function TokenAvatar({
  address,
  symbol,
  logoUrl,
  className,
  style,
  rounded = "card",
  /** Rendered width in CSS px — drives the responsive image request. */
  size = 64,
  priority,
}: {
  address: string;
  symbol: string | null;
  /** Real logo for this contract, when the market index has one. */
  logoUrl?: string | null;
  className?: string;
  style?: CSSProperties;
  rounded?: "card" | "full" | "none";
  size?: number;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const hue = hueFor(address || "0x0");
  const label = (symbol ?? "?").replace(/^\$/, "").slice(0, 4).toUpperCase();
  const radius = cn(
    rounded === "card" && "rounded-[12px]",
    rounded === "full" && "rounded-full",
  );

  // A dead CDN or an unlisted token must never leave a broken image in a grid,
  // so any load failure drops straight back to the generated mark.
  if (logoUrl && !failed) {
    return (
      <span
        role="img"
        aria-label={symbol ? `${symbol} logo` : "Token logo"}
        className={cn(
          "relative block h-full w-full overflow-hidden bg-white/70",
          radius,
          className,
        )}
        style={style}
      >
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setFailed(true)}
          priority={priority}
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={symbol ? `${symbol} token` : "Unknown token"}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        radius,
        className,
      )}
      style={{
        background: `linear-gradient(150deg, hsl(${hue} 62% 92%), hsl(${(hue + 40) % 360} 58% 84%))`,
        ...style,
      }}
    >
      <span
        className="num text-[max(9px,26cqw)] font-semibold tracking-[-0.03em]"
        style={{ color: `hsl(${hue} 45% 28%)` }}
      >
        {label}
      </span>
    </span>
  );
}
