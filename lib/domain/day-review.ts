import { availabilityOf, currentRoutineStep, isMissedOccurrence, type RoutineProgress } from "./selection";
import { blockForTime, taskTime, timeMinutes, type TaskBlock } from "./schedule";
import { clockMinutes, toLocalDate, weekdayOf } from "./time";
import { TERMINAL_OCCURRENCE_STATUSES, type Occurrence, type Routine, type Task } from "./types";

export interface DayReviewItem {
  task: Task;
  occurrence: Occurrence;
  block: TaskBlock;
  /** Its window ended today and it is still unresolved. */
  missed: boolean;
  /** Whether the user can start it right now (missed tasks can start late). */
  canStart: boolean;
  routine?: RoutineProgress;
}

export interface DayReview {
  missed: DayReviewItem[];
  later: DayReviewItem[];
}

function missedEndMinutes(item: DayReviewItem): number {
  return item.task.window ? clockMinutes(item.task.window.end) : 24 * 60;
}

/**
 * A neutral snapshot for "Terminar por hoy". It only lists unresolved
 * occurrences for the local date; it never changes a status by itself.
 */
export function buildDayReview(input: {
  tasks: readonly Task[];
  occurrences: readonly Occurrence[];
  routines?: readonly Routine[];
  now: number;
}): DayReview {
  const { tasks, occurrences, routines = [], now } = input;
  const date = toLocalDate(now);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const groupedTaskIds = new Set<string>();
  const routineByTaskId = new Map<string, RoutineProgress>();
  for (const routine of routines) {
    if (routine.archivedAt !== null) continue;
    for (const taskId of routine.taskIds) groupedTaskIds.add(taskId);
    const step = currentRoutineStep(routine, tasks, occurrences, now);
    if (step) routineByTaskId.set(step.task.id, step.progress);
  }
  const missed: DayReviewItem[] = [];
  const later: DayReviewItem[] = [];

  for (const occurrence of occurrences) {
    if (occurrence.date !== date) continue;
    if (TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status) || occurrence.status === "in_progress") {
      continue;
    }
    const liveTask = taskById.get(occurrence.taskId);
    if (!liveTask || liveTask.archivedAt !== null) continue;
    if (!liveTask.days.includes(weekdayOf(date))) continue;
    if (groupedTaskIds.has(liveTask.id) && !routineByTaskId.has(liveTask.id)) continue;

    const task = occurrence.agreement?.task ?? liveTask;
    const isMissed = isMissedOccurrence(liveTask, occurrence, now);
    const routine = routineByTaskId.get(liveTask.id);
    const item: DayReviewItem = {
      task,
      occurrence,
      block: blockForTime(taskTime(task)),
      missed: isMissed,
      canStart: isMissed || availabilityOf(liveTask, occurrence, now).eligible,
      ...(routine ? { routine } : {}),
    };
    if (isMissed) missed.push(item);
    else later.push(item);
  }

  missed.sort(
    (a, b) =>
      missedEndMinutes(a) - missedEndMinutes(b) ||
      b.task.priority - a.task.priority ||
      (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0),
  );
  later.sort(
    (a, b) =>
      timeMinutes(taskTime(a.task)) - timeMinutes(taskTime(b.task)) ||
      b.task.priority - a.task.priority ||
      (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0),
  );

  return { missed, later };
}
