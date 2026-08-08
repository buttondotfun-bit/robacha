"use client";

import { useSyncExternalStore } from "react";

/**
 * True once the component has mounted on the client, false during SSR and the
 * initial hydration pass.
 *
 * The idiom this replaces — `const [m, setM] = useState(false); useEffect(() =>
 * setM(true), [])` — trips react-hooks/set-state-in-effect and schedules an
 * extra render. `useSyncExternalStore` gives the same "am I on the client yet"
 * signal for free: the server snapshot is `false`, the client snapshot is
 * `true`, and React reconciles the difference without a synchronous setState.
 *
 * Use it to defer client-only, hydration-sensitive reads (localStorage, wallet
 * connection state) until after the first paint so server and client markup
 * match.
 */
const noop = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
