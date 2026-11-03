"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { currentDatabaseName, openDatabase } from "@/lib/db/database";
import { getSettings } from "@/lib/db/repository";
import { writePreferences } from "@/lib/sync/preference-writer";
import type { Settings } from "@/lib/domain/types";
import { useWorkspace } from "./workspace-context";

function createBrownBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[index] = last * 3.5;
  }
  return buffer;
}

function fillPinkNoise(data: Float32Array): void {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
}

function createPinkBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  fillPinkNoise(buffer.getChannelData(0));
  return buffer;
}

/** Pink-ish rain bed plus sparse, short droplets. */
function createRainBuffer(ctx: AudioContext, seconds = 6): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  fillPinkNoise(data);
  for (let index = 0; index < length; index += 1) data[index] *= 0.55;

  const droplets = Math.floor(seconds * 16);
  for (let drop = 0; drop < droplets; drop += 1) {
    const start = Math.floor(Math.random() * length);
    const duration = 0.03 + Math.random() * 0.07;
    const samples = Math.floor(duration * ctx.sampleRate);
    const frequency = 700 + Math.random() * 2300;
    const amplitude = 0.025 + Math.random() * 0.06;
    const decay = 24 + Math.random() * 34;
    let previous = 0;
    for (let index = 0; index < samples; index += 1) {
      const t = index / ctx.sampleRate;
      const envelope = Math.exp(-t * decay);
      const white = Math.random() * 2 - 1;
      const splash = white - previous * 0.92;
      previous = white;
      const body = Math.sin(2 * Math.PI * frequency * t) * 0.3;
      data[(start + index) % length] +=
        (splash * 0.75 + body) * amplitude * envelope;
    }
  }
  return buffer;
}

function startBrown(ctx: AudioContext): () => void {
  const source = ctx.createBufferSource();
  source.buffer = createBrownBuffer(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.08);
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

function startPink(ctx: AudioContext): () => void {
  const source = ctx.createBufferSource();
  source.buffer = createPinkBuffer(ctx);
  source.loop = true;
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 60;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 7500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.08);
  source.connect(highpass).connect(lowpass).connect(gain).connect(ctx.destination);
  source.start();

  return () => {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
    source.disconnect();
    highpass.disconnect();
    lowpass.disconnect();
    gain.disconnect();
  };
}

function startRain(ctx: AudioContext): () => void {
  const source = ctx.createBufferSource();
  source.buffer = createRainBuffer(ctx);
  source.loop = true;
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 90;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 9000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.08);
  source.connect(highpass).connect(lowpass).connect(gain).connect(ctx.destination);
  source.start();

  return () => {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
    source.disconnect();
    highpass.disconnect();
    lowpass.disconnect();
    gain.disconnect();
  };
}

function startOcean(ctx: AudioContext): () => void {
  const source = ctx.createBufferSource();
  source.buffer = createBrownBuffer(ctx, 4);
  source.loop = true;
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 40;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 520;
  lowpass.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.08);
  const swell = ctx.createOscillator();
  swell.type = "sine";
  swell.frequency.value = 0.08;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.026;
  swell.connect(swellDepth).connect(gain.gain);
  const filterSwell = ctx.createOscillator();
  filterSwell.type = "sine";
  filterSwell.frequency.value = 0.05;
  const filterDepth = ctx.createGain();
  filterDepth.gain.value = 230;
  filterSwell.connect(filterDepth).connect(lowpass.frequency);
  source.connect(highpass).connect(lowpass).connect(gain).connect(ctx.destination);
  source.start();
  swell.start();
  filterSwell.start();

  return () => {
    for (const node of [source, swell, filterSwell]) {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
      node.disconnect();
    }
    highpass.disconnect();
    lowpass.disconnect();
    gain.disconnect();
    swellDepth.disconnect();
    filterDepth.disconnect();
  };
}

function startSound(ctx: AudioContext, sound: Settings["sound"]): () => void {
  switch (sound) {
    case "brown": return startBrown(ctx);
    case "pink": return startPink(ctx);
    case "rain": return startRain(ctx);
    case "ocean": return startOcean(ctx);
    case "tick": return startTick(ctx);
  }
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
  const { revision } = useWorkspace();
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
  }, [t, revision]);

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

  /** Patch only the fields this screen owns; never resend a stale snapshot. */
  const persistAudio = useCallback(async (
    patch: { audioEnabled?: boolean; sound?: Settings["sound"] },
  ): Promise<Settings> => {
    return writePreferences(currentDatabaseName(), patch);
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
      const next = await persistAudio({ audioEnabled: nextEnabled });
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
      const next = await persistAudio({ sound });
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
      return startSound(ctx, settings.sound);
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
