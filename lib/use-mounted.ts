"use client";

import { useSyncExternalStore } from "react";

/** Never fires: the value is constant per environment, so there is nothing to subscribe to. */
const subscribe = () => () => {};

/**
 * False while rendering on the server, true once running in the browser.
 *
 * Used to gate `createPortal`, which needs a real `document.body`. The obvious
 * spelling is `useState(false)` plus an effect that sets it true, but that
 * schedules a second render on every mount purely to learn something already
 * known — and it is the pattern `react-hooks/set-state-in-effect` exists to
 * flag.
 *
 * `useSyncExternalStore` answers it directly instead: React calls the server
 * snapshot when rendering on the server and the client one in the browser, so
 * the hydration pass still sees `false` and matches the server HTML, and the
 * value is `true` from the first client render onward. No extra render, no
 * mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
