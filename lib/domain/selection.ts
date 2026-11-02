import { occurrenceIdFor } from "./occurrence";
import { clockMinutes, localClockMinutes, toLocalDate, weekdayOf } from "./time";
import { TERMINAL_OCCURRENCE_STATUSES, type Occurrence, type Task } from "./types";

export type UnavailableReason =
  | "archived" | "unscheduled" | "wrong_day" | "closed"
  | "in_progress" | "outside_window" | "before_fixed_time";
export type Availability =
  | { eligible: false; reason: UnavailableReason }
  | { eligible: true; isDueAnchor: boolean };

export interface SelectionInput {
  tasks: readonly Task[];
  occurrences: readonly Occurrence[];
  now: number;
  seed: string;
  previousCategory?: string;
  excludeOccurrenceIds?: readonly string[];
}

export interface Candidate {
  task: Task;
  occurrenceId: string;
  isDueAnchor: boolean;
  /** A due task whose window already ended but is still unresolved today. */
  isMissed: boolean;
}

/** A frozen, already-started occurrence retains its agreement; archiving still hides it. */
function taskForOccurrence(task: Task, occurrence: Occurrence | undefined): Task {
  return occurrence?.agreement?.task ?? task;
}

/**
 * Missed is derived from the clock, never stored as an occurrence status. It
 * keeps the task available for an explicit late start, without pretending the
 * window is still open or marking it as not applicable for the user.
 */
export function isMissedOccurrence(
  task: Task, occurrence: Occurrence | undefined, now: number,
): boolean {
  const date = toLocalDate(now);
  const current = occurrence?.taskId === task.id && occurrence.date === date ? occurrence : undefined;
  if (task.archivedAt !== null) return false;
  if (current &&
    (TERMINAL_OCCURRENCE_STATUSES.has(current.status) || current.status === "in_progress")) {
    return false;
  }
  const effective = taskForOccurrence(task, current);
  if (!effective.days.includes(weekdayOf(date)) || !effective.window) return false;
  return localClockMinutes(now) >= clockMinutes(effective.window.end);
}

/** Windows are [start, end); fixed times cannot be consumed early. No hidden clock. */
export function availabilityOf(
  task: Task, occurrence: Occurrence | undefined, now: number,
): Availability {
  const date = toLocalDate(now);
  const current = occurrence?.taskId === task.id && occurrence.date === date ? occurrence : undefined;
  const effective = taskForOccurrence(task, current);
  if (task.archivedAt !== null) return { eligible: false, reason: "archived" };
  if (effective.days.length === 0) return { eligible: false, reason: "unscheduled" };
  if (!effective.days.includes(weekdayOf(date))) return { eligible: false, reason: "wrong_day" };
  if (current && TERMINAL_OCCURRENCE_STATUSES.has(current.status)) {
    return { eligible: false, reason: "closed" };
  }
  if (current?.status === "in_progress") return { eligible: false, reason: "in_progress" };

  const minute = localClockMinutes(now);
  if (effective.window &&
    (minute < clockMinutes(effective.window.start) || minute >= clockMinutes(effective.window.end))) {
    return { eligible: false, reason: "outside_window" };
  }
  if (effective.fixedTime && minute < clockMinutes(effective.fixedTime)) {
    return { eligible: false, reason: "before_fixed_time" };
  }
  return {
    eligible: true,
    isDueAnchor: effective.fixedTime !== undefined && current?.anchorPresentedAt == null,
  };
}

/** Stable FNV-1a hash, not Math.random() and not locale-dependent ordering. */
function score(seed: string, id: string): number {
  let hash = 2166136261;
  const value = JSON.stringify([seed, id]);
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function eligibleCandidates(input: SelectionInput): Candidate[] {
  const date = toLocalDate(input.now);
  const byTask = new Map(input.occurrences
    .filter((occurrence) => occurrence.date === date)
    .map((occurrence) => [occurrence.taskId, occurrence]));
  const excluded = new Set(input.excludeOccurrenceIds ?? []);
  const tasks = new Map(input.tasks.map((task) => [task.id, task]));
  const candidates: Candidate[] = [];

  for (const task of tasks.values()) {
    const occurrenceId = occurrenceIdFor(task.id, date);
    if (excluded.has(occurrenceId)) continue;
    const occurrence = byTask.get(task.id);
    const availability = availabilityOf(task, occurrence, input.now);
    const missed = isMissedOccurrence(task, occurrence, input.now);
    if (!availability.eligible && !missed) continue;
    candidates.push({
      task: taskForOccurrence(task, occurrence),
      occurrenceId,
      isDueAnchor: availability.eligible ? availability.isDueAnchor : false,
      isMissed: missed,
    });
  }
  return candidates.sort((a, b) => {
    const anchor = Number(b.isDueAnchor) - Number(a.isDueAnchor);
    if (anchor) return anchor;
    const priority = b.task.priority - a.task.priority;
    if (priority) return priority;
    // Same priority: an unresolved earlier window goes first, then the window
    // that is active now, and finally a task with no time context.
    const missed = Number(b.isMissed) - Number(a.isMissed);
    if (missed) return missed;
    if (a.isMissed && b.isMissed && a.task.window && b.task.window) {
      const ended = clockMinutes(a.task.window.end) - clockMinutes(b.task.window.end);
      if (ended) return ended;
    }
    const relevance = Number(b.task.window !== undefined) - Number(a.task.window !== undefined);
    if (relevance) return relevance;
    const diversity = Number(a.task.category === input.previousCategory) -
      Number(b.task.category === input.previousCategory);
    if (diversity) return diversity;
    const tie = score(input.seed, a.task.id) - score(input.seed, b.task.id);
    return tie || (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0);
  });
}

export function chooseNextTask(input: SelectionInput): Candidate | undefined {
  return eligibleCandidates(input)[0];
}

/** Three is a capacity, never a reason to duplicate or force an ineligible task. */
export function proposeHand(input: SelectionInput): Candidate[] {
  const hand: Candidate[] = [];
  const excluded = new Set(input.excludeOccurrenceIds ?? []);
  let previousCategory = input.previousCategory;
  while (hand.length < 3) {
    const next = chooseNextTask({
      ...input, previousCategory, excludeOccurrenceIds: [...excluded],
    });
    if (!next) break;
    hand.push(next);
    excluded.add(next.occurrenceId);
    previousCategory = next.task.category;
  }
  return hand;
}
