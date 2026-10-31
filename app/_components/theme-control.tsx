"use client";

import { useTranslations } from "next-intl";
import type { ThemeMode } from "@/lib/domain/theme";

export function ThemeControl({
  mode,
  ready,
  busy,
  error,
  onChange,
}: {
  mode: ThemeMode;
  ready: boolean;
  busy: boolean;
  error: string | null;
  onChange: (mode: ThemeMode) => void;
}) {
  const t = useTranslations("settings.color");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
        <span>{t("mode")}</span>
        <select
          value={mode}
          disabled={!ready || busy}
          onChange={(event) => onChange(event.target.value as ThemeMode)}
          className="min-h-11 max-w-full border border-control bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="auto">{t("auto")}</option>
          <option value="light">{t("light")}</option>
          <option value="dark">{t("dark")}</option>
        </select>
      </label>
      {error ? (
        <span role="status" className="text-xs leading-5">
          {error}
        </span>
      ) : null}
    </div>
  );
}
