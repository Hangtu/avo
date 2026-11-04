import type { InferInsertModel } from "drizzle-orm";

import { EVENT_TYPES } from "@/lib/domain/types";
import type {
  Day,
  Hand,
  JsonValue,
  LedgerEntry,
  Metadata,
  Occurrence,
  Pending,
  RunoEvent,
  Session,
  Settings,
  Task,
  TaskAgreement,
  TaskInput,
} from "@/lib/domain/types";
import { parseLocalDate } from "@/lib/domain/time";
import {
  DomainError,
  validatePendingInput,
  validateSettings,
  validateTaskInput,
} from "@/lib/domain/validation";
import {
  days as daysTable,
  events as eventsTable,
  handItems as handItemsTable,
  hands as handsTable,
  ledger as ledgerTable,
  metadata as metadataTable,
  occurrences as occurrencesTable,
  pendings as pendingsTable,
  sessions as sessionsTable,
  settings as settingsTable,
  tasks as tasksTable,
  users as usersTable,
} from "@/lib/db/schema";

import { BACKUP_SCHEMA_VERSION, type RunoSnapshot } from "./snapshot-types";

const MAX_ROWS = 100_000;

export type { RunoSnapshot } from "./snapshot-types";

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BackupError(`${field} no es un objeto.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BackupError(`${field} no es texto válido.`);
  }
  return value;
}

function ms(value: unknown, field: string): number {
  if (!Number.isFinite(value)) {
    throw new BackupError(`${field} no es una fecha válida.`);
  }
  return value as number;
}

function nullableMs(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  return ms(value, field);
}

function integer(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new BackupError(`${field} no es un entero válido.`);
  }
  return value as number;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value) || value.length > MAX_ROWS) {
    throw new BackupError(`${field} no es una lista válida.`);
  }
  return value;
}

function stringList(value: unknown, field: string): string[] {
  return array(value, field).map((item) => text(item, field));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new BackupError(`${field} no es válido.`);
  }
  return value as T;
}

function taskFrom(value: unknown): Task {
  const raw = record(value, "task");
  let input: TaskInput;
  try {
    input = validateTaskInput(
      {
        title: raw.title as string,
        days: raw.days as TaskInput["days"],
        durationMin: raw.durationMin as number,
        priority: raw.priority as TaskInput["priority"],
        category: raw.category as string,
        window: raw.window as TaskInput["window"],
        fixedTime: raw.fixedTime as TaskInput["fixedTime"],
        shortStep: raw.shortStep as TaskInput["shortStep"],
      },
      { allowEmptyDays: true },
    );
  } catch (error) {
    if (error instanceof DomainError) throw new BackupError(error.message);
    throw error;
  }
  return {
    ...input,
    id: text(raw.id, "task.id"),
    createdAt: ms(raw.createdAt, "task.createdAt"),
    updatedAt: ms(raw.updatedAt, "task.updatedAt"),
    archivedAt: nullableMs(raw.archivedAt, "task.archivedAt"),
  };
}

function pendingFrom(value: unknown): Pending {
  const raw = record(value, "pending");
  let input;
  try {
    input = validatePendingInput({
      title: raw.title as string,
      durationMin: raw.durationMin as number,
    });
  } catch (error) {
    if (error instanceof DomainError) throw new BackupError(error.message);
    throw error;
  }
  return {
    ...input,
    id: text(raw.id, "pending.id"),
    createdAt: ms(raw.createdAt, "pending.createdAt"),
    updatedAt: ms(raw.updatedAt, "pending.updatedAt"),
    completedAt: nullableMs(raw.completedAt, "pending.completedAt"),
    deletedAt: nullableMs(raw.deletedAt, "pending.deletedAt"),
  };
}

function occurrenceFrom(value: unknown): Occurrence {
  const raw = record(value, "occurrence");
  const date = parseLocalDate(text(raw.date, "occurrence.date"));
  return {
    id: text(raw.id, "occurrence.id"),
    taskId: text(raw.taskId, "occurrence.taskId"),
    date,
    status: oneOf(
      raw.status,
      ["pending", "in_progress", "partial", "completed", "already_done", "not_applicable"] as const,
      "occurrence.status",
    ),
    timerElapsedSec: integer(raw.timerElapsedSec, "occurrence.timerElapsedSec"),
    creditedRc: integer(raw.creditedRc, "occurrence.creditedRc"),
    shortStepCompleted: raw.shortStepCompleted === true,
    agreement:
      raw.agreement === null || raw.agreement === undefined
        ? null
        : (record(raw.agreement, "occurrence.agreement") as unknown as TaskAgreement),
    anchorPresentedAt: nullableMs(raw.anchorPresentedAt, "occurrence.anchorPresentedAt"),
    createdAt: ms(raw.createdAt, "occurrence.createdAt"),
    updatedAt: ms(raw.updatedAt, "occurrence.updatedAt"),
  };
}

function dayFrom(value: unknown): Day {
  const raw = record(value, "day");
  const date = parseLocalDate(text(raw.date, "day.date"));
  const swapsUsed = integer(raw.swapsUsed, "day.swapsUsed");
  if (swapsUsed < 0 || swapsUsed > 3) throw new BackupError("day.swapsUsed no es válido.");
  return {
    date,
    swapsUsed: swapsUsed as Day["swapsUsed"],
    closedAt: nullableMs(raw.closedAt, "day.closedAt"),
    createdAt: ms(raw.createdAt, "day.createdAt"),
  };
}

function handFrom(value: unknown): Hand {
  const raw = record(value, "hand");
  const date = parseLocalDate(text(raw.date, "hand.date"));
  return {
    id: text(raw.id, "hand.id"),
    date,
    ordinal: integer(raw.ordinal, "hand.ordinal"),
    occurrenceIds: stringList(raw.occurrenceIds, "hand.occurrenceIds"),
    deferredOccurrenceIds: stringList(raw.deferredOccurrenceIds, "hand.deferredOccurrenceIds"),
    status: oneOf(raw.status, ["open", "closed"] as const, "hand.status"),
    createdAt: ms(raw.createdAt, "hand.createdAt"),
    closedAt: nullableMs(raw.closedAt, "hand.closedAt"),
  };
}

function sessionFrom(value: unknown): Session {
  const raw = record(value, "session");
  const status = oneOf(
    raw.status,
    ["running", "paused", "awaiting_confirmation", "completed", "partial", "abandoned"] as const,
    "session.status",
  );
  return {
    id: text(raw.id, "session.id"),
    occurrenceId: text(raw.occurrenceId, "session.occurrenceId"),
    handId: raw.handId === null || raw.handId === undefined ? null : text(raw.handId, "session.handId"),
    variant: oneOf(raw.variant, ["full", "short"] as const, "session.variant"),
    status,
    quick: raw.quick === true,
    ...(raw.pendingId === null || raw.pendingId === undefined
      ? {}
      : { pendingId: text(raw.pendingId, "session.pendingId") }),
    taskSnapshot: taskFrom(raw.taskSnapshot),
    durationSec: integer(raw.durationSec, "session.durationSec"),
    rewardTargetRc: integer(raw.rewardTargetRc, "session.rewardTargetRc"),
    rewardCapRc: integer(raw.rewardCapRc, "session.rewardCapRc"),
    remainingSecAtStart: integer(raw.remainingSecAtStart, "session.remainingSecAtStart"),
    elapsedSec: integer(raw.elapsedSec, "session.elapsedSec"),
    startedAt: status === "running" ? ms(raw.startedAt, "session.startedAt") : null,
    createdAt: ms(raw.createdAt, "session.createdAt"),
    updatedAt: ms(raw.updatedAt, "session.updatedAt"),
  } as Session;
}

function eventFrom(value: unknown): RunoEvent {
  const raw = record(value, "event");
  return {
    id: text(raw.id, "event.id"),
    actionId: text(raw.actionId, "event.actionId"),
    type: oneOf(raw.type, EVENT_TYPES, "event.type"),
    at: ms(raw.at, "event.at"),
    ...(raw.taskId === null || raw.taskId === undefined ? {} : { taskId: text(raw.taskId, "event.taskId") }),
    ...(raw.occurrenceId === null || raw.occurrenceId === undefined
      ? {}
      : { occurrenceId: text(raw.occurrenceId, "event.occurrenceId") }),
    ...(raw.sessionId === null || raw.sessionId === undefined
      ? {}
      : { sessionId: text(raw.sessionId, "event.sessionId") }),
    ...(raw.handId === null || raw.handId === undefined ? {} : { handId: text(raw.handId, "event.handId") }),
    context: record(raw.context, "event.context") as Record<string, JsonValue>,
  };
}

function ledgerFrom(value: unknown): LedgerEntry {
  const raw = record(value, "ledger");
  return {
    id: text(raw.id, "ledger.id"),
    sourceKey: text(raw.sourceKey, "ledger.sourceKey"),
    ...(raw.occurrenceId === null || raw.occurrenceId === undefined
      ? {}
      : { occurrenceId: text(raw.occurrenceId, "ledger.occurrenceId") }),
    deltaRc: integer(raw.deltaRc, "ledger.deltaRc"),
    reason: oneOf(raw.reason, ["full_completion", "short_step", "redemption"] as const, "ledger.reason"),
    at: ms(raw.at, "ledger.at"),
  };
}

function metadataFrom(value: unknown): Metadata {
  const raw = record(value, "metadata");
  return {
    key: text(raw.key, "metadata.key"),
    value: raw.value as JsonValue,
  };
}

/** Validate a complete snapshot before local import or use in migration fixtures. */
export function parseBackupSnapshot(value: unknown): RunoSnapshot {
  const raw = record(value, "snapshot");
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new BackupError("La versión de la copia no es compatible.");
  }
  const settings = (() => {
    try {
      return validateSettings(record(raw.settings, "settings") as unknown as Settings);
    } catch (error) {
      if (error instanceof DomainError) throw new BackupError(error.message);
      throw error;
    }
  })();

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: ms(raw.exportedAt, "snapshot.exportedAt"),
    tasks: array(raw.tasks, "tasks").map(taskFrom),
    pendings: array(raw.pendings, "pendings").map(pendingFrom),
    occurrences: array(raw.occurrences, "occurrences").map(occurrenceFrom),
    days: array(raw.days, "days").map(dayFrom),
    hands: array(raw.hands, "hands").map(handFrom),
    sessions: array(raw.sessions, "sessions").map(sessionFrom),
    events: array(raw.events, "events").map(eventFrom),
    ledger: array(raw.ledger, "ledger").map(ledgerFrom),
    settings,
    metadata: array(raw.metadata, "metadata").map(metadataFrom),
  };
}

type TaskInsert = InferInsertModel<typeof tasksTable>;
type PendingInsert = InferInsertModel<typeof pendingsTable>;
type DayInsert = InferInsertModel<typeof daysTable>;
type HandInsert = InferInsertModel<typeof handsTable>;
type HandItemInsert = InferInsertModel<typeof handItemsTable>;
type OccurrenceInsert = InferInsertModel<typeof occurrencesTable>;
type SessionInsert = InferInsertModel<typeof sessionsTable>;
type EventInsert = InferInsertModel<typeof eventsTable>;
type LedgerInsert = InferInsertModel<typeof ledgerTable>;
type MetadataInsert = InferInsertModel<typeof metadataTable>;
type SettingsInsert = InferInsertModel<typeof settingsTable>;
type UserInsert = InferInsertModel<typeof usersTable>;

export interface SnapshotRows {
  user: UserInsert;
  tasks: TaskInsert[];
  pendings: PendingInsert[];
  days: DayInsert[];
  hands: HandInsert[];
  handItems: HandItemInsert[];
  occurrences: OccurrenceInsert[];
  sessions: SessionInsert[];
  events: EventInsert[];
  ledger: LedgerInsert[];
  settings: SettingsInsert;
  metadata: MetadataInsert[];
}

const instant = (value: number | null | undefined): Date | null =>
  value === null || value === undefined ? null : new Date(value);

/** Maps local IDs and epoch timestamps into the Postgres representation. */
export function rowsForSnapshot(snapshot: RunoSnapshot, ownerId: string, timeZone: string): SnapshotRows {
  const tasks: TaskInsert[] = snapshot.tasks.map((task) => ({
    id: task.id,
    userId: ownerId,
    title: task.title,
    category: task.category,
    durationMin: task.durationMin,
    priority: task.priority,
    days: task.days,
    windowStart: task.window?.start ?? null,
    windowEnd: task.window?.end ?? null,
    fixedTime: task.fixedTime ?? null,
    shortStepTitle: task.shortStep?.title ?? null,
    shortStepDurationMin: task.shortStep?.durationMin ?? null,
    archivedAt: instant(task.archivedAt),
    createdAt: instant(task.createdAt)!,
    updatedAt: instant(task.updatedAt)!,
  }));
  const pendings: PendingInsert[] = snapshot.pendings.map((pending) => ({
    id: pending.id,
    userId: ownerId,
    title: pending.title,
    durationMin: pending.durationMin,
    completedAt: instant(pending.completedAt),
    deletedAt: instant(pending.deletedAt),
    createdAt: instant(pending.createdAt)!,
    updatedAt: instant(pending.updatedAt)!,
  }));
  const days: DayInsert[] = snapshot.days.map((day) => ({
    userId: ownerId,
    date: day.date,
    swapsUsed: day.swapsUsed,
    closedAt: instant(day.closedAt),
    createdAt: instant(day.createdAt)!,
  }));
  const hands: HandInsert[] = snapshot.hands.map((hand) => ({
    id: hand.id,
    userId: ownerId,
    date: hand.date,
    ordinal: hand.ordinal,
    status: hand.status,
    createdAt: instant(hand.createdAt)!,
    closedAt: instant(hand.closedAt),
  }));
  const occurrences: OccurrenceInsert[] = snapshot.occurrences.map((occurrence) => ({
    id: occurrence.id,
    userId: ownerId,
    taskId: occurrence.taskId,
    date: occurrence.date,
    status: occurrence.status,
    timerElapsedSec: occurrence.timerElapsedSec,
    creditedRc: occurrence.creditedRc,
    shortStepCompleted: occurrence.shortStepCompleted,
    agreement: occurrence.agreement,
    anchorPresentedAt: instant(occurrence.anchorPresentedAt),
    createdAt: instant(occurrence.createdAt)!,
    updatedAt: instant(occurrence.updatedAt)!,
  }));
  const handItems: HandItemInsert[] = snapshot.hands.flatMap((hand) => {
    const seen = new Set<string>();
    const active = hand.occurrenceIds.flatMap((occurrenceId, index) => {
      if (seen.has(occurrenceId)) return [];
      seen.add(occurrenceId);
      return [
        {
          userId: ownerId,
          handId: hand.id,
          occurrenceId,
          state: "active" as const,
          position: index + 1,
        },
      ];
    });
    const deferred = hand.deferredOccurrenceIds
      .filter((occurrenceId) => !seen.has(occurrenceId))
      .map((occurrenceId) => ({
        userId: ownerId,
        handId: hand.id,
        occurrenceId,
        state: "deferred" as const,
        position: null,
      }));
    return [...active, ...deferred];
  });
  const sessions: SessionInsert[] = snapshot.sessions.map((session) => ({
    id: session.id,
    userId: ownerId,
    occurrenceId: session.occurrenceId,
    handId: session.handId,
    variant: session.variant,
    status: session.status,
    quick: session.quick === true,
    pendingId: session.pendingId ?? null,
    taskSnapshot: session.taskSnapshot,
    durationSec: session.durationSec,
    rewardTargetRc: session.rewardTargetRc,
    rewardCapRc: session.rewardCapRc,
    remainingSecAtStart: session.remainingSecAtStart,
    elapsedSec: session.elapsedSec,
    startedAt: session.status === "running" ? instant(session.startedAt) : null,
    createdAt: instant(session.createdAt)!,
    updatedAt: instant(session.updatedAt)!,
  }));
  const events: EventInsert[] = snapshot.events.map((event) => ({
    id: event.id,
    userId: ownerId,
    actionId: event.actionId,
    type: event.type,
    at: instant(event.at)!,
    taskId: event.taskId ?? null,
    occurrenceId: event.occurrenceId ?? null,
    sessionId: event.sessionId ?? null,
    handId: event.handId ?? null,
    context: event.context,
  }));
  const ledger: LedgerInsert[] = snapshot.ledger.map((entry) => ({
    id: entry.id,
    userId: ownerId,
    sourceKey: entry.sourceKey,
    occurrenceId: entry.occurrenceId ?? null,
    deltaRc: entry.deltaRc,
    reason: entry.reason,
    at: instant(entry.at)!,
  }));
  const settings: SettingsInsert = {
    userId: ownerId,
    audioEnabled: snapshot.settings.audioEnabled,
    sound: snapshot.settings.sound,
    maxTone: snapshot.settings.maxTone,
    theme: snapshot.settings.theme,
    showWallet: snapshot.settings.showWallet,
    updatedAt: instant(snapshot.settings.updatedAt)!,
  };
  const metadata: MetadataInsert[] = snapshot.metadata.map((item) => ({
    userId: ownerId,
    key: item.key,
    value: item.value,
    updatedAt: instant(snapshot.exportedAt)!,
  }));

  return {
    user: { id: ownerId, timeZone },
    tasks,
    pendings,
    days,
    hands,
    handItems,
    occurrences,
    sessions,
    events,
    ledger,
    settings,
    metadata,
  };
}
