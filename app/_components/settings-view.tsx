"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { AccountControl } from "./account-control";
import { useChangeLocale } from "./i18n-provider";
import { HelpTip } from "./help-tip";
import { SelectControl } from "./select-control";
import { openDatabase } from "@/lib/db/database";
import { getSettings, saveSettings } from "@/lib/db/repository";
import type { Settings } from "@/lib/domain/types";
import type { ThemeMode } from "@/lib/domain/theme";
import type { Locale } from "@/lib/i18n/config";
import type { VoiceTone } from "@/lib/domain/voice";
import { ThemeControl } from "./theme-control";
import { VoiceControl } from "./voice-control";

export function SettingsView({
  tone,
  voiceReady,
  onTone,
  theme,
  themeReady,
  themeBusy,
  themeError,
  onThemeChange,
}: {
  tone: VoiceTone;
  voiceReady: boolean;
  onTone: (tone: VoiceTone) => void;
  theme: ThemeMode;
  themeReady: boolean;
  themeBusy: boolean;
  themeError: string | null;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  const t = useTranslations("settings");
  const account = useTranslations("account");
  const errors = useTranslations("errors");
  const locale = useLocale();
  const setLocale = useChangeLocale();
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
        if (!cancelled) setError(errors("loadSettings"));
      } finally {
        db?.close();
      }
    }
    void load();
    return () => {
      cancelled = true;
      db?.close();
    };
  }, [errors]);

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
      } finally {
        db.close();
      }
    } catch (cause) {
      console.error("No se pudieron guardar los ajustes", cause);
      setError(errors("saveSettings"));
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return <p className="text-sm text-muted" role="status">{t("loading")}</p>;
  }

  return (
    <section aria-labelledby="settings-title">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {t("eyebrow")}
      </p>
      <h2 id="settings-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h2>

      <div className="mt-7 border-t border-line pt-5">
        <h3 className="text-lg font-semibold">{account("sectionTitle")}</h3>
        <div className="mt-3">
          <AccountControl />
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t("sound.title")}</h3>
          <HelpTip label={t("sound.helpLabel")}>{t("sound.help")}</HelpTip>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void update({ audioEnabled: !settings.audioEnabled })}
            disabled={busy}
            aria-pressed={settings.audioEnabled}
            className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {settings.audioEnabled ? t("sound.mute") : t("sound.activate")}
          </button>
          {settings.audioEnabled ? (
            <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
              <span>{t("sound.label")}</span>
              <SelectControl
                inline
                value={settings.sound}
                label={t("sound.label")}
                disabled={busy}
                options={[
                  { value: "brown", label: t("sound.soft") },
                  { value: "pink", label: t("sound.pink") },
                  { value: "rain", label: t("sound.rain") },
                  { value: "ocean", label: t("sound.ocean") },
                  { value: "tick", label: t("sound.tick") },
                ]}
                onChange={(value) => void update({ sound: value as Settings["sound"] })}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t("voice.title")}</h3>
          <HelpTip label={t("voice.helpLabel")}>{t("voice.help")}</HelpTip>
        </div>
        <div className="mt-3">
          <VoiceControl tone={tone} ready={voiceReady} onTone={onTone} />
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t("color.title")}</h3>
          <HelpTip label={t("color.helpLabel")}>{t("color.help")}</HelpTip>
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
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t("language.title")}</h3>
          <HelpTip label={t("language.helpLabel")}>{t("language.help")}</HelpTip>
        </div>
        <div className="mt-3 flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
          <span>{t("language.label")}</span>
          <SelectControl
            inline
            value={locale}
            label={t("language.label")}
            options={[
              { value: "es", label: t("language.spanish") },
              { value: "en", label: t("language.english") },
            ]}
            onChange={(value) => setLocale(value as Locale)}
          />
        </div>
      </div>

      <div className="mt-7 border-t border-line pt-5">
        <h3 className="text-lg font-semibold">{t("legal.title")}</h3>
        <nav aria-label={t("legal.title")} className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link className="font-semibold underline underline-offset-4" href="/privacy">
            {t("legal.privacy")}
          </Link>
          <Link className="font-semibold underline underline-offset-4" href="/data-deletion">
            {t("legal.deletion")}
          </Link>
        </nav>
      </div>

      {error ? <p className="mt-5 text-sm" role="alert">{error}</p> : null}
    </section>
  );
}
