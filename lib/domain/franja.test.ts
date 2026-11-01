import { describe, expect, it } from "vitest";
import { currentFranja } from "./franja";
import { occurrenceIdFor } from "./occurrence";
import type { Occurrence, Task, TaskInput } from "./types";
import { validateTaskInput } from "./validation";
import { MONDAY, NOW, taskInput } from "@/tests/fixtures";

function task(id: string, patch: Partial<TaskInput> = {}): Task {
  return {
    ...validateTaskInput(taskInput(patch)),
    id, createdAt: NOW, updatedAt: NOW, archivedAt: null,
  };
}

function occurrence(t: Task, patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: occurrenceIdFor(t.id, MONDAY), taskId: t.id, date: MONDAY,
    status: "pending", timerElapsedSec: 0, creditedRc: 0,
    shortStepCompleted: false, agreement: null, anchorPresentedAt: null,
    createdAt: NOW, updatedAt: NOW, ...patch,
  };
}

describe("franja actual", () => {
  it("muestra hasta tres y cuenta las elegibles que quedan", () => {
    const tasks = [
      task("a", { priority: 3 }), task("b", { priority: 2 }),
      task("c", { priority: 2 }), task("d", { priority: 1 }),
    ];
    const view = currentFranja({ tasks, occurrences: [], now: NOW, seed: "s" });
    expect(view.candidates).toHaveLength(3);
    expect(view.remainingEligible).toBe(1);
  });

  it("no rellena cuando hay menos de tres elegibles", () => {
    const tasks = [task("a"), { ...task("draft"), days: [] }];
    const view = currentFranja({ tasks, occurrences: [], now: NOW, seed: "s" });
    expect(view.candidates.map((candidate) => candidate.task.id)).toEqual(["a"]);
    expect(view.remainingEligible).toBe(0);
  });

  it("cuenta pendientes del día sin incluir ocurrencias cerradas", () => {
    const done = task("done");
    const open = task("open");
    const occurrences = [
      occurrence(done, { status: "completed" }),
      occurrence(open, { status: "partial" }),
    ];
    const view = currentFranja({
      tasks: [done, open], occurrences, now: NOW, seed: "s",
    });
    expect(view.pendingToday).toBe(1);
  });
});
