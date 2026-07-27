"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Local record of what this browser has acknowledged.
 *
 * Versioned on purpose: bumping `CONSENT_VERSION` invalidates every stored
 * acknowledgement and asks again. When the legal documents change, people must
 * re-accept the new ones — silently carrying an old acceptance forward would
 * make the record meaningless.
 *
 * This is a browser-local UX gate, not proof of anything. It is not a wallet
 * signature, it is not stored server-side, and it does not verify age or
 * location. Treat it as the floor, not the compliance story.
 */
export const CONSENT_VERSION = 1;

const KEY = `robacha.consent.v${CONSENT_VERSION}`;
const FOLLOW_KEY = `robacha.follow-prompt.v${CONSENT_VERSION}`;

type Store = { legal: boolean; followDismissed: boolean };

function read(): Store {
  if (typeof window === "undefined") return { legal: false, followDismissed: false };
  try {
    return {
      legal: window.localStorage.getItem(KEY) === "1",
      followDismissed: window.localStorage.getItem(FOLLOW_KEY) === "1",
    };
  } catch {
    // Private mode or blocked storage. Fail closed on the legal gate: it is
    // better to ask again than to assume an acknowledgement that never happened.
    return { legal: false, followDismissed: true };
  }
}

let snapshot: Store = { legal: false, followDismissed: false };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  snapshot = read();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    snapshot = read();
  }
  listeners.add(listener);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", emit);
  };
}

/** Server and first client render agree: nothing acknowledged, nothing shown. */
const SERVER_SNAPSHOT: Store = { legal: true, followDismissed: true };

export function useConsent() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );

  const acceptLegal = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked — the gate simply reappears next visit */
    }
    emit();
  }, []);

  const dismissFollow = useCallback(() => {
    try {
      window.localStorage.setItem(FOLLOW_KEY, "1");
    } catch {
      /* ignore */
    }
    emit();
  }, []);

  return { ...state, acceptLegal, dismissFollow };
}
