import { assertTimestamp, clockMinutes, parseClockTime } from "./time";
import { SOUND_KEYS, type PendingInput, type RoutineInput, type Settings, type TaskInput } from "./types";

export const MAX_TITLE_LENGTH = 1024;
export const MAX_CATEGORY_LENGTH = 256;
export const MAX_ROUTINE_STEPS = 50;

export class DomainError extends Error {
  constructor(
    public readonly code: "validation" | "not_found" | "conflict" | "invalid_transition",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function assertId(id: string): void {
  if (typeof id !== "string" || !id.trim() || id !== id.trim()) {
    throw new DomainError("validation", "El identificador no es válido.");
  }
}

function positiveMinutes(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > Math.floor(Number.MAX_SAFE_INTEGER / 60)) {
    throw new DomainError("validation", "Escribe cuántos minutos.");
  }
}

/** Rebuild/clone the input so callers cannot mutate persisted nested values. */
export function validateTaskInput(input: TaskInput, options: { allowEmptyDays?: boolean } = {}): TaskInput {
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > MAX_TITLE_LENGTH) {
    throw new DomainError("validation", "Escribe el nombre de la tarea.");
  }
  if (
    typeof input.category !== "string" ||
    !input.category.trim() ||
    input.category.length > MAX_CATEGORY_LENGTH
  ) {
    throw new DomainError("validation", "Elige un tipo.");
  }
  positiveMinutes(input.durationMin);
  if (![1, 2, 3].includes(input.priority)) {
    throw new DomainError("validation", "La importancia debe estar entre 1 y 3.");
  }
  if (!Array.isArray(input.days) || input.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new DomainError("validation", "Elige días de la semana.");
  }

  const days = [...new Set(input.days)].sort();
  if (!options.allowEmptyDays && days.length === 0) {
    throw new DomainError("validation", "Elige al menos un día.");
  }

  const normalized: TaskInput = {
    title: input.title.trim(),
    category: input.category.trim(),
    durationMin: input.durationMin,
    priority: input.priority,
    days,
  };
  if (input.window) {
    const start = parseClockTime(input.window.start);
    const end = parseClockTime(input.window.end);
    if (clockMinutes(start) >= clockMinutes(end)) {
      throw new DomainError("validation", "La hora final debe ser después de la inicial.");
    }
    normalized.window = { start, end };
  }
  if (input.fixedTime !== undefined) {
    normalized.fixedTime = parseClockTime(input.fixedTime);
    if (
      normalized.window &&
      (clockMinutes(normalized.fixedTime) < clockMinutes(normalized.window.start) ||
        clockMinutes(normalized.fixedTime) >= clockMinutes(normalized.window.end))
    ) {
      throw new DomainError("validation", "La hora exacta debe estar dentro del horario.");
    }
  }
  if (input.shortStep) {
    if (
      typeof input.shortStep.title !== "string" ||
      !input.shortStep.title.trim() ||
      input.shortStep.title.length > MAX_TITLE_LENGTH
    ) {
      throw new DomainError("validation", "Escribe qué harás en el primer paso.");
    }
    positiveMinutes(input.shortStep.durationMin);
    if (input.shortStep.durationMin >= input.durationMin) {
      throw new DomainError("validation", "El primer paso debe durar menos que la tarea completa.");
    }
    normalized.shortStep = {
      title: input.shortStep.title.trim(),
      durationMin: input.shortStep.durationMin,
    };
  }
  return normalized;
}

/** A routine is an ordered group; member definitions and their histories remain independent. */
export function validateRoutineInput(input: RoutineInput): RoutineInput {
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > MAX_TITLE_LENGTH) {
    throw new DomainError("validation", "Escribe el nombre de la rutina.");
  }
  if (!Array.isArray(input.taskIds) || input.taskIds.length < 2 || input.taskIds.length > MAX_ROUTINE_STEPS) {
    throw new DomainError("validation", "Elige entre 2 y 50 hábitos para la rutina.");
  }
  const taskIds = input.taskIds.map((id) => {
    assertId(id);
    return id;
  });
  if (new Set(taskIds).size !== taskIds.length) {
    throw new DomainError("validation", "Un hábito no puede repetirse en la rutina.");
  }
  return { title: input.title.trim(), taskIds };
}

/** Title and integer minutes are the whole input for a one-off pending item. */
export function validatePendingInput(input: PendingInput): PendingInput {
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > MAX_TITLE_LENGTH) {
    throw new DomainError("validation", "Escribe el nombre del pendiente.");
  }
  positiveMinutes(input.durationMin);
  return { title: input.title.trim(), durationMin: input.durationMin };
}

export function defaultSettings(now: number): Settings {
  assertTimestamp(now);
  return {
    id: "preferences",
    audioEnabled: false,
    sound: "brown",
    maxTone: 2,
    theme: "auto",
    showWallet: false,
    updatedAt: now,
  };
}

export function validateSettings(settings: Settings): Settings {
  assertTimestamp(settings.updatedAt);
  if (
    settings.id !== "preferences" ||
    typeof settings.audioEnabled !== "boolean" ||
    !SOUND_KEYS.includes(settings.sound) ||
    ![0, 1, 2].includes(settings.maxTone) ||
    !["auto", "light", "dark"].includes(settings.theme) ||
    typeof settings.showWallet !== "boolean" ||
    (settings.locale !== undefined && !["es", "en"].includes(settings.locale)) ||
    (settings.taskOrder !== undefined &&
      (!settings.taskOrder ||
        typeof settings.taskOrder !== "object" ||
        Array.isArray(settings.taskOrder) ||
        Object.entries(settings.taskOrder).some(
          ([key, value]) =>
            !key.trim() ||
            ["__proto__", "prototype", "constructor"].includes(key) ||
            !Number.isSafeInteger(value) ||
            value < 0,
        )))
  ) {
    throw new DomainError("validation", "La configuración no es válida.");
  }
  return { ...settings };
}
