"use client";

import { useCallback, useEffect, useState } from "react";
import { openDatabase } from "@/lib/db/database";
import { getSettings, saveSettings } from "@/lib/db/repository";
import type { VoiceTone } from "@/lib/domain/voice";

export function useVoicePreference() {
  const [tone, setToneState] = useState<VoiceTone | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let db: Awaited<ReturnType<typeof openDatabase>> | null = null;

    async function load() {
      try {
        db = await openDatabase();
        const settings = await getSettings(db, Date.now());
        if (!cancelled) setToneState(settings.maxTone);
      } catch (cause) {
        if (!cancelled) {
          console.error("No se pudo leer la voz", cause);
          setError("No pude abrir tu voz.");
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

  const setTone = useCallback(async (next: VoiceTone) => {
    setError(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const current = await getSettings(db, now);
        await saveSettings(db, { ...current, maxTone: next, updatedAt: now });
      } finally {
        db.close();
      }
      setToneState(next);
    } catch (cause) {
      console.error("No se pudo guardar la voz", cause);
      setError("No pude guardar tu voz.");
    }
  }, []);

  return {
    tone,
    ready: tone !== null,
    error,
    setTone,
  };
}
