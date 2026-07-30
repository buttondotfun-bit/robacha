"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Light, dark, or whatever the device says.
 *
 * Three states rather than two on purpose. A plain on/off switch has to pick a
 * default, and picking wrong means someone whose machine is in dark mode gets a
 * white page anyway — "system" is the honest default because it is the answer
 * the person already gave their operating system.
 *
 * The resolved theme is written to `data-theme` on <html>, which is what the
 * stylesheet keys off. It is applied by a blocking script in the document head
 * as well, before first paint; without that a dark-mode visitor gets a white
 * flash on every navigation, which is the single thing that makes a dark mode
 * feel broken.
 */

const KEY = "robacha.theme";

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  // A device-level change should move the page when the choice is "system".
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function readChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function snapshot(): string {
  const choice = readChoice();
  const resolved =
    choice === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : choice;
  // One string so useSyncExternalStore can compare cheaply.
  return `${choice}:${resolved}`;
}

/**
 * The server cannot know the device preference, so it renders light and the
 * head script corrects the document before paint. Reporting "system:light"
 * here keeps the first client render identical to the server's.
 */
function serverSnapshot(): string {
  return "system:light";
}

export function useTheme() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [choice, resolved] = state.split(":") as [ThemeChoice, ResolvedTheme];

  // Keep the document in step with the store, including when the device
  // preference changes underneath a "system" choice.
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      if (next === "system") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, next);
    } catch {
      /* private mode; the choice just will not persist */
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { choice, resolved, setChoice };
}

/**
 * Runs before first paint, inlined into the document head.
 *
 * Deliberately tiny and dependency-free: it blocks rendering, so anything slow
 * or throwing here would be worse than the flash it prevents. Hence the
 * try/catch — storage access throws outright in some privacy modes.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem("${KEY}");var d=c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
