import { describe, expect, it } from "vitest";
import { findDueAnchor } from "./anchors";
import { occurrenceIdFor } from "./occurrence";
import type { Occurrence, Task, TaskInput } from "./types";
import { validateTaskInput } from "./validation";
import { MONDAY, NOW, taskInput } from "@/tests/fixtures";

function task(id: string, patch: Partial<TaskInput> = {}): Task {
  return {
    ...validateTaskInput(taskInput(patch)),
    id,
    createdAt: NOW,
    updatedAt: NOW,
    archivedAt: null,
  };
}
function occurrence(t: Task, patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id: occurrenceIdFor(t.id, MONDAY),
    taskId: t.id,
    date: MONDAY,
    status: "pending",
    timerElapsedSec: 0,
    creditedRc: 0,
    shortStepCompleted: false,
    agreement: null,
    anchorPresentedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}
function at(hour: number, minute = 0) {
  return new Date(2026, 9, 26, hour, minute).getTime();
}

describe("ancla ligera", () => {
  it("solo aparece desde su hora y dentro de la franja", () => {
    const gym = task("gym", { fixedTime: "18:00", window: { start: "18:00", end: "18:30" } });
    const occ = occurrence(gym);
    expect(findDueAnchor([gym], [occ], at(17, 59))).toBeNull();
    expect(findDueAnchor([gym], [occ], at(18))?.task.id).toBe("gym");
    expect(findDueAnchor([gym], [occ], at(18, 29))?.task.id).toBe("gym");
    expect(findDueAnchor([gym], [occ], at(18, 30))).toBeNull();
  });

  it("no repite una ocurrencia ya presentada ni una cerrada", () => {
    const gym = task("gym", { fixedTime: "18:00", window: { start: "18:00", end: "18:30" } });
    expect(findDueAnchor([gym], [occurrence(gym, { anchorPresentedAt: NOW })], at(18))).toBeNull();
    expect(findDueAnchor([gym], [occurrence(gym, { status: "completed" })], at(18))).toBeNull();
  });

  it("ordena varias anclas por hora fija", () => {
    const first = task("first", { fixedTime: "17:00" });
    const second = task("second", { fixedTime: "18:00" });
    expect(findDueAnchor([second, first], [occurrence(first), occurrence(second)], at(18))?.task.id).toBe(
      "first",
    );
  });
});
