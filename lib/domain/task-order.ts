import type { Task } from "./types";
import { blockForTime, taskTime, timeMinutes, type TaskBlock } from "./schedule";

/** Visual order for the editor. It is intentionally not used by Today's priority engine. */
export type TaskOrder = Record<string, number>;

const BLOCKS: readonly TaskBlock[] = ["morning", "afternoon", "night", "any"];

function compareDefault(a: Task, b: Task): number {
  return timeMinutes(taskTime(a)) - timeMinutes(taskTime(b)) || a.title.localeCompare(b.title);
}

function orderOf(order: TaskOrder, task: Task): number | undefined {
  const value = order[task.id];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Sort a section by the saved visual order, then by the old time/title rule. */
export function sortTasksForDisplay(tasks: readonly Task[], order: TaskOrder): Task[] {
  return [...tasks].sort((a, b) => {
    const aOrder = orderOf(order, a);
    const bOrder = orderOf(order, b);
    if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined && bOrder === undefined) return -1;
    if (aOrder === undefined && bOrder !== undefined) return 1;
    return compareDefault(a, b);
  });
}

/**
 * Initializes missing tasks at the end of their section without moving anything
 * already ordered. First load preserves the previous time/title order.
 */
export function buildTaskOrder(tasks: readonly Task[], existing: TaskOrder = {}): TaskOrder {
  const next = { ...existing };
  const active = tasks.filter((task) => task.archivedAt === null);
  for (const block of BLOCKS) {
    const section = active.filter((task) => blockForTime(taskTime(task)) === block);
    const missing = section.filter((task) => orderOf(next, task) === undefined).sort(compareDefault);
    if (missing.length === 0) continue;
    const values = section
      .map((task) => orderOf(next, task))
      .filter((value): value is number => value !== undefined);
    let nextValue = values.length > 0 ? Math.max(...values) + 1 : 0;
    for (const task of missing) {
      next[task.id] = nextValue;
      nextValue += 1;
    }
  }
  return next;
}

/**
 * Moves one task inside its current section and renumbers that section. Tasks
 * hidden by the day filter keep their numeric order; they never move sections.
 */
export function reorderTaskOrder(
  tasks: readonly Task[],
  visibleIds: readonly string[],
  activeId: string,
  overId: string,
  order: TaskOrder,
): TaskOrder {
  if (activeId === overId) return order;
  const activeTask = tasks.find((task) => task.id === activeId);
  const overTask = tasks.find((task) => task.id === overId);
  if (!activeTask || !overTask) return order;
  const activeBlock = blockForTime(taskTime(activeTask));
  if (activeBlock !== blockForTime(taskTime(overTask))) return order;

  const visibleFrom = visibleIds.indexOf(activeId);
  const visibleTo = visibleIds.indexOf(overId);
  if (visibleFrom < 0 || visibleTo < 0) return order;

  const section = tasks
    .filter((task) => task.archivedAt === null && blockForTime(taskTime(task)) === activeBlock)
    .sort((a, b) => {
      const aOrder = orderOf(order, a);
      const bOrder = orderOf(order, b);
      if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder;
      if (aOrder !== undefined && bOrder === undefined) return -1;
      if (aOrder === undefined && bOrder !== undefined) return 1;
      return compareDefault(a, b);
    });
  const withoutActive = section.filter((task) => task.id !== activeId);
  const overIndex = withoutActive.findIndex((task) => task.id === overId);
  if (overIndex < 0) return order;

  const insertAt = visibleFrom < visibleTo ? overIndex + 1 : overIndex;
  withoutActive.splice(insertAt, 0, activeTask);

  const next = { ...order };
  withoutActive.forEach((task, index) => {
    next[task.id] = index;
  });
  return next;
}
