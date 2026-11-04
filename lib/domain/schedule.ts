import type { ClockTime } from "./time";

export type BlockKey = "morning" | "afternoon" | "night";
export type TaskBlock = BlockKey | "any";
export type WindowPreset = BlockKey | "custom";

export const BLOCK_RANGES: Record<BlockKey, { start: ClockTime; end: ClockTime }> = {
  morning: { start: "05:00", end: "12:00" },
  afternoon: { start: "12:00", end: "19:00" },
  night: { start: "19:00", end: "23:59" },
};

/** Only an exact preset is a preset; a narrower or shifted range is custom. */
export function windowPreset(start: string, end: string): WindowPreset {
  for (const [key, range] of Object.entries(BLOCK_RANGES) as Array<
    [BlockKey, { start: ClockTime; end: ClockTime }]
  >) {
    if (start === range.start && end === range.end) return key;
  }
  return "custom";
}

/** The visual list group comes from the current task time, not its full window. */
export function taskTime(task: {
  fixedTime?: ClockTime;
  window?: { start: ClockTime; end: ClockTime };
}): string | null {
  return task.fixedTime ?? task.window?.start ?? null;
}

/** Minutes for the visual task time; no time sorts last. */
export function timeMinutes(time: string | null): number {
  if (!time) return 24 * 60;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function blockForTime(time: string | null): TaskBlock {
  if (!time) return "any";
  const hour = Number(time.slice(0, 2));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 19) return "afternoon";
  return "night";
}
