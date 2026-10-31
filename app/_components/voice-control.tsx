"use client";

import { useTranslations } from "next-intl";
import type { VoiceTone } from "@/lib/domain/voice";

export function VoiceControl({
  tone,
  ready,
  onTone,
}: {
  tone: VoiceTone;
  ready: boolean;
  onTone: (tone: VoiceTone) => void;
}) {
  const t = useTranslations("settings.voice");
  return (
    <label className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
      <span>{t("label")}</span>
      <select
        value={tone}
        disabled={!ready}
        onChange={(event) => onTone(Number(event.target.value) as VoiceTone)}
        className="min-h-11 max-w-full border border-control bg-background px-3 text-sm disabled:opacity-60"
      >
        <option value={0}>{t("silence")}</option>
        <option value={1}>{t("normal")}</option>
        <option value={2}>{t("strong")}</option>
      </select>
    </label>
  );
}
