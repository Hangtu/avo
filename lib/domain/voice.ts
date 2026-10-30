export type VoiceTone = 0 | 1 | 2;
export type VoiceContext = "open" | "work" | "close" | "push";

export const VOICE_PHRASES: Readonly<Record<VoiceContext, readonly string[]>> = {
  open: [
    "Una cosa a la vez. Empieza por esta.",
    "Elige una y arranca.",
    "Hoy no necesitas hacerlo todo.",
  ],
  work: [
    "Dijiste que esto te importa. Haz el primer paso.",
    "Sigue con lo que ya empezaste.",
    "Un poco es mejor que nada.",
  ],
  close: [
    "Hecho. Tú decides si vas por otra franja.",
    "Lo hecho queda. Ahora puedes parar.",
  ],
  push: [
    "Deja el scroll y haz lo que dijiste.",
    "No necesitas ganas para empezar; necesitas empezar.",
  ],
};

function score(seed: string, context: VoiceContext): number {
  let hash = 2166136261;
  const value = `${seed}:${context}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Local and deterministic. Level 2 is never automatic: `push` returns null
 * unless the user explicitly asks for it with a level-2 ceiling.
 */
export function chooseVoicePhrase(
  tone: VoiceTone,
  context: VoiceContext,
  seed: string,
  previous?: string,
): string | null {
  if (tone === 0) return null;
  if (context === "push" && tone < 2) return null;
  const pool = VOICE_PHRASES[context];
  const candidates = previous ? pool.filter((phrase) => phrase !== previous) : pool;
  const options = candidates.length > 0 ? candidates : pool;
  return options[score(seed, context) % options.length] ?? null;
}
