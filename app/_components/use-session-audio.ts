"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { openDatabase } from "@/lib/db/database";
import { getSettings, saveSettings } from "@/lib/db/repository";
import type { Settings } from "@/lib/domain/types";

function startBrown(ctx: AudioContext): () => void {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[index] = last * 3.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  const gain = ctx.createGain();
  gain.gain.value = 0.06;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();

  return () => {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

function startTick(ctx: AudioContext): () => void {
  function tick() {
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 1200;
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.05);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      // A closed/suspended context must never break the timer.
    }
  }

  tick();
  const interval = window.setInterval(tick, 1000);
  return () => window.clearInterval(interval);
}

export function useSessionAudio(running: boolean) {
  const t = useTranslations("errors");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    let db: Awaited<ReturnType<typeof openDatabase>> | null = null;

    async function load() {
      try {
        db = await openDatabase();
        const next = await getSettings(db, Date.now());
        if (!cancelled) setSettings(next);
      } catch (cause) {
        if (!cancelled) {
          console.error("No se pudo leer la preferencia de audio", cause);
          setError(t("soundRead"));
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
  }, [t]);

  useEffect(() => () => {
    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
  }, []);

  const ensureContext = useCallback((): AudioContext | null => {
    if (contextRef.current) return contextRef.current;
    try {
      const Ctor = window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
      return contextRef.current;
    } catch (cause) {
      console.error("No se pudo crear el audio", cause);
      return null;
    }
  }, []);

  const persistAudio = useCallback(async (
    audioEnabled: boolean, sound: Settings["sound"],
  ): Promise<Settings> => {
    const db = await openDatabase();
    try {
      const now = Date.now();
      const current = await getSettings(db, now);
      const next: Settings = { ...current, audioEnabled, sound, updatedAt: now };
      await saveSettings(db, next);
      return next;
    } finally {
      db.close();
    }
  }, []);

  const toggle = useCallback(async () => {
    if (!settings) return;
    const nextEnabled = !settings.audioEnabled;
    setError(null);
    if (nextEnabled) {
      const ctx = ensureContext();
      if (!ctx) setError(t("soundUnavailable"));
      try {
        await ctx?.resume();
      } catch {
        // The visual timer remains the fallback.
      }
    }
    try {
      const next = await persistAudio(nextEnabled, settings.sound);
      setSettings(next);
    } catch (cause) {
      console.error("No se pudo guardar el audio", cause);
      setError(t("soundSave"));
    }
  }, [ensureContext, persistAudio, settings, t]);

  const choose = useCallback(async (sound: Settings["sound"]) => {
    if (!settings || settings.sound === sound) return;
    setError(null);
    try {
      const next = await persistAudio(settings.audioEnabled, sound);
      setSettings(next);
    } catch (cause) {
      console.error("No se pudo guardar el sonido", cause);
      setError(t("soundSave"));
    }
  }, [persistAudio, settings, t]);

  const ringBell = useCallback(() => {
    if (!settings?.audioEnabled) return;
    const ctx = ensureContext();
    if (!ctx) {
      setError(t("soundFallback"));
      return;
    }
    void ctx.resume().catch(() => {});
    try {
      const now = ctx.currentTime;
      [880, 1320].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.9);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now + index * 0.08);
        oscillator.stop(now + index * 0.08 + 0.95);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      });
    } catch (cause) {
      console.error("No se pudo tocar la campana", cause);
      setError(t("soundBell"));
    }
  }, [ensureContext, settings?.audioEnabled, t]);

  useEffect(() => {
    if (!settings?.audioEnabled || !running) return;
    const ctx = ensureContext();
    if (!ctx) return;
    void ctx.resume().catch(() => {
      queueMicrotask(() => {
        setError(t("soundStart"));
      });
    });

    try {
      return settings.sound === "brown" ? startBrown(ctx) : startTick(ctx);
    } catch (cause) {
      console.error("No se pudo iniciar el sonido de trabajo", cause);
      queueMicrotask(() => {
        setError(t("soundFallback"));
      });
      return;
    }
  }, [ensureContext, running, settings?.audioEnabled, settings?.sound, t]);

  return {
    ready: settings !== null,
    enabled: settings?.audioEnabled ?? false,
    sound: settings?.sound ?? "brown",
    error,
    toggle,
    choose,
    ringBell,
  };
}
