"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn, ringDelta } from "@/lib/utils";
import type { PoolRewardEntry } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { RewardCard } from "./RewardCard";

/**
 * The fan. Layout is expressed as unitless multipliers of two CSS custom
 * properties (--card-w, --gap) so the same numbers work at every breakpoint,
 * and the server and client compute identical transforms.
 *
 * The ring is the active pool's reward slots, read from the contract. There is
 * no fallback set — an empty pool renders nothing and the caller shows why.
 */

const VISIBLE = 4; // cards either side of centre → 9 on screen

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function RewardCarousel({
  entries,
  activeIndex,
  onActiveIndexChange,
  className,
}: {
  entries: PoolRewardEntry[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  className?: string;
}) {
  // One request covers every slot on the carousel.
  const market = useTokenMarket(entries.map((entry) => entry.token));

  const [pos, setPos] = useState(activeIndex);
  const posRef = useRef(activeIndex);
  const frame = useRef<number | null>(null);
  const len = entries.length;

  const stop = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  const animate = useCallback(
    (distance: number, duration: number) => {
      stop();
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const from = posRef.current;
      const to = from + distance;

      if (reduced || duration <= 0 || len === 0) {
        posRef.current = len ? ((to % len) + len) % len : 0;
        setPos(posRef.current);
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const value = from + distance * easeOutCubic(t);
        posRef.current = value;
        setPos(value);
        if (t < 1) {
          frame.current = requestAnimationFrame(tick);
        } else {
          posRef.current = ((to % len) + len) % len;
          setPos(posRef.current);
          frame.current = null;
        }
      };
      frame.current = requestAnimationFrame(tick);
    },
    [len, stop],
  );

  useEffect(() => {
    if (len === 0) return;
    const current = ((posRef.current % len) + len) % len;
    const delta = ringDelta(current, activeIndex, len);
    if (Math.abs(delta) < 0.001) return;
    animate(delta, 460);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, len]);

  useEffect(() => stop, [stop]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (len === 0) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onActiveIndexChange((activeIndex + 1) % len);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onActiveIndexChange((activeIndex - 1 + len) % len);
    }
  }

  if (len === 0) return null;
  const focused = entries[((activeIndex % len) + len) % len];

  return (
    // `isolate` keeps card z-indexes inside this stacking context.
    <div
      className={cn("relative isolate w-full select-none", className)}
      style={
        {
          "--card-w": "clamp(132px, 12.4vw, 176px)",
          "--gap": "calc(var(--card-w) * 0.84)",
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(204,255,0,0.32) 0%, rgba(204,255,0,0.10) 42%, rgba(204,255,0,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[8%] bottom-[6px] h-px bg-[linear-gradient(90deg,transparent,rgba(204,255,0,0.85),transparent)]"
      />

      <div
        role="group"
        aria-label="Reward pool carousel"
        aria-live="polite"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative mx-auto h-[calc(var(--card-w)*1.72)] w-full outline-none"
      >
        <p className="sr-only">
          {`Focused reward: ${focused.name ?? "unknown"}, ${focused.symbol ?? ""}. Use the left and right arrow keys to browse the pool.`}
        </p>

        {entries.map((entry, index) => {
          const offset = ringDelta(pos, index, len);
          const distance = Math.abs(offset);
          if (distance > VISIBLE + 0.5) return null;

          const direction = Math.sign(offset);
          const xFactor = direction * Math.pow(distance, 0.88);
          const yFactor = distance * 0.055;
          const scale = Math.max(0.54, 1 - distance * 0.118);
          const rotate = offset * -3.4;
          const opacity = Math.max(0.12, 1 - distance * 0.235);
          const isCentre = distance < 0.5;

          return (
            <button
              key={`${entry.token}-${entry.tierIndex}-${index}`}
              type="button"
              tabIndex={-1}
              aria-hidden={!isCentre}
              onClick={() => onActiveIndexChange(index)}
              data-far={distance >= 3 ? "true" : undefined}
              className={cn(
                "absolute left-1/2 top-1/2 block h-[calc(var(--card-w)*1.72)] w-[var(--card-w)] cursor-pointer will-change-transform",
                "data-[far=true]:hidden sm:data-[far=true]:block",
              )}
              style={{
                transform: `translate3d(calc(-50% + var(--gap) * ${xFactor.toFixed(4)}), calc(-50% + var(--card-w) * ${yFactor.toFixed(4)}), 0) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(3)}deg)`,
                zIndex: 60 - Math.round(distance * 10),
                opacity,
              }}
            >
              <RewardCard
                entry={entry}
                position={index + 1}
                active={isCentre}
                logoUrl={market.get(entry.token)?.logoUrl}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
