import type { RunoDatabase } from "./database";
import { assertTimestamp } from "@/lib/domain/time";
import {
  EVENT_TYPES,
  type EventType,
  type JsonValue,
  type RunoEvent,
  type TaskInput,
} from "@/lib/domain/types";
import { assertId, DomainError } from "@/lib/domain/validation";

export type EventInput = Omit<RunoEvent, "id" | "context"> & {
  context?: Record<string, JsonValue>;
};

export function eventIdFor(actionId: string, type: EventType): string {
  assertId(actionId);
  if (!(EVENT_TYPES as readonly string[]).includes(type)) {
    throw new DomainError("validation", "El tipo de evento no existe.");
  }
  return `${encodeURIComponent(actionId)}:${type}`;
}

function canonicalJson(value: JsonValue, ancestors = new Set<object>()): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || ancestors.has(value)) {
    throw new DomainError(
      "validation",
      "El contexto del evento debe ser JSON sin ciclos ni valores inválidos.",
    );
  }
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new DomainError("validation", "El contexto no admite objetos de plataforma.");
  }
  ancestors.add(value);
  const result: JsonValue = Array.isArray(value)
    ? Array.from(value, (item) => canonicalJson(item, ancestors))
    : Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, canonicalJson(value[key], ancestors)]),
      );
  ancestors.delete(value);
  return result;
}

export function taskEventContext(task: TaskInput): Record<string, JsonValue> {
  return {
    title: task.title,
    days: [...task.days],
    durationMin: task.durationMin,
    priority: task.priority,
    category: task.category,
    window: task.window ? { ...task.window } : null,
    fixedTime: task.fixedTime ?? null,
    shortStep: task.shortStep ? { ...task.shortStep } : null,
  };
}

function samePayload(a: RunoEvent, b: RunoEvent): boolean {
  // Retrying later preserves the original timestamp; it must not rewrite history.
  const { at: aTime, ...aPayload } = a;
  const { at: bTime, ...bPayload } = b;
  void aTime;
  void bTime;
  return JSON.stringify(canonicalJson(aPayload)) === JSON.stringify(canonicalJson(bPayload));
}

/** Append-only through this API. One action may legitimately emit multiple event types. */
export async function appendEvent(
  db: RunoDatabase,
  input: EventInput,
): Promise<{ event: RunoEvent; inserted: boolean }> {
  assertTimestamp(input.at);
  const id = eventIdFor(input.actionId, input.type);
  for (const reference of [input.taskId, input.occurrenceId, input.sessionId, input.handId]) {
    if (reference !== undefined) assertId(reference);
  }
  const context = canonicalJson(input.context ?? {}) as Record<string, JsonValue>;
  if (Array.isArray(context) || context === null || typeof context !== "object") {
    throw new DomainError("validation", "El contexto del evento debe ser un objeto.");
  }
  const event: RunoEvent = {
    id,
    actionId: input.actionId,
    type: input.type,
    at: input.at,
    ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
    ...(input.occurrenceId !== undefined ? { occurrenceId: input.occurrenceId } : {}),
    ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
    ...(input.handId !== undefined ? { handId: input.handId } : {}),
    context,
  };
  return db.transaction("rw", db.events, async () => {
    const previous = await db.events.get(id);
    if (previous) {
      if (!samePayload(previous, event)) {
        throw new DomainError("conflict", "No se puede reutilizar una acción con otro contenido.");
      }
      return { event: previous, inserted: false };
    }
    await db.events.add(event);
    return { event, inserted: true };
  });
}
