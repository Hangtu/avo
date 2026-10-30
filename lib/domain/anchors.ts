import { availabilityOf } from "./selection";
import { clockMinutes, toLocalDate } from "./time";
import type { Occurrence, Task } from "./types";

export interface DueAnchor {
  task: Task;
  occurrence: Occurrence;
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
  const candidates: DueAnchor[] = [];
  for (const task of tasks) {
    if (!task.fixedTime) continue;
    const occurrence = byTask.get(task.id);
    if (!occurrence) continue;
    const availability = availabilityOf(task, occurrence, now);
    if (!availability.eligible || !availability.isDueAnchor) continue;
    candidates.push({ task, occurrence });
  }
  candidates.sort((a, b) => {
    const time = clockMinutes(a.task.fixedTime!) - clockMinutes(b.task.fixedTime!);
    return time || (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0);
  });
  return candidates[0] ?? null;
}
