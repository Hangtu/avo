"use client";

import { useCallback, useEffect, useState } from "react";
import { openDatabase } from "@/lib/db/database";
import { getSettings, saveSettings } from "@/lib/db/repository";
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/domain/theme";

function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

export function useThemePreference() {
  const [mode, setMode] = useState<ThemeMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let db: Awaited<ReturnType<typeof openDatabase>> | null = null;

    async function load() {
      try {
        db = await openDatabase();
        const settings = await getSettings(db, Date.now());
        if (!cancelled) setMode(settings.theme);
      } catch (cause) {
        console.error("No se pudo leer el tema", cause);
        if (!cancelled) {
          setError("No pude leer tu color. Uso el automático.");
          setMode("auto");
        }
      } finally {
        db?.close();
      }
    }

    void load();
    return () => {
      cancelled = true;
      db?.close();
    };
  }, []);

  useEffect(() => {
    if (!mode) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Private browsing can reject storage; the in-memory theme still works.
    }

    function apply() {
      applyTheme(resolveTheme(mode as ThemeMode, Date.now()));
    }

    apply();
    if (mode !== "auto") return;

    const interval = window.setInterval(apply, 60_000);
    function onVisibilityChange() {
      if (document.visibilityState === "visible") apply();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mode]);

  const setTheme = useCallback(async (next: ThemeMode) => {
    if (!mode || mode === next || busy) return;
    setBusy(true);
    setError(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const current = await getSettings(db, now);
        await saveSettings(db, { ...current, theme: next, updatedAt: now });
        setMode(next);
      } finally {
        db.close();
      }
    } catch (cause) {
      console.error("No se pudo guardar el tema", cause);
      setError("No pude guardar tu color.");
    } finally {
      setBusy(false);
    }
  }, [busy, mode]);

  return {
    mode: mode ?? "auto",
    ready: mode !== null,
    busy,
    error,
    setTheme,
  };
}
