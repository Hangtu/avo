/** Calendar date in the device's local timezone, never a UTC ISO slice. */
export type LocalDate = `${number}-${number}-${number}`;
export type ClockTime = `${number}:${number}`;
/** JavaScript calendar convention: Sunday = 0, Monday = 1. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function assertTimestamp(timestamp: number): void {
  if (!Number.isFinite(timestamp) || Number.isNaN(new Date(timestamp).getTime())) {
    throw new Error("La fecha y hora no son válidas.");
  }
}

export function parseLocalDate(value: string): LocalDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Usa una fecha con formato AAAA-MM-DD.");

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (
    year < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("La fecha del calendario no existe.");
  }
  return value as LocalDate;
}

export function toLocalDate(timestamp: number): LocalDate {
  assertTimestamp(timestamp);
  const date = new Date(timestamp);
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return parseLocalDate(`${year}-${month}-${day}`);
}

export function parseClockTime(value: string): ClockTime {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    throw new Error("Usa una hora válida con formato HH:MM.");
  }
  return value as ClockTime;
}

export function clockMinutes(value: string): number {
  const [hour, minute] = parseClockTime(value).split(":").map(Number);
  return hour * 60 + minute;
}

export function localClockMinutes(timestamp: number): number {
  assertTimestamp(timestamp);
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

export function weekdayOf(date: LocalDate): Weekday {
  parseLocalDate(date);
  const [year, month, day] = date.split("-").map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(0, 0, 0, 0);
  return calendar.getUTCDay() as Weekday;
}
