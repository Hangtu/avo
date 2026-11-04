export type VibrationTarget = {
  vibrate?: (pattern: number | number[]) => boolean;
};

export const HAPTIC_PATTERNS = {
  timer: [120, 80, 120],
  anchor: [60, 40, 60],
} as const;

/**
 * Optional haptic feedback. iOS Safari has no `navigator.vibrate`, some
 * browsers reject it, and a rejected call must never affect the flow.
 */
export function vibrate(
  pattern: number | number[],
  target: VibrationTarget | null = typeof navigator === "undefined" ? null : navigator,
): boolean {
  if (!target || typeof target.vibrate !== "function") return false;
  try {
    return target.vibrate(pattern) === true;
  } catch {
    return false;
  }
}

export function pulse(kind: keyof typeof HAPTIC_PATTERNS, target?: VibrationTarget | null): boolean {
  return vibrate([...HAPTIC_PATTERNS[kind]], target);
}
