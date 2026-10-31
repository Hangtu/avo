import en from "@/messages/en.json";
import es from "@/messages/es.json";

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";
export const localeStorageKey = "runo:locale";
export const timeZone = "America/Mexico_City";

export const messages = { es, en } as const;
export const intlLocales: Record<Locale, string> = {
  es: "es-MX",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
