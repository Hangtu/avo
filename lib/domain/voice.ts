export type VoiceTone = 0 | 1 | 2;
export type VoiceContext = "open" | "work" | "close" | "push";
export type VoicePhrases = Readonly<Record<VoiceContext, readonly string[]>>;

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
  phrases: VoicePhrases,
  previous?: string,
): string | null {
  if (tone === 0) return null;
  if (context === "push" && tone < 2) return null;
  const pool = phrases[context];
  const candidates = previous ? pool.filter((phrase) => phrase !== previous) : pool;
  const options = candidates.length > 0 ? candidates : pool;
  return options[score(seed, context) % options.length] ?? null;
}
