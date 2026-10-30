import type { RunoDatabase } from "./database";
import { appendEvent, taskEventContext } from "./events";
import { occurrenceIdFor } from "@/lib/domain/occurrence";
import { availabilityOf } from "@/lib/domain/selection";
import { assertTimestamp, parseLocalDate, toLocalDate, weekdayOf, type LocalDate } from "@/lib/domain/time";
import {
  assertId, defaultSettings, DomainError, validateSettings, validateTaskInput,
} from "@/lib/domain/validation";
import {
  TERMINAL_OCCURRENCE_STATUSES,
  type Day, type Occurrence, type Session, type SessionVariant, type Settings, type Task, type TaskInput,
} from "@/lib/domain/types";

export { occurrenceIdFor } from "@/lib/domain/occurrence";

export async function createTask(
  db: RunoDatabase, id: string, input: TaskInput, now: number,
): Promise<Task> {
  assertId(id);
  assertTimestamp(now);
  const values = validateTaskInput(input);
  return db.transaction("rw", db.tasks, db.events, async () => {
    const { inserted } = await appendEvent(db, {
      actionId: `task:create:${id}`, type: "task_created", at: now,
      taskId: id, context: taskEventContext(values),
    });
    if (!inserted) {
      const existing = await db.tasks.get(id);
      if (!existing) throw new DomainError("conflict", "La tarea registrada ya no existe.");
      return existing;
    }
    const task: Task = { ...values, id, createdAt: now, updatedAt: now, archivedAt: null };
    await db.tasks.add(task);
    return task;
  });
}

export async function updateTask(
  db: RunoDatabase, id: string, input: TaskInput, now: number, actionId: string,
): Promise<Task> {
  assertId(id);
  assertId(actionId);
  assertTimestamp(now);
  const values = validateTaskInput(input);
  return db.transaction("rw", db.tasks, db.events, async () => {
    const previous = await db.tasks.get(id);
    if (!previous) throw new DomainError("not_found", "La tarea ya no existe.");
    const { inserted } = await appendEvent(db, {
      actionId, type: "task_updated", at: now, taskId: id, context: taskEventContext(values),
    });
    if (!inserted) return previous;
    const task: Task = { ...previous, ...values, updatedAt: now };
    // Spreading a previous record must not retain a removed optional setting.
    delete task.window;
    delete task.fixedTime;
    delete task.shortStep;
    Object.assign(task, values);
    await db.tasks.put(task);
    return task;
  });
}

export async function archiveTask(db: RunoDatabase, id: string, now: number): Promise<void> {
  assertId(id);
  assertTimestamp(now);
  await db.transaction("rw", db.tasks, db.events, async () => {
    const task = await db.tasks.get(id);
    if (!task) throw new DomainError("not_found", "La tarea ya no existe.");
    if (task.archivedAt !== null) return;
    await appendEvent(db, {
      actionId: `task:archive:${id}`, type: "task_archived", at: now,
      taskId: id, context: {},
    });
    await db.tasks.update(id, { archivedAt: now, updatedAt: now });
  });
}

export async function listTasks(db: RunoDatabase, includeArchived = false): Promise<Task[]> {
  return db.tasks.filter((task) => includeArchived || task.archivedAt === null).sortBy("createdAt");
}

export async function getSettings(db: RunoDatabase, now: number): Promise<Settings> {
  assertTimestamp(now);
  return db.transaction("rw", db.settings, async () => {
    const existing = await db.settings.get("preferences");
    if (existing) return existing;
    const settings = defaultSettings(now);
    await db.settings.add(settings);
    return settings;
  });
}

export async function saveSettings(db: RunoDatabase, settings: Settings): Promise<void> {
  await db.settings.put(validateSettings(settings));
}

export async function ensureDay(db: RunoDatabase, date: LocalDate, now: number): Promise<Day> {
  parseLocalDate(date);
  assertTimestamp(now);
  return db.transaction("rw", db.days, async () => {
    const existing = await db.days.get(date);
    if (existing) return existing;
    const day: Day = { date, swapsUsed: 0, createdAt: now };
    await db.days.add(day);
    return day;
  });
}

function pendingOccurrence(taskId: string, date: LocalDate, now: number): Occurrence {
  return {
    id: occurrenceIdFor(taskId, date), taskId, date,
    status: "pending", timerElapsedSec: 0, creditedRc: 0,
    shortStepCompleted: false, agreement: null, anchorPresentedAt: null,
    createdAt: now, updatedAt: now,
  };
}

export async function ensureOccurrence(
  db: RunoDatabase, taskId: string, date: LocalDate, now: number,
): Promise<Occurrence> {
  const id = occurrenceIdFor(taskId, date);
  assertTimestamp(now);
  return db.transaction("rw", db.tasks, db.occurrences, async () => {
    const existing = await db.occurrences.get(id);
    if (existing) return existing;
    const task = await db.tasks.get(taskId);
    if (!task || task.archivedAt !== null || !task.days.includes(weekdayOf(date))) {
      throw new DomainError("invalid_transition", "Esta tarea no está programada para ese día.");
    }
    const occurrence = pendingOccurrence(taskId, date, now);
    await db.occurrences.add(occurrence);
    return occurrence;
  });
}

export interface StartSessionInput {
  sessionId: string;
  taskId: string;
  date: LocalDate;
  variant: SessionVariant;
  now: number;
  handId?: string;
}

/** Atomically locks the first agreement, claims the running slot and logs the start. */
export async function startSession(
  db: RunoDatabase, input: StartSessionInput,
): Promise<Session> {
  const { sessionId, taskId, date, variant, now, handId } = input;
  assertId(sessionId);
  occurrenceIdFor(taskId, date);
  assertTimestamp(now);
  if (variant !== "full" && variant !== "short") {
    throw new DomainError("validation", "La versión de la tarea no es válida.");
  }

  return db.transaction("rw", db.tasks, db.occurrences, db.sessions, db.events, async () => {
    const previous = await db.sessions.get(sessionId);
    if (previous) {
      if (
        previous.occurrenceId !== occurrenceIdFor(taskId, date) ||
        previous.variant !== variant || previous.handId !== (handId ?? null)
      ) {
        throw new DomainError("conflict", "Ese identificador pertenece a otra sesión.");
      }
      return previous;
    }
    const task = await db.tasks.get(taskId);
    if (!task || task.archivedAt !== null) {
      throw new DomainError("not_found", "La tarea no está disponible.");
    }

    const occurrence = await db.occurrences.get(occurrenceIdFor(taskId, date)) ??
      pendingOccurrence(taskId, date, now);
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
      throw new DomainError("invalid_transition", "Esta tarea ya se cerró para esa fecha.");
    }
    if (!occurrence.agreement &&
      (date !== toLocalDate(now) || !availabilityOf(task, occurrence, now).eligible)) {
      throw new DomainError("invalid_transition", "Esta tarea no está disponible en este horario.");
    }
    const unresolved = await db.sessions.where("occurrenceId").equals(occurrence.id)
      .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (unresolved || await db.sessions.where("runningSlot").equals("running").first()) {
      throw new DomainError("conflict", "Primero continúa o cierra la sesión que ya está abierta.");
    }

    const agreement = occurrence.agreement ?? {
      task: structuredClone(task),
      rewardCapRc: task.durationMin,
      shortStepRc: task.shortStep?.durationMin ?? null,
      lockedAt: now,
    };
    if (variant === "short" && (!agreement.task.shortStep || occurrence.shortStepCompleted)) {
      throw new DomainError("invalid_transition", "No hay un primer paso pendiente para esta tarea.");
    }
    const durationMin = variant === "short"
      ? agreement.task.shortStep!.durationMin : agreement.task.durationMin;
    const rewardTargetRc = variant === "short"
      ? agreement.shortStepRc! : agreement.rewardCapRc;
    const session: Session = {
      id: sessionId, occurrenceId: occurrence.id, handId: handId ?? null, variant,
      taskSnapshot: structuredClone(agreement.task),
      durationSec: durationMin * 60, rewardTargetRc, rewardCapRc: agreement.rewardCapRc,
      remainingSecAtStart: durationMin * 60, elapsedSec: 0,
      status: "running", startedAt: now, runningSlot: "running",
      createdAt: now, updatedAt: now,
    };
    await db.occurrences.put({ ...occurrence, agreement, status: "in_progress", updatedAt: now });
    await db.sessions.add(session);
    await appendEvent(db, {
      actionId: `start:${sessionId}`, type: "started", at: now,
      taskId, occurrenceId: occurrence.id, sessionId,
      ...(handId ? { handId } : {}), context: { variant },
    });
    return session;
  });
}

/**
 * Moves a running session to confirmation at or after its wall-clock deadline.
 * Idempotent: retries return the already-expired session without another event.
 */
export async function expireSession(
  db: RunoDatabase, sessionId: string, now: number,
): Promise<Session> {
  assertId(sessionId);
  assertTimestamp(now);
  return db.transaction("rw", db.sessions, db.events, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "La sesión ya no existe.");
    if (session.status === "awaiting_confirmation") return session;
    if (session.status !== "running") {
      throw new DomainError("invalid_transition", "Solo una sesión corriendo puede vencer.");
    }

    const deadline = session.startedAt + session.remainingSecAtStart * 1000;
    if (now < deadline) {
      throw new DomainError("invalid_transition", "El timer todavía no ha vencido.");
    }

    await appendEvent(db, {
      actionId: `timer-expired:${sessionId}`, type: "timer_expired", at: now,
      taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
      sessionId, ...(session.handId ? { handId: session.handId } : {}),
      context: { durationSec: session.durationSec },
    });

    const {
      runningSlot: _runningSlot,
      startedAt: _startedAt,
      ...rest
    } = session;
    void _runningSlot;
    void _startedAt;
    const elapsedSec = session.elapsedSec + session.remainingSecAtStart;
    const expired: Session = {
      ...rest,
      status: "awaiting_confirmation",
      startedAt: null,
      remainingSecAtStart: 0,
      elapsedSec,
      updatedAt: now,
    };
    await db.sessions.put(expired);
    return expired;
  });
}
