import { describe, expect, it } from "vitest";
import { buildDayReview } from "./day-review";
import { occurrenceIdFor } from "./occurrence";
import type { Occurrence, Routine, Task, TaskInput } from "./types";
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

describe("revisión al terminar el día", () => {
  it("separa lo missed de lo que quedó para después y excluye lo resuelto", () => {
    const coffee = task("coffee", {
      title: "Café",
      priority: 3,
      window: { start: "06:00", end: "12:00" },
    });
    const lunch = task("lunch", {
      title: "Comida",
      priority: 2,
      window: { start: "12:00", end: "19:00" },
    });
    const dinner = task("dinner", {
      title: "Cena",
      priority: 2,
      window: { start: "19:00", end: "23:00" },
    });
    const noTime = task("no-time", { title: "Sin hora", priority: 1 });
    const done = task("done", { title: "Hecha", priority: 3 });
    const tasks = [coffee, lunch, dinner, noTime, done];
    const occurrences = [
      occurrence(coffee),
      occurrence(lunch),
      occurrence(dinner),
      occurrence(noTime),
      occurrence(done, { status: "completed" }),
    ];

    const review = buildDayReview({ tasks, occurrences, now: at(13) });

    expect(review.missed.map((item) => item.task.id)).toEqual(["coffee"]);
    expect(review.missed[0]).toMatchObject({ block: "morning", missed: true, canStart: true });
    expect(review.later.map((item) => item.task.id)).toEqual(["lunch", "dinner", "no-time"]);
    expect(review.later.find((item) => item.task.id === "lunch")).toMatchObject({
      block: "afternoon",
      missed: false,
      canStart: true,
    });
    expect(review.later.find((item) => item.task.id === "dinner")).toMatchObject({
      block: "night",
      missed: false,
      canStart: false,
    });
    expect(review.later.find((item) => item.task.id === "no-time")).toMatchObject({
      block: "any",
      missed: false,
      canStart: true,
    });
  });

  it("ordena las missed por el fin de su ventana", () => {
    const early = task("early", {
      title: "Temprano",
      priority: 2,
      window: { start: "06:00", end: "08:00" },
    });
    const late = task("late", {
      title: "Tarde",
      priority: 3,
      window: { start: "10:00", end: "12:00" },
    });
    const review = buildDayReview({
      tasks: [late, early],
      occurrences: [occurrence(late), occurrence(early)],
      now: at(13),
    });
    expect(review.missed.map((item) => item.task.id)).toEqual(["early", "late"]);
  });

  it("excluye archivadas, otras fechas y ocurrencias en progreso", () => {
    const archived = { ...task("archived", { window: { start: "06:00", end: "12:00" } }), archivedAt: NOW };
    const otherDay = task("other-day", { window: { start: "06:00", end: "12:00" } });
    const inProgress = task("in-progress", { window: { start: "06:00", end: "12:00" } });
    const review = buildDayReview({
      tasks: [archived, otherDay, inProgress],
      occurrences: [
        occurrence(archived),
        occurrence(otherDay, { date: "2026-10-25" }),
        occurrence(inProgress, { status: "in_progress" }),
      ],
      now: at(13),
    });
    expect(review).toEqual({ missed: [], later: [] });
  });

  it("solo revisa el paso actual de una rutina y avanza cuando se resuelve", () => {
    const prepare = task("prepare", { title: "Preparar", window: { start: "06:00", end: "12:00" } });
    const eat = task("eat", { title: "Comer", window: { start: "12:00", end: "18:00" } });
    const unrelated = task("unrelated", { title: "Otra cosa" });
    const routine: Routine = {
      id: "routine:meal",
      title: "Comida",
      taskIds: [prepare.id, eat.id],
      createdAt: NOW,
      updatedAt: NOW,
      archivedAt: null,
    };
    const first = buildDayReview({
      tasks: [prepare, eat, unrelated],
      routines: [routine],
      occurrences: [occurrence(prepare), occurrence(eat), occurrence(unrelated)],
      now: at(13),
    });
    expect(first.missed.map((item) => item.task.id)).toEqual([prepare.id]);
    expect(first.missed[0]?.routine).toMatchObject({ title: "Comida", step: 1, total: 2 });
    expect(first.later.map((item) => item.task.id)).toEqual([unrelated.id]);

    const next = buildDayReview({
      tasks: [prepare, eat, unrelated],
      routines: [routine],
      occurrences: [
        occurrence(prepare, { status: "not_applicable" }),
        occurrence(eat),
        occurrence(unrelated),
      ],
      now: at(13),
    });
    expect(next.later.map((item) => item.task.id)).toContain(eat.id);
    expect(next.later.find((item) => item.task.id === eat.id)?.routine).toMatchObject({
      title: "Comida",
      step: 2,
      total: 2,
    });
  });

  it("mantiene una missed parcial con su progreso para poder continuarla", () => {
    const coffee = task("coffee", {
      title: "Café",
      priority: 3,
      window: { start: "06:00", end: "12:00" },
    });
    const partial = occurrence(coffee, {
      status: "partial",
      timerElapsedSec: 120,
      agreement: { task: coffee, rewardCapRc: 5, shortStepRc: null, lockedAt: NOW },
    });
    const review = buildDayReview({
      tasks: [coffee],
      occurrences: [partial],
      now: at(13),
    });
    expect(review.missed).toHaveLength(1);
    expect(review.missed[0]).toMatchObject({ missed: true, canStart: true });
  });
});
