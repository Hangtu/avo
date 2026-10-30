import { describe, expect, it } from "vitest";
import { chooseVoicePhrase, VOICE_PHRASES } from "./voice";

describe("voz local", () => {
  it("mantiene un banco pequeño sin duplicados", () => {
    const phrases = Object.values(VOICE_PHRASES).flat();
    expect(phrases).toHaveLength(10);
    expect(new Set(phrases).size).toBe(phrases.length);
  });

  it("silencio no devuelve frase", () => {
    expect(chooseVoicePhrase(0, "open", "s")).toBeNull();
    expect(chooseVoicePhrase(0, "close", "s")).toBeNull();
  });

  it("el empujón solo existe con techo 2", () => {
    expect(chooseVoicePhrase(1, "push", "s")).toBeNull();
    expect(chooseVoicePhrase(2, "push", "s")).not.toBeNull();
  });

  it("es determinística y evita la frase anterior", () => {
    const first = chooseVoicePhrase(1, "work", "2026-10-30", undefined);
    expect(chooseVoicePhrase(1, "work", "2026-10-30", undefined)).toBe(first);
    expect(chooseVoicePhrase(1, "work", "2026-10-30", first ?? undefined)).not.toBe(first);
  });
});
