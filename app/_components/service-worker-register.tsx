"use client";

import { useEffect } from "react";

import { removeFacebookOAuthFragment } from "@/lib/platform/facebook-oauth-fragment";

export function ServiceWorkerRegister() {
  useEffect(() => {
    removeFacebookOAuthFragment(window.location, window.history);
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("No se pudo registrar el service worker", error));
  }, []);

  return null;
}
