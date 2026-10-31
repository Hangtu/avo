import type { VoicePhrases } from "@/lib/domain/voice";

type VoiceMessages = Record<keyof VoicePhrases, Record<string, string>>;

/** next-intl stores messages as nested objects; voice phrases become arrays. */
export function voicePhrasesFromMessages(messages: { voice: unknown }): VoicePhrases {
  const voice = messages.voice as VoiceMessages;
  return {
    open: Object.values(voice.open),
    work: Object.values(voice.work),
    close: Object.values(voice.close),
    push: Object.values(voice.push),
  };
}
