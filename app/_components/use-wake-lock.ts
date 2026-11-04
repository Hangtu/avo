"use client";

import { useEffect, useRef } from "react";

/**
 * Requests a screen wake lock while `active` and the page is visible.
 * Unsupported browsers and rejected requests are ignored: the timer never
 * depends on the lock, only on the wall clock.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function acquire() {
      if (
        !active ||
        document.visibilityState !== "visible" ||
        !("wakeLock" in navigator) ||
        (sentinelRef.current && !sentinelRef.current.released)
      ) {
        return;
      }
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener(
          "release",
          () => {
            if (sentinelRef.current === sentinel) sentinelRef.current = null;
          },
          { once: true },
        );
      } catch {
        // Rejection is expected on some browsers and power-saving modes.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, [active]);
}
