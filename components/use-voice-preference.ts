"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { currentDatabaseName, openDatabase } from "@/lib/db/database";
import { getSettings } from "@/lib/db/repository";
import { writePreferences } from "@/lib/sync/preference-writer";
import { useWorkspace } from "./workspace-context";
import type { VoiceTone } from "@/lib/domain/voice";

export function useVoicePreference() {
  const t = useTranslations("errors");
  const { revision } = useWorkspace();
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
          setError(t("voiceRead"));
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

  const setTone = useCallback(
    async (next: VoiceTone) => {
      setError(null);
      try {
        await writePreferences(currentDatabaseName(), { maxTone: next });
        setToneState(next);
      } catch (cause) {
        console.error("No se pudo guardar la voz", cause);
        setError(t("voiceSave"));
      }
    },
    [t],
  );

  return {
    tone,
    ready: tone !== null,
    error,
    setTone,
  };
}
