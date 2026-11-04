import { describe, expect, it, vi } from "vitest";
import {
  availabilityOf,
  chooseNextTask,
  eligibleCandidates,
  isMissedOccurrence,
  proposeHand,
} from "./selection";
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

describe("elegibilidad antes de prioridad", () => {
  it("propone proyecto A el lunes y B el martes", () => {
    const tasks = [task("A", { days: [1] }), task("B", { days: [2] })];
    expect(proposeHand({ tasks, occurrences: [], now: NOW, seed: "s" }).map((c) => c.task.id)).toEqual(["A"]);
    expect(
      proposeHand({ tasks, occurrences: [], now: new Date(2026, 9, 27, 8).getTime(), seed: "s" }).map(
        (c) => c.task.id,
      ),
    ).toEqual(["B"]);
  });

  it("excluye archivadas y plantillas sin programación", () => {
    const archived = { ...task("old"), archivedAt: NOW };
    const draft: Task = { ...task("care", { priority: 3 }), days: [] };
    expect(proposeHand({ tasks: [archived, draft], occurrences: [], now: NOW, seed: "s" })).toEqual([]);
  });

  it("prefiere una tarea con horario activo sobre una sin hora de igual importancia", () => {
    const coffee = task("coffee", {
      priority: 3,
      window: { start: "06:00", end: "12:00" },
    });
    const vitamins = task("vitamins", { priority: 3 });
    expect(
      chooseNextTask({
        tasks: [vitamins, coffee],
        occurrences: [],
        now: at(9, 21),
        seed: "s",
      })!.task.id,
    ).toBe("coffee");
    expect(
      chooseNextTask({
        tasks: [vitamins, coffee],
        occurrences: [],
        now: at(12),
        seed: "s",
      }),
    ).toMatchObject({ task: { id: "coffee" }, isMissed: true });
  });

  it("trata la franja como inicio incluido y fin excluido", () => {
    const breakfast = task("breakfast", { window: { start: "06:00", end: "12:00" } });
    expect(availabilityOf(breakfast, undefined, at(5, 59)).eligible).toBe(false);
    expect(availabilityOf(breakfast, undefined, at(6)).eligible).toBe(true);
    expect(availabilityOf(breakfast, undefined, at(11, 59)).eligible).toBe(true);
    expect(availabilityOf(breakfast, undefined, at(12)).eligible).toBe(false);
  });

  it("nunca consume una hora fija antes de llegar, aun sin franja", () => {
    const gym = task("gym", { fixedTime: "18:00", priority: 3 });
    expect(availabilityOf(gym, undefined, at(17, 59))).toEqual({
      eligible: false,
      reason: "before_fixed_time",
    });
    expect(availabilityOf(gym, undefined, at(18))).toEqual({ eligible: true, isDueAnchor: true });
  });

  it("conserva el desayuno missed por delante de una tarea sin hora", () => {
    const tasks = [
      task("breakfast", { priority: 3, window: { start: "06:00", end: "12:00" } }),
      task("home", { priority: 1 }),
    ];
    expect(chooseNextTask({ tasks, occurrences: [], now: at(20), seed: "s" })).toMatchObject({
      task: { id: "breakfast" },
      isMissed: true,
    });
  });

  it.each(["completed", "already_done", "not_applicable", "in_progress"] as const)(
    "excluye ocurrencias %s",
    (status) => {
      const t = task("t");
      expect(
        proposeHand({ tasks: [t], occurrences: [occurrence(t, { status })], now: NOW, seed: "s" }),
      ).toEqual([]);
    },
  );

  it("conserva una tarea parcial elegible", () => {
    const t = task("t");
    expect(availabilityOf(t, occurrence(t, { status: "partial" }), NOW).eligible).toBe(true);
  });

  it("completar un día anterior no borra la ocurrencia de hoy", () => {
    const t = task("t");
    const yesterday = occurrence(t, { date: "2026-10-25", status: "completed" });
    expect(availabilityOf(t, yesterday, NOW).eligible).toBe(true);
  });

  it("no fuerza una ancla cuya franja ya venció", () => {
    const gym = task("gym", { fixedTime: "18:00", window: { start: "18:00", end: "18:30" } });
    expect(availabilityOf(gym, undefined, at(18, 30))).toEqual({ eligible: false, reason: "outside_window" });
  });

  it("respeta el snapshot de una ocurrencia empezada al editar la plantilla", () => {
    const original = task("t");
    const edited = task("t", { title: "Otra", durationMin: 30, window: { start: "18:00", end: "20:00" } });
    const partial = occurrence(original, {
      status: "partial",
      agreement: { task: original, rewardCapRc: 15, shortStepRc: 1, lockedAt: NOW },
    });
    const next = chooseNextTask({ tasks: [edited], occurrences: [partial], now: NOW, seed: "s" });
    expect(next!.task.title).toBe("Lavar ropa");
    expect(next!.task.durationMin).toBe(15);
  });
});

describe("tareas missed", () => {
  const coffee = task("coffee", {
    priority: 3,
    window: { start: "06:00", end: "12:00" },
  });

  it("marca missed justo al cerrar la ventana y no antes", () => {
    expect(isMissedOccurrence(coffee, undefined, at(11, 59))).toBe(false);
    expect(isMissedOccurrence(coffee, undefined, at(12))).toBe(true);
    expect(isMissedOccurrence(coffee, occurrence(coffee), at(13))).toBe(true);
  });

  it("no marca una ocurrencia terminal o en progreso", () => {
    expect(isMissedOccurrence(coffee, occurrence(coffee, { status: "completed" }), at(13))).toBe(false);
    expect(isMissedOccurrence(coffee, occurrence(coffee, { status: "not_applicable" }), at(13))).toBe(false);
    expect(isMissedOccurrence(coffee, occurrence(coffee, { status: "in_progress" }), at(13))).toBe(false);
  });

  it("respeta la prioridad antes de missed", () => {
    const urgent = task("urgent", { priority: 3 });
    const missedLow = task("low", {
      priority: 1,
      window: { start: "06:00", end: "12:00" },
    });
    expect(
      chooseNextTask({
        tasks: [urgent, missedLow],
        occurrences: [],
        now: at(13),
        seed: "s",
      })!.task.id,
    ).toBe("urgent");
  });

  it("con la misma prioridad, missed gana a una ventana activa y a una tarea sin hora", () => {
    const lunch = task("lunch", {
      priority: 2,
      window: { start: "12:00", end: "19:00" },
    });
    const missed = task("missed", {
      priority: 2,
      window: { start: "06:00", end: "12:00" },
    });
    const noTime = task("no-time", { priority: 2 });
    expect(
      eligibleCandidates({
        tasks: [noTime, lunch, missed],
        occurrences: [],
        now: at(13),
        seed: "s",
      }).map((candidate) => candidate.task.id),
    ).toEqual(["missed", "lunch", "no-time"]);
  });

  it("ordena las missed por la ventana que terminó primero", () => {
    const early = task("early", {
      priority: 2,
      window: { start: "06:00", end: "08:00" },
    });
    const late = task("late", {
      priority: 2,
      window: { start: "10:00", end: "12:00" },
    });
    expect(
      eligibleCandidates({
        tasks: [late, early],
        occurrences: [],
        now: at(13),
        seed: "s",
      }).map((candidate) => candidate.task.id),
    ).toEqual(["early", "late"]);
  });

  it("conserva el snapshot de una ocurrencia missed empezada", () => {
    const original = task("original", {
      priority: 3,
      durationMin: 15,
      window: { start: "06:00", end: "12:00" },
    });
    const edited = task("original", {
      priority: 3,
      durationMin: 15,
      title: "Editada",
      window: { start: "15:00", end: "16:00" },
    });
    const partial = occurrence(original, {
      status: "partial",
      agreement: { task: original, rewardCapRc: 15, shortStepRc: null, lockedAt: NOW },
    });
    expect(
      chooseNextTask({
        tasks: [edited],
        occurrences: [partial],
        now: at(13),
        seed: "s",
      }),
    ).toMatchObject({ task: { title: "Lavar ropa" }, isMissed: true });
  });
});

describe("priorización, variedad y bloques", () => {
  it("ancla vigente antes de prioridad, luego prioridad antes de variedad", () => {
    const tasks = [
      task("normal", { priority: 3, category: "casa" }),
      task("anchor", { priority: 1, fixedTime: "18:00" }),
      task("different", { priority: 1, category: "personal" }),
    ];
    const ranked = eligibleCandidates({
      tasks,
      occurrences: [],
      now: at(18),
      seed: "s",
      previousCategory: "casa",
    });
    expect(ranked.map((c) => c.task.id)).toEqual(["anchor", "normal", "different"]);
  });

  it("una ancla ya presentada sigue pendiente pero no vuelve a ser takeover", () => {
    const anchor = task("anchor", { priority: 1, fixedTime: "18:00" });
    const normal = task("normal", { priority: 3 });
    const ranked = eligibleCandidates({
      tasks: [anchor, normal],
      occurrences: [occurrence(anchor, { anchorPresentedAt: at(18) })],
      now: at(18, 1),
      seed: "s",
    });
    expect(ranked[0].task.id).toBe("normal");
    expect(ranked[1].isDueAnchor).toBe(false);
  });

  it("desempata con categoría diferente si la prioridad es igual", () => {
    const tasks = [task("a", { category: "casa" }), task("b", { category: "personal" })];
    expect(
      chooseNextTask({ tasks, occurrences: [], now: NOW, seed: "s", previousCategory: "casa" })!.task.id,
    ).toBe("b");
  });

  it("la misma semilla da lo mismo sin depender del orden de entrada", () => {
    const tasks = Array.from({ length: 10 }, (_, index) => task(`t${index}`));
    const input = { tasks, occurrences: [], now: NOW, seed: "2026-10-26:1" };
    expect(proposeHand(input)).toEqual(proposeHand({ ...input, tasks: [...tasks].reverse() }));
  });

  it("cambiar semilla permite variedad entre tareas equivalentes", () => {
    const tasks = Array.from({ length: 20 }, (_, index) => task(`t${index}`));
    const choices = new Set(
      Array.from(
        { length: 12 },
        (_, index) => chooseNextTask({ tasks, occurrences: [], now: NOW, seed: String(index) })!.task.id,
      ),
    );
    expect(choices.size).toBeGreaterThan(1);
  });

  it("no rellena una mano corta ni duplica una tarea repetida en la entrada", () => {
    const a = task("a");
    const b = task("b");
    expect(proposeHand({ tasks: [a, a, b], occurrences: [], now: NOW, seed: "s" })).toHaveLength(2);
    expect(proposeHand({ tasks: [], occurrences: [], now: NOW, seed: "s" })).toEqual([]);
  });

  it("propone tres como máximo y excluye lo aplazado sin mutar entradas", () => {
    const tasks = Array.from({ length: 6 }, (_, index) => task(`t${index}`));
    const before = structuredClone(tasks);
    const excluded = [occurrenceIdFor("t0", MONDAY)];
    const hand = proposeHand({ tasks, occurrences: [], now: NOW, seed: "s", excludeOccurrenceIds: excluded });
    expect(hand).toHaveLength(3);
    expect(new Set(hand.map((c) => c.task.id)).size).toBe(3);
    expect(hand.some((c) => c.task.id === "t0")).toBe(false);
    expect(tasks).toEqual(before);
    expect(excluded).toHaveLength(1);
  });

  it("no usa reloj ni azar ocultos", () => {
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Hidden clock");
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Hidden RNG");
    });
    expect(proposeHand({ tasks: [task("a")], occurrences: [], now: NOW, seed: "explicit" })).toHaveLength(1);
  });
});
