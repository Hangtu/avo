import { availabilityOf, currentRoutineStep, type RoutineProgress } from "./selection";
import { clockMinutes, toLocalDate } from "./time";
import type { Occurrence, Routine, Task } from "./types";

export interface DueAnchor {
  task: Task;
  occurrence: Occurrence;
  /** Always present: candidates without a fixed time are excluded. */
  fixedTime: string;
  routine?: RoutineProgress;
}

/** The first due fixed-time task that has not been presented for this date. */
export function findDueAnchor(
  tasks: readonly Task[],
  occurrences: readonly Occurrence[],
  now: number,
  routines: readonly Routine[] = [],
): DueAnchor | null {
  const date = toLocalDate(now);
  const byTask = new Map(
    occurrences
      .filter((occurrence) => occurrence.date === date)
      .map((occurrence) => [occurrence.taskId, occurrence]),
  );
  const groupedTaskIds = new Set<string>();
  const routineByTaskId = new Map<string, RoutineProgress>();
  for (const routine of routines) {
    if (routine.archivedAt !== null) continue;
    for (const taskId of routine.taskIds) groupedTaskIds.add(taskId);
    const step = currentRoutineStep(routine, tasks, occurrences, now);
    if (step) routineByTaskId.set(step.task.id, step.progress);
  }
  const candidates: Array<DueAnchor & { minutes: number }> = [];
  for (const task of tasks) {
    if (groupedTaskIds.has(task.id) && !routineByTaskId.has(task.id)) continue;
    const fixedTime = task.fixedTime;
    if (!fixedTime) continue;
    const occurrence = byTask.get(task.id);
    if (!occurrence) continue;
    const availability = availabilityOf(task, occurrence, now);
    if (!availability.eligible || !availability.isDueAnchor) continue;
    const routine = routineByTaskId.get(task.id);
    candidates.push({
      task,
      occurrence,
      fixedTime,
      minutes: clockMinutes(fixedTime),
      ...(routine ? { routine } : {}),
    });
  }
  candidates.sort(
    (a, b) => a.minutes - b.minutes || (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0),
  );
  const first = candidates[0];
  return first
    ? {
        task: first.task,
        occurrence: first.occurrence,
        fixedTime: first.fixedTime,
        ...(first.routine ? { routine: first.routine } : {}),
      }
    : null;
}
