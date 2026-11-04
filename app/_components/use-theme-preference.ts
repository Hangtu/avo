"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { activeStorageKey, currentDatabaseName, openDatabase } from "@/lib/db/database";
import { getSettings } from "@/lib/db/repository";
import { writePreferences } from "@/lib/sync/preference-writer";
import { useWorkspace } from "./workspace-context";
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
  const t = useTranslations("errors");
  const { revision } = useWorkspace();
  const [mode, setMode] = useState<ThemeMode | null>(null);
  const [storageKey] = useState(() => activeStorageKey(THEME_STORAGE_KEY));
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
          setError(t("themeRead"));
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
  }, [t, revision]);

  useEffect(() => {
    if (!mode) return;
    try {
      localStorage.setItem(storageKey, mode);
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
  }, [mode, storageKey]);

  const setTheme = useCallback(
    async (next: ThemeMode) => {
      if (!mode || mode === next || busy) return;
      setBusy(true);
      setError(null);
      try {
        await writePreferences(currentDatabaseName(), { theme: next });
        setMode(next);
      } catch (cause) {
        console.error("No se pudo guardar el tema", cause);
        setError(t("themeSave"));
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, t],
  );

  return {
    mode: mode ?? "auto",
    ready: mode !== null,
    busy,
    error,
    setTheme,
  };
}
