import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { voicePhrasesFromMessages } from "@/lib/i18n/voice";
import { chooseVoicePhrase } from "./voice";

const banks = {
  es: voicePhrasesFromMessages(es),
  en: voicePhrasesFromMessages(en),
};

describe("voz local", () => {
  it("mantiene un banco pequeño sin duplicados en cada idioma", () => {
    for (const bank of Object.values(banks)) {
      const phrases = Object.values(bank).flat();
      expect(phrases).toHaveLength(10);
      expect(new Set(phrases).size).toBe(phrases.length);
    }
  });

  it("silencio no devuelve frase", () => {
    expect(chooseVoicePhrase(0, "open", "s", banks.es)).toBeNull();
    expect(chooseVoicePhrase(0, "close", "s", banks.es)).toBeNull();
  });

  it("el empujón solo existe con techo 2", () => {
    expect(chooseVoicePhrase(1, "push", "s", banks.es)).toBeNull();
    expect(chooseVoicePhrase(2, "push", "s", banks.es)).not.toBeNull();
  });

  it("es determinística y evita la frase anterior", () => {
    const first = chooseVoicePhrase(1, "work", "2026-10-30", banks.es);
    expect(chooseVoicePhrase(1, "work", "2026-10-30", banks.es)).toBe(first);
    expect(chooseVoicePhrase(1, "work", "2026-10-30", banks.es, first ?? undefined)).not.toBe(first);
    expect(chooseVoicePhrase(1, "work", "2026-10-30", banks.en)).not.toBe("");
  });
});
