import type { RunoDatabase } from "./database";
import { appendEvent, eventIdFor, taskEventContext } from "./events";
import { occurrenceIdFor } from "@/lib/domain/occurrence";
import { availabilityOf, eligibleCandidates, proposeHand } from "@/lib/domain/selection";
import { assertTimestamp, parseLocalDate, toLocalDate, weekdayOf, type LocalDate } from "@/lib/domain/time";
import {
  assertId, defaultSettings, DomainError, validateSettings, validateTaskInput,
} from "@/lib/domain/validation";
import {
  TERMINAL_OCCURRENCE_STATUSES,
  type Day, type Hand, type Occurrence, type Session, type SessionVariant, type Settings,
  type Task, type TaskInput,
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

  return db.transaction("rw", db.tasks, db.occurrences, db.days, db.sessions, db.events, async () => {
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
    const day = await db.days.get(date);
    if (day?.closedAt != null) {
      throw new DomainError("invalid_transition", "El día ya está cerrado.");
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
    const active = await db.sessions
      .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
      .first();
    if (active) {
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
export async function completeSession(
  db: RunoDatabase, sessionId: string, now: number,
): Promise<Session> {
  assertId(sessionId);
  assertTimestamp(now);
  return db.transaction("rw", db.sessions, db.occurrences, db.events, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "La sesión ya no existe.");
    if (session.status === "completed") return session;
    if (session.status !== "running" && session.status !== "awaiting_confirmation") {
      throw new DomainError("invalid_transition", "Esta sesión no se puede completar.");
    }
    const occurrence = await db.occurrences.get(session.occurrenceId);
    if (!occurrence) throw new DomainError("not_found", "La tarea de la sesión ya no existe.");
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status) && occurrence.status !== "completed") {
      throw new DomainError("invalid_transition", "Esta tarea ya se cerró de otra forma.");
    }

    const elapsedSec = elapsedSecondsFor(session, now);
    const isShort = session.variant === "short";
    await appendEvent(db, {
      actionId: `complete:${sessionId}`, type: "completed", at: now,
      taskId: session.taskSnapshot.id, occurrenceId: session.occurrenceId,
      sessionId, ...(session.handId ? { handId: session.handId } : {}),
      context: { early: session.status === "running", elapsedSec, shortStep: isShort },
    });
    await db.occurrences.put({
      ...occurrence,
      status: isShort ? "partial" : "completed",
      shortStepCompleted: occurrence.shortStepCompleted || isShort,
      timerElapsedSec: elapsedSec,
      updatedAt: now,
    });
    const completed = closedSession(session, "completed", elapsedSec, now);
    await db.sessions.put(completed);
    return completed;
  });
}

/** Resolves the occurrence as not applicable and abandons its open session. */
export async function markOccurrenceNotApplicable(
  db: RunoDatabase, sessionId: string, now: number,
): Promise<Session> {
  assertId(sessionId);
  assertTimestamp(now);
  return db.transaction("rw", db.sessions, db.occurrences, db.events, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new DomainError("not_found", "La sesión ya no existe.");
    if (session.status === "abandoned") return session;
    if (
      session.status !== "running" &&
      session.status !== "awaiting_confirmation" &&
      session.status !== "paused"
    ) {
      throw new DomainError("invalid_transition", "Esta sesión ya no se puede cerrar así.");
    }
    const occurrence = await db.occurrences.get(session.occurrenceId);
    if (!occurrence) throw new DomainError("not_found", "La tarea de la sesión ya no existe.");
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) {
      throw new DomainError("invalid_transition", "Esta tarea ya se cerró.");
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
    if (!session) throw new DomainError("not_found", "La sesión ya no existe.");
    if (session.status === "running") {
      const previous = await db.events.get(eventIdFor(`retry:${actionId}`, "resumed"));
      if (previous) return session;
      throw new DomainError("invalid_transition", "El timer todavía está corriendo.");
    }
    if (session.status !== "awaiting_confirmation") {
      throw new DomainError("invalid_transition", "Esta sesión no se puede reintentar.");
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
    if (!session) throw new DomainError("not_found", "La sesión ya no existe.");
    if (session.status === "paused") return session;
    if (session.status !== "running") {
      throw new DomainError("invalid_transition", "Solo una sesión corriendo puede pausarse.");
    }

    const deadline = session.startedAt + session.remainingSecAtStart * 1000;
    if (now >= deadline) {
      throw new DomainError("invalid_transition", "El timer ya venció; confirma el resultado.");
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
    if (!session) throw new DomainError("not_found", "La sesión ya no existe.");
    if (session.status === "running") return session;
    if (session.status !== "paused") {
      throw new DomainError("invalid_transition", "Esta sesión no está pausada.");
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
  hand: Hand, tasks: readonly Task[], occurrences: readonly Occurrence[],
): FranjaTaskView[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const occurrenceById = new Map(occurrences.map((occurrence) => [occurrence.id, occurrence]));
  return hand.occurrenceIds.flatMap((occurrenceId) => {
    const occurrence = occurrenceById.get(occurrenceId);
    if (!occurrence || TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status)) return [];
    const task = occurrence.agreement?.task ?? taskById.get(occurrence.taskId);
    if (!task) return [];
    return [{
      occurrenceId,
      task,
      shortStepCompleted: occurrence.shortStepCompleted,
      remainingMin: Math.max(
        1,
        Math.ceil((task.durationMin * 60 - occurrence.timerElapsedSec) / 60),
      ),
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
 * Keeps one open franja per date. Its slots are not refilled until every card
 * is resolved; then the next franja is created from the remaining eligible tasks.
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

  return db.transaction("rw", db.days, db.hands, db.events, async () => {
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
      const views = taskViewsForHand(hand, tasks, occurrences);
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
      tasks: taskViewsForHand(created, tasks, occurrences),
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
    if (!day) throw new DomainError("not_found", "El día ya no existe.");
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
