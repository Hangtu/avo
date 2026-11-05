const MAX_RETRY_MS = 15 * 60 * 1000;

/** Both HTTP forms; malformed/missing values fall back to one minute on a 429. */
export function retryAfterMs(value: string | null, now = Date.now()): number {
  if (value && /^\d+$/.test(value.trim())) {
    const seconds = Number(value);
    if (Number.isSafeInteger(seconds)) return Math.min(MAX_RETRY_MS, Math.max(1_000, seconds * 1_000));
  }
  if (value && / GMT$/i.test(value.trim())) {
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.min(MAX_RETRY_MS, Math.max(1_000, date - now));
  }
  return 60_000;
}
