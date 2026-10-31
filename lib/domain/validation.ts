import { assertTimestamp, clockMinutes, parseClockTime } from "./time";
import type { Settings, TaskInput } from "./types";

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

function positiveMinutes(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > Math.floor(Number.MAX_SAFE_INTEGER / 60)) {
    throw new DomainError("validation", `${label} debe ser un número entero positivo de minutos.`);
  }
}

/** Rebuild/clone the input so callers cannot mutate persisted nested values. */
export function validateTaskInput(input: TaskInput): TaskInput {
  if (typeof input.title !== "string" || !input.title.trim()) {
    throw new DomainError("validation", "Escribe el nombre de la tarea.");
  }
  if (typeof input.category !== "string" || !input.category.trim()) {
    throw new DomainError("validation", "Indica una categoría.");
  }
  positiveMinutes(input.durationMin, "La duración");
  if (![1, 2, 3].includes(input.priority)) {
    throw new DomainError("validation", "La prioridad debe estar entre 1 y 3.");
  }
  if (
    !Array.isArray(input.days) ||
    input.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new DomainError("validation", "Selecciona días válidos de la semana.");
  }

  const normalized: TaskInput = {
    title: input.title.trim(),
    category: input.category.trim(),
    durationMin: input.durationMin,
    priority: input.priority,
    days: [...new Set(input.days)].sort(),
  };
  if (input.window) {
    const start = parseClockTime(input.window.start);
    const end = parseClockTime(input.window.end);
    if (clockMinutes(start) >= clockMinutes(end)) {
      throw new DomainError("validation", "La franja debe terminar después de empezar, en el mismo día.");
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
      throw new DomainError("validation", "La hora fija debe estar dentro de la franja.");
    }
  }
  if (input.shortStep) {
    if (typeof input.shortStep.title !== "string" || !input.shortStep.title.trim()) {
      throw new DomainError("validation", "Describe la acción concreta del primer paso.");
    }
    positiveMinutes(input.shortStep.durationMin, "El primer paso");
    if (input.shortStep.durationMin >= input.durationMin) {
      throw new DomainError("validation", "El primer paso debe ser más corto que la tarea completa.");
    }
    normalized.shortStep = {
      title: input.shortStep.title.trim(),
      durationMin: input.shortStep.durationMin,
    };
  }
  return normalized;
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
    !["brown", "tick"].includes(settings.sound) ||
    ![0, 1, 2].includes(settings.maxTone) ||
    !["auto", "light", "dark"].includes(settings.theme) ||
    typeof settings.showWallet !== "boolean"
  ) {
    throw new DomainError("validation", "La configuración no es válida.");
  }
  return { ...settings };
}
