"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tells someone their round settled, once they have walked away from the tab.
 *
 * A round can take a couple of minutes to fill and settle, which is long enough
 * that people switch away — and then the only way to find out what they pulled
 * is to remember to come back. That is a bad way to run something people have
 * paid for.
 *
 * Deliberately a browser notification and nothing else. Email or push would
 * mean collecting an address or a device token, storing it, and becoming
 * responsible for it; this needs no account, no personal data leaves the
 * device, and it works with the site closed to a background tab. The honest
 * limit is that it does not survive the tab being closed entirely, and the UI
 * says so rather than implying a guarantee.
 *
 * Permission is only ever requested from a real click. Browsers reject
 * unprompted requests, and asking on page load is hostile anyway.
 */

export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

function read(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifyPermission;
}

export function useSettleNotification() {
  // Resolved after mount so the server and first client render agree.
  const [permission, setPermission] = useState<NotifyPermission>("unsupported");

  useEffect(() => {
    setPermission(read());
  }, []);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotifyPermission);
    } catch {
      // Some browsers reject outside a user gesture; leave the state as-is.
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      if (permission !== "granted") return;
      // Nothing to interrupt if they are already looking at the page.
      if (typeof document !== "undefined" && document.visibilityState === "visible") return;
      try {
        // A stable tag means a second settle replaces the first rather than
        // stacking notifications.
        new Notification(title, { body, tag: "robacha-settle" });
      } catch {
        // Notification can throw on platforms that require a service worker.
      }
    },
    [permission],
  );

  return {
    permission,
    canAsk: permission === "default",
    enabled: permission === "granted",
    request,
    notify,
  };
}
