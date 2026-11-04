"use client";

import { useTranslations } from "next-intl";
import type { VoiceTone } from "@/lib/domain/voice";
import { SelectControl } from "./select-control";

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
    <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
      <span>{t("label")}</span>
      <SelectControl
        inline
        value={String(tone)}
        label={t("label")}
        disabled={!ready}
        options={[
          { value: "0", label: t("silence") },
          { value: "1", label: t("normal") },
          { value: "2", label: t("strong") },
        ]}
        onChange={(value) => onTone(Number(value) as VoiceTone)}
      />
    </div>
  );
}
