"use client";

import { useEffect, useState } from "react";

import { HelpTip } from "./help-tip";
import { openDatabase } from "@/lib/db/database";
import { getSettings, saveSettings } from "@/lib/db/repository";
import type { Settings } from "@/lib/domain/types";
import type { ThemeMode } from "@/lib/domain/theme";
import type { VoiceTone } from "@/lib/domain/voice";
import { ThemeControl } from "./theme-control";
import { VoiceControl } from "./voice-control";

export function SettingsView({
  tone,
  voiceReady,
  onTone,
  onWalletVisibilityChange,
  onOpenWallet,
  theme,
  themeReady,
  themeBusy,
  themeError,
  onThemeChange,
}: {
  tone: VoiceTone;
  voiceReady: boolean;
  onTone: (tone: VoiceTone) => void;
  onWalletVisibilityChange: (visible: boolean) => void;
  onOpenWallet: () => void;
  theme: ThemeMode;
  themeReady: boolean;
  themeBusy: boolean;
  themeError: string | null;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let db: Awaited<ReturnType<typeof openDatabase>> | null = null;
    async function load() {
      try {
        db = await openDatabase();
        const next = await getSettings(db, Date.now());
        if (!cancelled) setSettings(next);
      } catch (cause) {
        console.error("No se pudieron abrir los ajustes", cause);
        if (!cancelled) setError("No se pudieron leer los ajustes.");
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

  async function update(patch: Partial<Settings>) {
    if (!settings || busy) return;
    setBusy(true);
    setError(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const current = await getSettings(db, now);
        const next: Settings = { ...current, ...patch, updatedAt: now };
        await saveSettings(db, next);
        setSettings(next);
        if (patch.showWallet !== undefined) onWalletVisibilityChange(patch.showWallet);
      } finally {
        db.close();
      }
    } catch (cause) {
      console.error("No se pudieron guardar los ajustes", cause);
      setError("No se pudieron guardar los ajustes.");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return <p className="text-sm text-muted" role="status">Abriendo ajustes…</p>;
  }

  return (
    <section aria-labelledby="settings-title">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Configuración
      </p>
      <h2 id="settings-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Ajustes
      </h2>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Sonido</h3>
          <HelpTip label="Información sobre el sonido">
            Apagado por defecto. Solo se activa si tú lo pides.
          </HelpTip>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void update({ audioEnabled: !settings.audioEnabled })}
            disabled={busy}
            aria-pressed={settings.audioEnabled}
            className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {settings.audioEnabled ? "Silenciar" : "Activar sonido"}
          </button>
          {settings.audioEnabled ? (
            <label className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
              <span>Sonido</span>
              <select
                value={settings.sound}
                onChange={(event) => void update({ sound: event.target.value as Settings["sound"] })}
                disabled={busy}
                className="min-h-11 border border-control bg-background px-3 text-sm disabled:opacity-60"
              >
                <option value="brown">Ruido marrón</option>
                <option value="tick">Tic-tac</option>
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Voz</h3>
          <HelpTip label="Información sobre la voz">
            La voz normal está disponible; el modo duro solo cuando lo pides.
          </HelpTip>
        </div>
        <div className="mt-3">
          <VoiceControl tone={tone} ready={voiceReady} onTone={onTone} />
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Apariencia</h3>
          <HelpTip label="Información sobre el tema">
            El tema automático cambia a noche cálida de 20:00 a 07:00.
          </HelpTip>
        </div>
        <div className="mt-3">
          <ThemeControl
            mode={theme}
            ready={themeReady}
            busy={themeBusy}
            error={themeError}
            onChange={onThemeChange}
          />
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-5">
        <h3 className="text-lg font-semibold">Monedero</h3>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.showWallet}
            onChange={(event) => void update({ showWallet: event.target.checked })}
            disabled={busy}
            className="h-5 w-5"
          />
          Mostrar Monedero en la navegación
        </label>
        {settings.showWallet ? (
          <button
            type="button"
            onClick={onOpenWallet}
            className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            Abrir Monedero
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-5 text-sm" role="alert">{error}</p> : null}
    </section>
  );
}
