import { availabilityOf } from "./selection";
import { clockMinutes, toLocalDate } from "./time";
import type { Occurrence, Task } from "./types";

export interface DueAnchor {
  task: Task;
  occurrence: Occurrence;
  /** Always present: candidates without a fixed time are excluded. */
  fixedTime: string;
}

/** The first due fixed-time task that has not been presented for this date. */
export function findDueAnchor(
  tasks: readonly Task[],
  occurrences: readonly Occurrence[],
  now: number,
): DueAnchor | null {
  const date = toLocalDate(now);
  const byTask = new Map(
    occurrences
      .filter((occurrence) => occurrence.date === date)
      .map((occurrence) => [occurrence.taskId, occurrence]),
  );
  const candidates: Array<DueAnchor & { minutes: number }> = [];
  for (const task of tasks) {
    const fixedTime = task.fixedTime;
    if (!fixedTime) continue;
    const occurrence = byTask.get(task.id);
    if (!occurrence) continue;
    const availability = availabilityOf(task, occurrence, now);
    if (!availability.eligible || !availability.isDueAnchor) continue;
    candidates.push({ task, occurrence, fixedTime, minutes: clockMinutes(fixedTime) });
  }
  candidates.sort(
    (a, b) => a.minutes - b.minutes || (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0),
  );
  const first = candidates[0];
  return first ? { task: first.task, occurrence: first.occurrence, fixedTime: first.fixedTime } : null;
}
