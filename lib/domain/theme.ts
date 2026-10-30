import type { Settings } from "./types";

export type ResolvedTheme = "light" | "dark";
export type ThemeMode = Settings["theme"];

export const THEME_STORAGE_KEY = "runo-theme-mode";
export const NIGHT_START_HOUR = 20;
export const NIGHT_END_HOUR = 7;
export const LIGHT_THEME_COLOR = "#F4F1EA";
export const DARK_THEME_COLOR = "#1B1815";

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * Auto is warm night from 20:00 until 07:00 local time. Manual light/dark
 * always wins so a user choice is never overridden by the clock.
 */
export function resolveTheme(mode: ThemeMode, now: number): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  return isNightHour(new Date(now).getHours()) ? "dark" : "light";
}
