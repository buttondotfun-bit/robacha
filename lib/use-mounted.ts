"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * False on the server and during hydration, true afterwards. Lets a component
 * read a browser-only value during render without a state-setting effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
