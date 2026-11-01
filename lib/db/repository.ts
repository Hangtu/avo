import type { RunoDatabase } from "./database";
import { appendEvent, eventIdFor, taskEventContext } from "./events";
import { appendLedgerEntry, creditSourceKey } from "./ledger";
import { occurrenceIdFor } from "@/lib/domain/occurrence";
import { availabilityOf, eligibleCandidates, proposeHand } from "@/lib/domain/selection";
import { assertTimestamp, parseLocalDate, toLocalDate, weekdayOf, type LocalDate } from "@/lib/domain/time";
import {
  assertId, defaultSettings, DomainError, validatePendingInput, validateSettings, validateTaskInput,
} from "@/lib/domain/validation";
import {
  TERMINAL_OCCURRENCE_STATUSES,
  type Day, type Hand, type Occurrence, type Pending, type PendingInput, type Session,
  type SessionVariant, type Settings, type Task, type TaskInput,
} from "@/lib/domain/types";

export { occurrenceIdFor } from "@/lib/domain/occurrence";

export interface CreateTaskBatchItem {
  id: string;
  input: TaskInput;
}

/**
 * Creates a set of independent task templates as one operation. All inputs are
 * validated before the transaction, so a failed write leaves no partial batch.
 * Callers should keep the same IDs when retrying the same form content.
 */
export async function createTasks(
  db: RunoDatabase, items: readonly CreateTaskBatchItem[], now: number,
): Promise<Task[]> {
  assertTimestamp(now);
  if (items.length === 0) return [];
  const seen = new Set<string>();
  const values = items.map((item) => {
    assertId(item.id);
    if (seen.has(item.id)) {
      throw new DomainError("validation", "El lote contiene una tarea repetida.");
    }
    seen.add(item.id);
    return { id: item.id, input: validateTaskInput(item.input) };
  });

  return db.transaction("rw", db.tasks, db.events, async () => {
    const created: Task[] = [];
    for (const item of values) {
      const { inserted } = await appendEvent(db, {
        actionId: `task:create:${item.id}`, type: "task_created", at: now,
        taskId: item.id, context: taskEventContext(item.input),
      });
      if (!inserted) {
        const existing = await db.tasks.get(item.id);
        if (!existing) throw new DomainError("conflict", "Esa tarea ya no está.");
        created.push(existing);
        continue;
      }
      const task: Task = {
        ...item.input, id: item.id, createdAt: now, updatedAt: now, archivedAt: null,
      };
      await db.tasks.add(task);
      created.push(task);
    }
    return created;
  });
}

export async function createTask(
  db: RunoDatabase, id: string, input: TaskInput, now: number,
): Promise<Task> {
  const [task] = await createTasks(db, [{ id, input }], now);
  return task;
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
    if (!previous) throw new DomainError("not_found", "Esa tarea ya no está.");
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
    if (!task) throw new DomainError("not_found", "Esa tarea ya no está.");
    if (task.archivedAt !== null) return;
    await appendEvent(db, {
      actionId: `task:archive:${id}`, type: "task_archived", at: now,
      taskId: id, context: {},
    });
    await db.tasks.update(id, { archivedAt: now, updatedAt: now });
  });
}

/** Restores an archived task for the short undo window in the UI. */
export async function restoreArchivedTask(
  db: RunoDatabase, id: string, now: number,
): Promise<Task> {
  assertId(id);
  assertTimestamp(now);
  return db.transaction("rw", db.tasks, db.events, async () => {
    const task = await db.tasks.get(id);
    if (!task) throw new DomainError("not_found", "Esa tarea ya no está.");
    if (task.archivedAt === null) return task;
    await appendEvent(db, {
      actionId: `task:restore:${id}:${task.archivedAt}`,
      type: "task_updated",
      at: now,
      taskId: id,
      context: { ...taskEventContext(task), restoredFromArchive: true },
    });
    const restored: Task = { ...task, archivedAt: null, updatedAt: now };
    await db.tasks.put(restored);
    return restored;
  });
}

export async function listTasks(db: RunoDatabase, includeArchived = false): Promise<Task[]> {
  return db.tasks.filter((task) => includeArchived || task.archivedAt === null).sortBy("createdAt");
}

/** Creates one one-off pending. The ID makes a retry safe without duplicating it. */
export async function createPending(
  db: RunoDatabase, id: string, input: PendingInput, now: number,
): Promise<Pending> {
  assertId(id);
  assertTimestamp(now);
  const values = validatePendingInput(input);
  return db.transaction("rw", db.pendings, async () => {
    const previous = await db.pendings.get(id);
    if (previous) {
      if (previous.title !== values.title || previous.durationMin !== values.durationMin) {
        throw new DomainError("conflict", "Ese identificador pertenece a otro pendiente.");
      }
      return previous;
    }
    const pending: Pending = {
      ...values, id, createdAt: now, updatedAt: now,
      completedAt: null, deletedAt: null,
    };
    await db.pendings.add(pending);
    return pending;
  });
}

/** Active pending items, newest first. Completed and removed items stay out of the list. */
export async function listPendings(
  db: RunoDatabase, includeHidden = false,
): Promise<Pending[]> {
  const items = await db.pendings
    .filter((pending) => includeHidden ||
      (pending.completedAt === null && pending.deletedAt === null))
    .sortBy("createdAt");
  return items.reverse();
}

/** Marks a pending as done without a timer, work time, occurrence or RC. */
export async function completePendingDirect(
  db: RunoDatabase, pendingId: string, now: number, source = "pending",
): Promise<Pending> {
  assertId(pendingId);
  assertTimestamp(now);
  return db.transaction("rw", db.pendings, db.sessions, db.events, async () => {
    const pending = await db.pendings.get(pendingId);
    if (!pending || pending.deletedAt !== null) {
      throw new DomainError("not_found", "Ese pendiente ya no está.");
    }
    if (pending.completedAt !== null) return pending;
    const active = await db.sessions
      .filter((session) => session.pendingId === pendingId &&
        ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (active) {
      throw new DomainError("conflict", "Primero termina el tiempo de este pendiente.");
    }
    await appendEvent(db, {
      actionId: `pending-done:${pendingId}`, type: "already_done", at: now,
      taskId: `pending:${pendingId}`, context: { source },
    });
    const updated: Pending = { ...pending, completedAt: now, updatedAt: now };
    await db.pendings.put(updated);
    return updated;
  });
}

/** Hides a pending that is no longer relevant; it never deletes a running session. */
/** Restores a pending hidden with deletePending; completed items stay completed. */
export async function restorePending(
  db: RunoDatabase, pendingId: string, now: number,
): Promise<Pending> {
  assertId(pendingId);
  assertTimestamp(now);
  return db.transaction("rw", db.pendings, async () => {
    const pending = await db.pendings.get(pendingId);
    if (!pending) throw new DomainError("not_found", "Ese pendiente ya no está.");
    if (pending.completedAt !== null) {
      throw new DomainError("invalid_transition", "Ese pendiente ya está hecho.");
    }
    if (pending.deletedAt === null) return pending;
    const restored: Pending = { ...pending, deletedAt: null, updatedAt: now };
    await db.pendings.put(restored);
    return restored;
  });
}

export async function deletePending(
  db: RunoDatabase, pendingId: string, now: number,
): Promise<void> {
  assertId(pendingId);
  assertTimestamp(now);
  await db.transaction("rw", db.pendings, db.sessions, async () => {
    const pending = await db.pendings.get(pendingId);
    if (!pending) throw new DomainError("not_found", "Ese pendiente ya no está.");
    if (pending.deletedAt !== null) return;
    const active = await db.sessions
      .filter((session) => session.pendingId === pendingId &&
        ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (active) {
      throw new DomainError("conflict", "Primero termina el tiempo de este pendiente.");
    }
    await db.pendings.update(pendingId, { deletedAt: now, updatedAt: now });
  });
}

export async function getSettings(db: RunoDatabase, now: number): Promise<Settings> {
  assertTimestamp(now);
  return db.transaction("rw", db.settings, async () => {
    const existing = await db.settings.get("preferences");
    if (existing) {
      return validateSettings({
        ...defaultSettings(existing.updatedAt),
        ...existing,
        showWallet: existing.showWallet ?? false,
      });
    }
    const settings = defaultSettings(now);
    await db.settings.add(settings);
    return settings;
  });
}

export async function saveSettings(db: RunoDatabase, settings: Settings): Promise<void> {
  await db.settings.put(validateSettings(settings));
}

/** Claims one due anchor for the date; repeated calls return null. */
export async function claimAnchor(
  db: RunoDatabase,
  input: { taskId: string; date: LocalDate; fixedTime: string; now: number },
): Promise<Occurrence | null> {
  const { taskId, date, fixedTime, now } = input;
  assertTimestamp(now);
  return db.transaction("rw", db.occurrences, db.events, async () => {
    const occurrence = await db.occurrences.get(occurrenceIdFor(taskId, date));
    if (!occurrence) return null;
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status) || occurrence.status === "in_progress") {
      return null;
    }
    if (occurrence.anchorPresentedAt !== null) return null;

    const updated: Occurrence = { ...occurrence, anchorPresentedAt: now, updatedAt: now };
    await db.occurrences.put(updated);
    await appendEvent(db, {
      actionId: `anchor-presented:${occurrence.id}`, type: "anchor_presented", at: now,
      taskId, occurrenceId: occurrence.id, context: { fixedTime },
    });
    return updated;
  });
}

/**
 * Records the first time a card becomes visible in a franja. The identity is
 * hand + occurrence, so re-renders and a second visit to the same card do not
 * create another exposure. A card in a later franja is a new exposure.
 */
export async function recordOffered(
  db: RunoDatabase,
  input: { handId: string; taskId: string; occurrenceId: string; now: number },
): Promise<void> {
  const { handId, taskId, occurrenceId, now } = input;
  assertId(handId);
  assertId(taskId);
  assertId(occurrenceId);
  assertTimestamp(now);
  await db.transaction("rw", db.hands, db.occurrences, db.events, async () => {
    const [hand, occurrence] = await Promise.all([
      db.hands.get(handId),
      db.occurrences.get(occurrenceId),
    ]);
    if (!hand || !hand.occurrenceIds.includes(occurrenceId)) {
      throw new DomainError("not_found", "La carta ya no pertenece a esta franja.");
    }
    if (!occurrence || occurrence.taskId !== taskId || occurrence.date !== hand.date) {
      throw new DomainError("not_found", "La carta ya no coincide con esta franja.");
    }
    await appendEvent(db, {
      actionId: `offer:${handId}:${occurrenceId}`, type: "offered", at: now,
      taskId, occurrenceId, handId, context: { source: "ahora" },
    });
  });
}

/** Resolves an occurrence without opening a session (anchor or franja correction). */
export async function markOccurrenceNotApplicableDirect(
  db: RunoDatabase, occurrenceId: string, now: number,
  source: "anchor" | "franja" = "anchor",
): Promise<Occurrence> {
  assertTimestamp(now);
  return db.transaction("rw", db.occurrences, db.events, async () => {
    const occurrence = await db.occurrences.get(occurrenceId);
    if (!occurrence) throw new DomainError("not_found", "La ocurrencia ya no existe.");
    if (occurrence.status === "not_applicable") return occurrence;
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
      throw new DomainError("invalid_transition", "Esa tarea ya está terminada.");
    }
    if (occurrence.status === "in_progress") {
      throw new DomainError("invalid_transition", "Esa tarea ya está empezada. Primero termina su tiempo.");
    }
    await appendEvent(db, {
      actionId: `direct-not-applicable:${occurrence.id}`, type: "not_applicable", at: now,
      taskId: occurrence.taskId, occurrenceId: occurrence.id, context: { source },
    });
    const updated: Occurrence = { ...occurrence, status: "not_applicable", updatedAt: now };
    await db.occurrences.put(updated);
    return updated;
  });
}

/** Marks an occurrence as already done without a session, work time, or retroactive RC. */
export async function markOccurrenceAlreadyDoneDirect(
  db: RunoDatabase, occurrenceId: string, now: number,
  source: "franja" = "franja",
): Promise<Occurrence> {
  assertTimestamp(now);
  return db.transaction("rw", db.occurrences, db.events, async () => {
    const occurrence = await db.occurrences.get(occurrenceId);
    if (!occurrence) throw new DomainError("not_found", "La ocurrencia ya no existe.");
    if (occurrence.status === "already_done") return occurrence;
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
      throw new DomainError("invalid_transition", "Esa tarea ya está terminada.");
    }
    if (occurrence.status === "in_progress") {
      throw new DomainError("invalid_transition", "Esa tarea ya está empezada. Primero termina su tiempo.");
    }
    await appendEvent(db, {
      actionId: `direct-already-done:${occurrence.id}`, type: "already_done", at: now,
      taskId: occurrence.taskId, occurrenceId: occurrence.id, context: { source },
    });
    const updated: Occurrence = { ...occurrence, status: "already_done", updatedAt: now };
    await db.occurrences.put(updated);
    return updated;
  });
}

/** Reopens a terminal occurrence after a mistaken completion; credit is kept, not duplicated. */
export async function reactivateOccurrence(
  db: RunoDatabase, occurrenceId: string, now: number,
): Promise<Occurrence> {
  assertId(occurrenceId);
  assertTimestamp(now);
  return db.transaction("rw", db.occurrences, db.events, async () => {
    const occurrence = await db.occurrences.get(occurrenceId);
    if (!occurrence) throw new DomainError("not_found", "Esa tarea ya no está.");
    if (occurrence.status === "pending") return occurrence;
    if (!TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
      throw new DomainError("invalid_transition", "Esa tarea todavía no está terminada.");
    }
    await appendEvent(db, {
      actionId: `occurrence:reactivate:${occurrence.id}:${occurrence.updatedAt}`,
      type: "task_updated", at: now, taskId: occurrence.taskId, occurrenceId: occurrence.id,
      context: {
        reactivated: true,
        previousStatus: occurrence.status,
        creditedRc: occurrence.creditedRc,
      },
    });
    const updated: Occurrence = {
      ...occurrence,
      status: "pending",
      timerElapsedSec: 0,
      shortStepCompleted: false,
      agreement: null,
      anchorPresentedAt: null,
      updatedAt: now,
    };
    await db.occurrences.put(updated);
    return updated;
  });
}

export async function ensureDay(db: RunoDatabase, date: LocalDate, now: number): Promise<Day> {
  parseLocalDate(date);
  assertTimestamp(now);
  return db.transaction("rw", db.days, async () => {
    const existing = await db.days.get(date);
    if (existing) return existing;
    const day: Day = { date, swapsUsed: 0, closedAt: null, createdAt: now };
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
      throw new DomainError("invalid_transition", "Esa tarea no es para ese día.");
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
  /** Allows a paused previous session to coexist with the urgent anchor. */
  anchor?: boolean;
}

/** Atomically locks the first agreement, claims the running slot and logs the start. */
export async function startSession(
  db: RunoDatabase, input: StartSessionInput,
): Promise<Session> {
  const { sessionId, taskId, date, variant, now, handId, anchor } = input;
  assertId(sessionId);
  occurrenceIdFor(taskId, date);
  assertTimestamp(now);
  if (variant !== "full" && variant !== "short") {
    throw new DomainError("validation", "La versión de la tarea no es válida.");
  }

  return db.transaction("rw", [
    db.tasks, db.occurrences, db.days, db.hands, db.sessions, db.events,
  ], async () => {
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
      throw new DomainError("not_found", "Esa tarea ya no está.");
    }
    const day = await db.days.get(date);
    if (day?.closedAt != null) {
      throw new DomainError("invalid_transition", "El día ya terminó.");
    }

    const occurrence = await db.occurrences.get(occurrenceIdFor(taskId, date)) ??
      pendingOccurrence(taskId, date, now);
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
      throw new DomainError("invalid_transition", "Esa tarea ya está resuelta para hoy.");
    }
    if (handId) {
      const hand = await db.hands.get(handId);
      if (
        !hand || hand.status !== "open" || hand.date !== date ||
        !hand.occurrenceIds.includes(occurrence.id)
      ) {
        throw new DomainError("invalid_transition", "Esa lista ya cambió. Vuelve a abrir Hoy.");
      }
    }
    if (anchor && (!task.fixedTime || occurrence.anchorPresentedAt === null)) {
      throw new DomainError("invalid_transition", "Ese aviso ya no está disponible.");
    }
    if (!occurrence.agreement &&
      (date !== toLocalDate(now) || !availabilityOf(task, occurrence, now).eligible)) {
      throw new DomainError("invalid_transition", "Esa tarea no es para este momento.");
    }
    const active = await db.sessions
      .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (active && !(anchor && active.status === "paused")) {
      throw new DomainError("conflict", "Primero termina lo que ya empezaste.");
    }

    const agreement = occurrence.agreement ?? {
      task: structuredClone(task),
      rewardCapRc: task.durationMin,
      shortStepRc: task.shortStep?.durationMin ?? null,
      lockedAt: now,
    };
    if (variant === "short" && (!agreement.task.shortStep || occurrence.shortStepCompleted)) {
      throw new DomainError("invalid_transition", "Esta tarea no tiene un primer paso pendiente.");
    }
    const durationMin = variant === "short"
      ? agreement.task.shortStep!.durationMin : agreement.task.durationMin;
    const rewardTargetRc = variant === "short"
      ? agreement.shortStepRc!
      : Math.max(0, agreement.rewardCapRc - occurrence.creditedRc);
    const durationSec = durationMin * 60;
    const elapsedBefore = Math.min(durationSec, Math.max(0, occurrence.timerElapsedSec));
    const remainingSec = variant === "short"
      ? durationSec
      : Math.max(60, durationSec - elapsedBefore);
    const session: Session = {
      id: sessionId, occurrenceId: occurrence.id, handId: handId ?? null, variant,
      taskSnapshot: structuredClone(agreement.task),
      durationSec, rewardTargetRc, rewardCapRc: agreement.rewardCapRc,
      remainingSecAtStart: remainingSec, elapsedSec: elapsedBefore,
      status: "running", startedAt: now, runningSlot: "running",
      createdAt: now, updatedAt: now,
    };
    await db.occurrences.put({ ...occurrence, agreement, status: "in_progress", updatedAt: now });
    await db.sessions.add(session);
    await appendEvent(db, {
      actionId: `start:${sessionId}`, type: "started", at: now,
      taskId, occurrenceId: occurrence.id, sessionId,
      ...(handId ? { handId } : {}),
      context: { variant, ...(anchor ? { anchor: true } : {}) },
    });
    return session;
  });
}

export interface StartQuickSessionInput {
  sessionId: string;
  taskId: string;
  title: string;
  durationMin: number;
  now: number;
}

/**
 * Starts a one-off focus session that never becomes a task or enters a franja.
 * It can run after the day is closed and intentionally earns no RC.
 */
export async function startQuickSession(
  db: RunoDatabase, input: StartQuickSessionInput,
): Promise<Session> {
  const { sessionId, taskId, title, durationMin, now } = input;
  assertId(sessionId);
  assertId(taskId);
  assertTimestamp(now);
  const values = validateTaskInput({
    title,
    days: [],
    durationMin,
    priority: 2,
    category: "rápida",
  }, { allowEmptyDays: true });
  const date = toLocalDate(now);
  const occurrenceId = occurrenceIdFor(taskId, date);

  return db.transaction("rw", db.occurrences, db.sessions, db.events, async () => {
    const previous = await db.sessions.get(sessionId);
    if (previous) {
      if (
        previous.occurrenceId !== occurrenceId || previous.quick !== true ||
        previous.taskSnapshot.title !== values.title ||
        previous.durationSec !== values.durationMin * 60
      ) {
        throw new DomainError("conflict", "Ese identificador pertenece a otra sesión rápida.");
      }
      return previous;
    }
    const active = await db.sessions
      .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (active) {
      throw new DomainError("conflict", "Primero termina lo que ya empezaste.");
    }
    if (await db.occurrences.get(occurrenceId)) {
      throw new DomainError("conflict", "Esta sesión rápida ya fue registrada.");
    }

    const task: Task = {
      ...values, id: taskId, createdAt: now, updatedAt: now, archivedAt: null,
    };
    const durationSec = values.durationMin * 60;
    const agreement = {
      task: structuredClone(task),
      rewardCapRc: 0,
      shortStepRc: null,
      lockedAt: now,
    };
    const occurrence: Occurrence = {
      id: occurrenceId,
      taskId,
      date,
      status: "in_progress",
      timerElapsedSec: 0,
      creditedRc: 0,
      shortStepCompleted: false,
      agreement,
      anchorPresentedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const session: Session = {
      id: sessionId,
      occurrenceId,
      handId: null,
      variant: "full",
      quick: true,
      taskSnapshot: structuredClone(task),
      durationSec,
      rewardTargetRc: 0,
      rewardCapRc: 0,
      remainingSecAtStart: durationSec,
      elapsedSec: 0,
      status: "running",
      startedAt: now,
      runningSlot: "running",
      createdAt: now,
      updatedAt: now,
    };
    await db.occurrences.add(occurrence);
    await db.sessions.add(session);
    await appendEvent(db, {
      actionId: `start:${sessionId}`, type: "started", at: now,
      taskId, occurrenceId, sessionId,
      context: { variant: "full", quick: true },
    });
    return session;
  });
}

export interface StartPendingSessionInput {
  sessionId: string;
  pendingId: string;
  now: number;
}

/**
 * Starts a timer for a saved pending. It uses a synthetic occurrence/session
 * so the pending never becomes a recurring Task or enters a franja; it earns 0 RC.
 */
export async function startPendingSession(
  db: RunoDatabase, input: StartPendingSessionInput,
): Promise<Session> {
  const { sessionId, pendingId, now } = input;
  assertId(sessionId);
  assertId(pendingId);
  assertTimestamp(now);

  return db.transaction("rw", db.pendings, db.occurrences, db.sessions, db.events, async () => {
    const previous = await db.sessions.get(sessionId);
    if (previous) {
      if (previous.pendingId !== pendingId || previous.quick !== true) {
        throw new DomainError("conflict", "Ese identificador pertenece a otra sesión.");
      }
      return previous;
    }
    const active = await db.sessions
      .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (active) {
      throw new DomainError("conflict", "Primero termina lo que ya empezaste.");
    }
    const pending = await db.pendings.get(pendingId);
    if (!pending || pending.deletedAt !== null) {
      throw new DomainError("not_found", "Ese pendiente ya no está.");
    }
    if (pending.completedAt !== null) {
      throw new DomainError("invalid_transition", "Ese pendiente ya está hecho.");
    }

    const values = validatePendingInput({
      title: pending.title, durationMin: pending.durationMin,
    });
    const date = toLocalDate(now);
    const taskId = `pending:${pendingId}:${sessionId}`;
    const occurrenceId = occurrenceIdFor(taskId, date);
    const task: Task = {
      ...values, id: taskId, days: [], priority: 2, category: "pendiente",
      createdAt: now, updatedAt: now, archivedAt: null,
    };
    const durationSec = values.durationMin * 60;
    const agreement = {
      task: structuredClone(task),
      rewardCapRc: 0,
      shortStepRc: null,
      lockedAt: now,
    };
    const occurrence: Occurrence = {
      id: occurrenceId,
      taskId,
      date,
      status: "in_progress",
      timerElapsedSec: 0,
      creditedRc: 0,
      shortStepCompleted: false,
      agreement,
      anchorPresentedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const session: Session = {
      id: sessionId,
      occurrenceId,
      handId: null,
      variant: "full",
      quick: true,
      pendingId,
      taskSnapshot: structuredClone(task),
      durationSec,
      rewardTargetRc: 0,
      rewardCapRc: 0,
      remainingSecAtStart: durationSec,
      elapsedSec: 0,
      status: "running",
      startedAt: now,
      runningSlot: "running",
      createdAt: now,
      updatedAt: now,
    };
    await db.occurrences.add(occurrence);
    await db.sessions.add(session);
    await appendEvent(db, {
      actionId: `start:${sessionId}`, type: "started", at: now,
      taskId, occurrenceId, sessionId,
      context: { variant: "full", quick: true, pending: true },
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
    if (!session) throw new DomainError("not_found", "Ese tiempo ya no existe.");
    if (session.status === "awaiting_confirmation") return session;
    if (session.status !== "running") {
      throw new DomainError("invalid_transition", "Ese tiempo ya no está corriendo.");
    }

    const deadline = session.startedAt + session.remainingSecAtStart * 1000;
    if (now < deadline) {
      throw new DomainError("invalid_transition", "Todavía queda tiempo.");
    }

    await appendEvent(db, {
      actionId: `timer-expired:${sessionId}:${session.startedAt}`, type: "timer_expired", at: now,
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


function elapsedSecondsFor(session: Session, now: number): number {
  if (session.status !== "running") return session.elapsedSec;
  const segmentSec = Math.min(
    session.remainingSecAtStart,
    Math.max(0, Math.floor((now - session.startedAt) / 1000)),
  );
  return session.elapsedSec + segmentSec;
}

function closedSession(
  session: Session, status: "completed" | "abandoned", elapsedSec: number, now: number,
): Session {
  const closed = {
    ...session,
    status,
    startedAt: null,
    remainingSecAtStart: 0,
    elapsedSec,
    updatedAt: now,
  } as Session;
  delete (closed as { runningSlot?: unknown }).runningSlot;
  return closed;
}

/** A confirmed completion closes both the session and its occurrence. No RC yet. */
export interface CompletionResult {
  session: Session;
  creditedRc: number;
  totalCreditedRc: number;
}

export async function completeSessionWithCredit(
  db: RunoDatabase, sessionId: string, now: number,
): Promise<CompletionResult> {
  assertId(sessionId);
  assertTimestamp(now);
  return db.transaction(
    "rw", db.sessions, db.occurrences, db.events, db.ledger, db.pendings,
    async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "Ese tiempo ya no existe.");
    if (session.status === "completed") {
      if (session.pendingId) {
        const pending = await db.pendings.get(session.pendingId);
        if (pending && pending.completedAt === null) {
          await db.pendings.update(session.pendingId, {
            completedAt: now, updatedAt: now,
          });
        }
      }
      const occurrence = await db.occurrences.get(session.occurrenceId);
      return { session, creditedRc: 0, totalCreditedRc: occurrence?.creditedRc ?? 0 };
    }
    if (session.status !== "running" && session.status !== "awaiting_confirmation") {
      throw new DomainError("invalid_transition", "Ese tiempo ya no se puede terminar.");
    }
    const occurrence = await db.occurrences.get(session.occurrenceId);
    if (!occurrence) throw new DomainError("not_found", "Esa tarea ya no está.");
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status) && occurrence.status !== "completed") {
      throw new DomainError("invalid_transition", "Esa tarea ya está resuelta de otra forma.");
    }
    if (session.pendingId) {
      const pending = await db.pendings.get(session.pendingId);
      if (!pending || pending.deletedAt !== null) {
        throw new DomainError("not_found", "Ese pendiente ya no está.");
      }
    }

    const elapsedSec = elapsedSecondsFor(session, now);
    const isShort = session.variant === "short";
    const creditedRc = Math.max(
      0,
      Math.min(session.rewardTargetRc, session.rewardCapRc - occurrence.creditedRc),
    );
    const totalCreditedRc = occurrence.creditedRc + creditedRc;

    await appendEvent(db, {
      actionId: `complete:${sessionId}`, type: "completed", at: now,
      taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
      sessionId, ...(session.handId ? { handId: session.handId } : {}),
      context: {
        early: session.status === "running",
        elapsedSec,
        shortStep: isShort,
        creditedRc,
        totalCreditedRc,
        ...(session.quick ? { quick: true } : {}),
        ...(session.pendingId ? { pending: true } : {}),
      },
    });
    if (creditedRc > 0) {
      await appendLedgerEntry(db, {
        sourceKey: creditSourceKey(session.occurrenceId, isShort ? "short" : "full"),
        occurrenceId: session.occurrenceId,
        deltaRc: creditedRc,
        reason: isShort ? "short_step" : "full_completion",
        at: now,
      });
    }
    await db.occurrences.put({
      ...occurrence,
      status: isShort ? "partial" : "completed",
      shortStepCompleted: occurrence.shortStepCompleted || isShort,
      timerElapsedSec: elapsedSec,
      creditedRc: totalCreditedRc,
      updatedAt: now,
    });
    const completed = closedSession(session, "completed", elapsedSec, now);
    await db.sessions.put(completed);
    if (session.pendingId) {
      await db.pendings.update(session.pendingId, { completedAt: now, updatedAt: now });
    }
    return { session: completed, creditedRc, totalCreditedRc };
  });
}

/** Backwards-compatible session-only result; UI actions use the credit result. */
export async function completeSession(
  db: RunoDatabase, sessionId: string, now: number,
): Promise<Session> {
  return (await completeSessionWithCredit(db, sessionId, now)).session;
}

/** Resolves the occurrence as not applicable and abandons its open session. */
export async function markOccurrenceNotApplicable(
  db: RunoDatabase, sessionId: string, now: number,
): Promise<Session> {
  assertId(sessionId);
  assertTimestamp(now);
  return db.transaction("rw", db.sessions, db.occurrences, db.events, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "Ese tiempo ya no existe.");
    if (session.status === "abandoned") return session;
    if (
      session.status !== "running" &&
      session.status !== "awaiting_confirmation" &&
      session.status !== "paused"
    ) {
      throw new DomainError("invalid_transition", "Ese tiempo ya no se puede cerrar así.");
    }
    const occurrence = await db.occurrences.get(session.occurrenceId);
    if (!occurrence) throw new DomainError("not_found", "Esa tarea ya no está.");
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
      throw new DomainError("invalid_transition", "Esa tarea ya está terminada.");
    }

    const elapsedSec = elapsedSecondsFor(session, now);
    await appendEvent(db, {
      actionId: `not-applicable:${sessionId}`, type: "not_applicable", at: now,
      taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
      sessionId, ...(session.handId ? { handId: session.handId } : {}),
      context: { elapsedSec },
    });
    await db.occurrences.put({
      ...occurrence,
      status: "not_applicable",
      timerElapsedSec: elapsedSec,
      updatedAt: now,
    });
    const closed = closedSession(session, "abandoned", elapsedSec, now);
    await db.sessions.put(closed);
    return closed;
  });
}

/**
 * Adds a short segment to an expired session. The reward agreement is untouched.
 * The caller supplies a stable actionId so a double tap cannot open two segments.
 */
export async function retrySession(
  db: RunoDatabase, sessionId: string, actionId: string, now: number, extensionMin = 5,
): Promise<Session> {
  assertId(sessionId);
  assertId(actionId);
  assertTimestamp(now);
  const extensionSec = extensionMin * 60;

  return db.transaction("rw", db.sessions, db.events, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "Ese tiempo ya no existe.");
    if (session.status === "running") {
      const previous = await db.events.get(eventIdFor(`retry:${actionId}`, "resumed"));
      if (previous) return session;
      throw new DomainError("invalid_transition", "Todavía queda tiempo.");
    }
    if (session.status !== "awaiting_confirmation") {
      throw new DomainError("invalid_transition", "Ese tiempo ya no se puede continuar.");
    }

    const { inserted } = await appendEvent(db, {
      actionId: `retry:${actionId}`, type: "resumed", at: now,
      taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
      sessionId, ...(session.handId ? { handId: session.handId } : {}),
      context: { extensionMin, remainingSec: extensionSec },
    });
    if (!inserted) return session;

    const resumed: Session = {
      ...session,
      status: "running",
      startedAt: now,
      runningSlot: "running",
      remainingSecAtStart: extensionSec,
      updatedAt: now,
    };
    await db.sessions.put(resumed);
    return resumed;
  });
}


/** Freezes the current segment. Paused time never counts toward the task. */
export async function pauseSession(
  db: RunoDatabase, sessionId: string, now: number, reason?: "baby" | "life_real",
): Promise<Session> {
  assertId(sessionId);
  assertTimestamp(now);
  return db.transaction("rw", db.sessions, db.events, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "Ese tiempo ya no existe.");
    if (session.status === "paused") return session;
    if (session.status !== "running") {
      throw new DomainError("invalid_transition", "Solo puedes pausar un tiempo que está corriendo.");
    }

    const deadline = session.startedAt + session.remainingSecAtStart * 1000;
    if (now >= deadline) {
      throw new DomainError("invalid_transition", "El tiempo ya terminó. Dinos cómo te fue.");
    }
    const remainingSec = Math.max(0, Math.ceil((deadline - now) / 1000));
    const segmentSec = session.remainingSecAtStart - remainingSec;

    await appendEvent(db, {
      actionId: `pause:${sessionId}:${session.startedAt}`, type: "paused", at: now,
      taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
      sessionId, ...(session.handId ? { handId: session.handId } : {}),
      context: { remainingSec, reason: reason ?? null },
    });
    if (reason) {
      await appendEvent(db, {
        actionId: `life-real:${sessionId}:${session.startedAt}`, type: "life_real", at: now,
        taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
        sessionId, ...(session.handId ? { handId: session.handId } : {}),
        context: { reason },
      });
    }

    const {
      runningSlot: _runningSlot,
      startedAt: _startedAt,
      ...rest
    } = session;
    void _runningSlot;
    void _startedAt;
    const paused: Session = {
      ...rest,
      status: "paused",
      startedAt: null,
      remainingSecAtStart: remainingSec,
      elapsedSec: session.elapsedSec + segmentSec,
      updatedAt: now,
    };
    await db.sessions.put(paused);
    return paused;
  });
}

/** Reopens the frozen segment exactly where it stopped. */
export async function resumeSession(
  db: RunoDatabase, sessionId: string, now: number,
): Promise<Session> {
  assertId(sessionId);
  assertTimestamp(now);
  return db.transaction("rw", db.sessions, db.events, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "Ese tiempo ya no existe.");
    if (session.status === "running") return session;
    if (session.status !== "paused") {
      throw new DomainError("invalid_transition", "Ese tiempo no está en pausa.");
    }

    await appendEvent(db, {
      actionId: `resume:${sessionId}:${session.updatedAt}`, type: "resumed", at: now,
      taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
      sessionId, ...(session.handId ? { handId: session.handId } : {}),
      context: { remainingSec: session.remainingSecAtStart },
    });

    const resumed: Session = {
      ...session,
      status: "running",
      startedAt: now,
      runningSlot: "running",
      updatedAt: now,
    };
    await db.sessions.put(resumed);
    return resumed;
  });
}


export interface FranjaTaskView {
  occurrenceId: string;
  task: Task;
  shortStepCompleted: boolean;
  remainingMin: number;
  creditedRc: number;
  remainingRc: number;
}

export interface CurrentFranja {
  hand: Hand | null;
  tasks: FranjaTaskView[];
  pendingToday: number;
  remainingEligible: number;
  swapsRemaining: number;
  canSwap: boolean;
}

function pendingCount(occurrences: readonly Occurrence[], date: LocalDate): number {
  return occurrences.filter(
    (occurrence) => occurrence.date === date && !TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status),
  ).length;
}

function taskViewsForHand(
  hand: Hand, tasks: readonly Task[], occurrences: readonly Occurrence[], now: number,
): FranjaTaskView[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const occurrenceById = new Map(occurrences.map((occurrence) => [occurrence.id, occurrence]));
  return hand.occurrenceIds.flatMap((occurrenceId) => {
    const occurrence = occurrenceById.get(occurrenceId);
    if (!occurrence || TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) return [];
    const liveTask = taskById.get(occurrence.taskId);
    if (!liveTask || liveTask.archivedAt !== null) return [];
    // A pending proposal follows the current template; a started agreement keeps
    // its frozen snapshot, but archiving still hides the task.
    if (!occurrence.agreement && !availabilityOf(liveTask, occurrence, now).eligible) return [];
    const task = occurrence.agreement?.task ?? liveTask;
    return [{
      occurrenceId,
      task,
      shortStepCompleted: occurrence.shortStepCompleted,
      remainingMin: Math.max(
        1,
        Math.ceil((task.durationMin * 60 - occurrence.timerElapsedSec) / 60),
      ),
      creditedRc: occurrence.creditedRc,
      remainingRc: Math.max(0, task.durationMin - occurrence.creditedRc),
    }];
  });
}

async function closeHand(
  db: RunoDatabase, hand: Hand, now: number, reason: "resolved" | "end_day",
): Promise<void> {
  if (hand.status === "closed") return;
  await db.hands.update(hand.id, { status: "closed", closedAt: now });
  await appendEvent(db, {
    actionId: `hand-closed:${hand.id}`, type: "hand_closed", at: now, handId: hand.id,
    context: { reason },
  });
}

/**
 * Keeps one open franja per date. While at least one card remains, the open
 * franja is re-evaluated against the current clock and keeps at least two
 * visible cards when other eligible tasks exist. Once every card is resolved,
 * the next franja is created from the remaining tasks.
 */
export async function ensureFranja(
  db: RunoDatabase,
  input: {
    date: LocalDate;
    now: number;
    seed: string;
    tasks: readonly Task[];
    occurrences: readonly Occurrence[];
  },
): Promise<CurrentFranja> {
  const { date, now, seed, tasks, occurrences } = input;
  parseLocalDate(date);
  assertTimestamp(now);

  return db.transaction("rw", db.days, db.hands, db.tasks, db.occurrences, db.events, async () => {
    const pendingToday = pendingCount(occurrences, date);
    const day = await db.days.get(date);
    const swapsRemaining = Math.max(0, 3 - (day?.swapsUsed ?? 0));
    if (day?.closedAt != null) {
      return {
        hand: null, tasks: [], pendingToday, remainingEligible: 0,
        swapsRemaining, canSwap: false,
      };
    }

    let hand = await db.hands
      .where("date").equals(date)
      .filter((candidate) => candidate.status === "open")
      .first();

    if (hand) {
      const currentOccurrences = (await db.occurrences.bulkGet(hand.occurrenceIds))
        .filter((occurrence): occurrence is Occurrence => occurrence !== undefined);
      const currentTaskIds = [...new Set(currentOccurrences.map((occurrence) => occurrence.taskId))];
      const currentTasks = (await db.tasks.bulkGet(currentTaskIds))
        .filter((task): task is Task => task !== undefined);
      let views = taskViewsForHand(hand, currentTasks, currentOccurrences, now);
      if (views.length === 0) {
        await closeHand(db, hand, now, "resolved");
        hand = undefined;
      } else {
        // Re-evaluate the open franja with the current clock. Started/partial
        // cards keep their place; the rest can be reordered or replaced by a
        // better current candidate. Deferred cards stay out until the next
        // franja, and this never consumes a manual "Otra" change.
        const occurrenceById = new Map(currentOccurrences.map((occurrence) => [occurrence.id, occurrence]));
        const taskById = new Map(currentTasks.map((task) => [task.id, task]));
        const protectedIds = hand.occurrenceIds.filter((occurrenceId) => {
          const occurrence = occurrenceById.get(occurrenceId);
          if (!occurrence || TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) return false;
          const task = taskById.get(occurrence.taskId);
          if (!task || task.archivedAt !== null) return false;
          return occurrence.shortStepCompleted || occurrence.agreement !== null || occurrence.timerElapsedSec > 0;
        });
        const ranked = proposeHand({
          tasks, occurrences, now, seed,
          excludeOccurrenceIds: hand.deferredOccurrenceIds,
        });
        const occurrenceIds: string[] = [];
        for (const occurrenceId of protectedIds) {
          if (!occurrenceIds.includes(occurrenceId)) occurrenceIds.push(occurrenceId);
        }
        for (const candidate of ranked) {
          if (occurrenceIds.length >= 3) break;
          if (!occurrenceIds.includes(candidate.occurrenceId)) {
            occurrenceIds.push(candidate.occurrenceId);
          }
        }
        const nextIds = occurrenceIds.slice(0, 3);
        const previousIds = hand.occurrenceIds;
        const unchanged = nextIds.length === previousIds.length &&
          nextIds.every((occurrenceId, index) => occurrenceId === previousIds[index]);
        if (!unchanged) {
          await db.hands.update(hand.id, { occurrenceIds: nextIds });
          hand = { ...hand, occurrenceIds: nextIds };
          views = taskViewsForHand(hand, tasks, occurrences, now);
        }
        if (views.length === 0) {
          await closeHand(db, hand, now, "resolved");
          hand = undefined;
        } else {
          const excluded = new Set(hand.occurrenceIds);
          const remainingEligible = eligibleCandidates({
            tasks, occurrences, now, seed,
            excludeOccurrenceIds: [...excluded],
          }).length;
          const canSwap = swapsRemaining > 0 && eligibleCandidates({
            tasks, occurrences, now, seed,
            excludeOccurrenceIds: [...excluded, ...hand.deferredOccurrenceIds],
          }).length > 0;
          return {
            hand, tasks: views, pendingToday, remainingEligible,
            swapsRemaining, canSwap,
          };
        }
      }
    }

    const candidates = proposeHand({ tasks, occurrences, now, seed });
    if (candidates.length === 0) {
      return {
        hand: null, tasks: [], pendingToday, remainingEligible: 0,
        swapsRemaining, canSwap: false,
      };
    }

    const hands = await db.hands.where("date").equals(date).toArray();
    const ordinal = hands.reduce((max, candidate) => Math.max(max, candidate.ordinal), 0) + 1;
    const created: Hand = {
      id: `hand:${date}:${ordinal}`,
      date,
      ordinal,
      occurrenceIds: candidates.map((candidate) => candidate.occurrenceId),
      deferredOccurrenceIds: [],
      status: "open",
      createdAt: now,
      closedAt: null,
    };
    await db.hands.add(created);

    const excluded = new Set(created.occurrenceIds);
    const remainingEligible = eligibleCandidates({
      tasks, occurrences, now, seed,
      excludeOccurrenceIds: [...excluded],
    }).length;
    return {
      hand: created,
      tasks: taskViewsForHand(created, tasks, occurrences, now),
      pendingToday,
      remainingEligible,
      swapsRemaining,
      canSwap: swapsRemaining > 0 && remainingEligible > 0,
    };
  });
}

/** Explicit end-of-day exit: preserves elapsed work, pays nothing pending, closes the day. */
export async function closeDay(
  db: RunoDatabase, date: LocalDate, now: number,
): Promise<Day> {
  parseLocalDate(date);
  assertTimestamp(now);
  await ensureDay(db, date, now);

  return db.transaction("rw", db.days, db.hands, db.sessions, db.occurrences, db.events, async () => {
    const day = await db.days.get(date);
    if (!day) throw new DomainError("not_found", "El día ya no está.");
    if (day.closedAt != null) return day;

    const context: Record<string, string | number> = { reason: "end_day" };
    const active = await db.sessions
      .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();

    if (active) {
      const elapsedSec = elapsedSecondsFor(active, now);
      const occurrence = await db.occurrences.get(active.occurrenceId);
      if (occurrence && !TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
        await db.occurrences.put({
          ...occurrence,
          status: elapsedSec > 0 ? "partial" : "pending",
          timerElapsedSec: elapsedSec,
          updatedAt: now,
        });
      }
      await db.sessions.put(closedSession(active, "abandoned", elapsedSec, now));
      context.sessionId = active.id;
      context.taskId = active.taskSnapshot.id;
      context.elapsedSec = elapsedSec;
    }

    const hand = await db.hands
      .where("date").equals(date)
      .filter((candidate) => candidate.status === "open")
      .first();
    if (hand) {
      await db.hands.update(hand.id, { status: "closed", closedAt: now });
      context.handId = hand.id;
    }

    await appendEvent(db, {
      actionId: `end-day:${date}`, type: "hand_closed", at: now,
      ...(hand ? { handId: hand.id } : {}),
      ...(active ? { sessionId: active.id, taskId: active.taskSnapshot.id } : {}),
      context,
    });

    const closed: Day = { ...day, closedAt: now };
    await db.days.put(closed);
    return closed;
  });
}


export type SwapReason =
  | "closed"
  | "no_swaps"
  | "no_alternative"
  | "not_in_hand"
  | "active_session";

export type SwapResult =
  | { swapped: true; hand: Hand; day: Day; replacementOccurrenceId: string }
  | { swapped: false; reason: SwapReason };

/**
 * Replaces one card in the open franja without refilling the slot. The swapped
 * occurrence stays pending and is deferred until a later franja. Three changes
 * are shared per local date and never spent without a real alternative.
 */
export async function swapFranjaTask(
  db: RunoDatabase,
  input: {
    handId: string;
    occurrenceId: string;
    now: number;
    seed: string;
    tasks: readonly Task[];
    occurrences: readonly Occurrence[];
  },
): Promise<SwapResult> {
  const { handId, occurrenceId, now, seed, tasks, occurrences } = input;
  assertId(handId);
  assertId(occurrenceId);
  assertTimestamp(now);

  return db.transaction("rw", db.days, db.hands, db.sessions, db.events, async () => {
    const hand = await db.hands.get(handId);
    if (!hand || hand.status !== "open") return { swapped: false, reason: "not_in_hand" };

    const day = await db.days.get(hand.date);
    if (!day || day.closedAt != null) return { swapped: false, reason: "closed" };

    const active = await db.sessions
      .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (active) return { swapped: false, reason: "active_session" };

    const index = hand.occurrenceIds.indexOf(occurrenceId);
    if (index < 0) return { swapped: false, reason: "not_in_hand" };
    const swapsUsed = day.swapsUsed ?? 0;
    if (swapsUsed >= 3) return { swapped: false, reason: "no_swaps" };

    const occurrenceById = new Map(occurrences.map((occurrence) => [occurrence.id, occurrence]));
    const original = occurrenceById.get(occurrenceId);
    if (!original) return { swapped: false, reason: "not_in_hand" };

    const excluded = new Set([
      ...hand.occurrenceIds,
      ...hand.deferredOccurrenceIds,
      occurrenceId,
    ]);
    const alternative = eligibleCandidates({
      tasks, occurrences, now, seed,
      excludeOccurrenceIds: [...excluded],
    }).find((candidate) => occurrenceById.has(candidate.occurrenceId));
    if (!alternative) return { swapped: false, reason: "no_alternative" };

    const nextSwaps = Math.min(3, swapsUsed + 1) as Day["swapsUsed"];
    const { inserted } = await appendEvent(db, {
      actionId: `swap:${hand.id}:${occurrenceId}`, type: "swapped", at: now,
      taskId: original.taskId, occurrenceId, handId: hand.id,
      context: {
        fromOccurrenceId: occurrenceId,
        toOccurrenceId: alternative.occurrenceId,
        swapsUsed: nextSwaps,
      },
    });
    if (!inserted) return { swapped: false, reason: "not_in_hand" };

    const occurrenceIds = [...hand.occurrenceIds];
    occurrenceIds[index] = alternative.occurrenceId;
    const deferredOccurrenceIds = hand.deferredOccurrenceIds.includes(occurrenceId)
      ? [...hand.deferredOccurrenceIds]
      : [...hand.deferredOccurrenceIds, occurrenceId];
    const updatedHand: Hand = { ...hand, occurrenceIds, deferredOccurrenceIds };
    const updatedDay: Day = { ...day, swapsUsed: nextSwaps };
    await db.hands.put(updatedHand);
    await db.days.put(updatedDay);
    return {
      swapped: true,
      hand: updatedHand,
      day: updatedDay,
      replacementOccurrenceId: alternative.occurrenceId,
    };
  });
}
