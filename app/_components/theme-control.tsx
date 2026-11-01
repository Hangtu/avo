"use client";

import { useTranslations } from "next-intl";
import type { ThemeMode } from "@/lib/domain/theme";
import { SelectControl } from "./select-control";

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
      <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
        <span>{t("mode")}</span>
        <SelectControl
          inline
          value={mode}
          label={t("mode")}
          disabled={!ready || busy}
          options={[
            { value: "auto", label: t("auto") },
            { value: "light", label: t("light") },
            { value: "dark", label: t("dark") },
          ]}
          onChange={(value) => onChange(value as ThemeMode)}
        />
      </div>
      {error ? (
        <span role="status" className="text-xs leading-5">
          {error}
        </span>
      ) : null}
    </div>
  );
}
