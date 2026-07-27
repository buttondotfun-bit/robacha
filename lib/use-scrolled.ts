"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the page has scrolled past a threshold. Backed by a shared scroll
 * listener read through useSyncExternalStore, so the navbar can compress
 * without a state-setting effect and without one listener per subscriber.
 */
const THRESHOLD = 12;

let scrolled = false;
const listeners = new Set<() => void>();

function onScroll() {
  const next = window.scrollY > THRESHOLD;
  if (next === scrolled) return;
  scrolled = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    scrolled = window.scrollY > THRESHOLD;
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("scroll", onScroll);
    }
  };
}

function getSnapshot() {
  return scrolled;
}

function getServerSnapshot() {
  return false;
}

export function useScrolled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
