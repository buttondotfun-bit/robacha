"use client";

import { useSyncExternalStore } from "react";

/**
 * One second-resolution clock, shared by everything counting down.
 *
 * There are two reasons this is a single shared store rather than a
 * `setInterval` per component.
 *
 * The first is correctness. The round countdown appears twice on the spin page
 * — compactly in the pool bar, and as a ring on the machine — and each one
 * used to start its own interval. Two intervals begun a few hundred
 * milliseconds apart tick a few hundred milliseconds apart, so the two clocks
 * would sit on different seconds for most of every second. Someone reading
 * "0:44" in one place and "0:43" in the other has found a bug, and they would
 * be right. One subscription means every consumer renders the same value.
 *
 * The second is cost. A timer per consumer is a timer per consumer; this is
 * one, and it stops entirely when the last component counting down unmounts.
 *
 * Separate from `useNow` in `use-activity`, which ticks every 30 seconds and
 * buckets its result. That is right for "3 minutes ago" on a feed and wrong
 * here: rounds are 45 seconds long, so the countdown reading it updated at
 * most once before the round was over and usually sat on a stale number the
 * whole time. It looked like a timer and behaved like a screenshot — worse
 * than showing nothing, because a number that never moves reads as a page
 * that has frozen.
 */

let now = Date.now();
let interval: number | null = null;
const subscribers = new Set<() => void>();

function tick() {
  now = Date.now();
  for (const notify of subscribers) notify();
}

function subscribe(notify: () => void) {
  subscribers.add(notify);

  if (interval === null) {
    // Browsers throttle or suspend timers in a background tab, so a phone
    // coming back from the lock screen would paint one frame of whatever the
    // clock read when it was put down. Resyncing on the way back means the
    // first frame after waking is already right.
    document.addEventListener("visibilitychange", onVisible);
    interval = window.setInterval(tick, 1_000);
  }

  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0 && interval !== null) {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      interval = null;
    }
  };
}

function onVisible() {
  if (document.visibilityState === "visible") tick();
}

function getSnapshot() {
  return now;
}

/**
 * Fixed on the server so nothing time-dependent differs between the server
 * render and hydration. Real values arrive on the first client tick.
 */
function getServerSnapshot() {
  return 0;
}

export function useSecondsTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
