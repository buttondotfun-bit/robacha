"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatAmount } from "@/lib/formatters";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function motionSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function motionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotion,
    motionSnapshot,
    motionServerSnapshot,
  );
}

/**
 * Counts a reward quantity up on reveal. Renders the final value immediately
 * when the viewer prefers reduced motion.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() => (reduced ? value : 0));
  const [lastValue, setLastValue] = useState(value);
  const frame = useRef<number | null>(null);

  // Switching between pulls in a multi-spin restarts the count.
  if (value !== lastValue) {
    setLastValue(value);
    setDisplay(reduced ? value : 0);
  }

  useEffect(() => {
    if (reduced) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo — fast arrival, gentle settle
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(value * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration, reduced]);

  return (
    <span className={className} aria-label={formatAmount(value)}>
      <span aria-hidden="true">{formatAmount(display)}</span>
    </span>
  );
}
