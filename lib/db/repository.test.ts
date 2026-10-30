import { describe, expect, it, vi } from "vitest";
import { RunoDatabase, openDatabase } from "./database";
import { eventIdFor } from "./events";
import {
  archiveTask, claimAnchor, closeDay, completeSession, completeSessionWithCredit, createTask, ensureDay, ensureFranja,
  ensureOccurrence, expireSession, getSettings, listTasks, markOccurrenceNotApplicable,
  markOccurrenceNotApplicableDirect, occurrenceIdFor, pauseSession, resumeSession,
  retrySession, saveSettings, startSession,
  swapFranjaTask, updateTask,
} from "./repository";
import { MONDAY, NOW, taskInput } from "@/tests/fixtures";
import type { RunoEvent } from "@/lib/domain/types";
import { setupTestDatabase } from "@/tests/database";

const testDb = setupTestDatabase();
const TUESDAY = "2026-10-27" as const;

describe("schema versionado y almacenamiento local", () => {
  it("no abre una conexión al construir la clase", () => {
    const db = new RunoDatabase(`runo-test-${crypto.randomUUID()}`);
    expect(db.isOpen()).toBe(false);
    db.close();
  });

  it("crea las ocho entidades y un marcador interno de migración", async () => {
    const db = await testDb();
    expect(db.verno).toBe(2);
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      "days", "events", "hands", "ledger", "metadata", "occurrences", "sessions", "settings", "tasks",
    ]);
  });

  it("conserva tareas, ocurrencias, sesión y preferencias al cerrar/reabrir", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await ensureOccurrence(db, "ropa", MONDAY, NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await saveSettings(db, { ...await getSettings(db, NOW), theme: "dark", audioEnabled: true });
    db.close();

    const reopened = await testDb(db.name);
    expect(await reopened.tasks.count()).toBe(1);
    expect(await reopened.occurrences.count()).toBe(1);
    expect(await reopened.sessions.get("s1")).toMatchObject({ status: "running", startedAt: NOW });
    expect(await getSettings(reopened, NOW + 1000)).toMatchObject({ theme: "dark", audioEnabled: true });
    expect(await reopened.events.count()).toBe(2);
  });

  it("falla explícitamente si el entorno no ofrece IndexedDB", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(openDatabase("no-storage")).rejects.toThrow("IndexedDB");
  });

  it("inicializa preferencias una vez y no pisa un mute guardado", async () => {
    const db = await testDb();
    await Promise.all([getSettings(db, NOW), getSettings(db, NOW)]);
    expect(await db.settings.count()).toBe(1);
    await saveSettings(db, { ...await getSettings(db, NOW), maxTone: 0 });
    expect((await getSettings(db, NOW + 1000)).maxTone).toBe(0);
  });

  it("archiva sin borrar datos ni historial", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await ensureOccurrence(db, "ropa", MONDAY, NOW);
    await archiveTask(db, "ropa", NOW + 10);
    await archiveTask(db, "ropa", NOW + 20);
    expect(await listTasks(db)).toEqual([]);
    expect(await listTasks(db, true)).toHaveLength(1);
    expect((await db.tasks.get("ropa"))!.archivedAt).toBe(NOW + 10);
    expect(await db.occurrences.count()).toBe(1);
  });

  it("elimina opciones al editar sin conservar campos anteriores por accidente", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput({ fixedTime: "18:00", window: { start: "18:00", end: "18:30" } }), NOW);
    await updateTask(db, "ropa", taskInput({ shortStep: undefined }), NOW + 1, "remove-options");
    const stored = await db.tasks.get("ropa");
    expect(stored!.fixedTime).toBeUndefined();
    expect(stored!.window).toBeUndefined();
    expect(stored!.shortStep).toBeUndefined();
    expect(stored!.createdAt).toBe(NOW);
  });

  it("crea un día una vez sin reiniciar los cambios ya usados", async () => {
    const db = await testDb();
    await ensureDay(db, MONDAY, NOW);
    await db.days.update(MONDAY, { swapsUsed: 2 });
    expect((await ensureDay(db, MONDAY, NOW + 1)).swapsUsed).toBe(2);
    expect((await ensureDay(db, "2026-10-27", NOW + 1)).swapsUsed).toBe(0);
  });
});

describe("ocurrencias y acuerdos", () => {
  it("hace idempotentes dos creaciones concurrentes de tarea/fecha", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const [a, b] = await Promise.all([
      ensureOccurrence(db, "ropa", MONDAY, NOW),
      ensureOccurrence(db, "ropa", MONDAY, NOW + 1),
    ]);
    expect(a.id).toBe(b.id);
    expect(await db.occurrences.count()).toBe(1);
    expect(a.agreement).toBeNull();
  });

  it("rechaza duplicados por tarea/fecha incluso con otro ID", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const occurrence = await ensureOccurrence(db, "ropa", MONDAY, NOW);
    await expect(db.occurrences.add({ ...occurrence, id: "duplicado" })).rejects.toMatchObject({ name: "ConstraintError" });
  });

  it("no programa una plantilla sin días ni en un día incorrecto", async () => {
    const db = await testDb();
    await createTask(db, "cuidado", taskInput({ days: [] }), NOW);
    await createTask(db, "ropa", taskInput(), NOW);
    await expect(ensureOccurrence(db, "cuidado", MONDAY, NOW)).rejects.toThrow();
    await expect(ensureOccurrence(db, "ropa", "2026-10-27", NOW)).rejects.toThrow();
    expect(await db.occurrences.count()).toBe(0);
  });

  it("usa claves estables y no ambiguas con IDs especiales", () => {
    expect(occurrenceIdFor("a@b", MONDAY)).not.toBe(occurrenceIdFor("a%40b", MONDAY));
    expect(occurrenceIdFor("a@b", MONDAY)).toBe("a%40b@2026-10-26");
  });

  it("congela el tope completo desde el escalón y no al editar la plantilla", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const session = await startSession(db, { sessionId: "corto", taskId: "ropa", date: MONDAY, variant: "short", now: NOW });
    expect(session).toMatchObject({ rewardTargetRc: 1, rewardCapRc: 15, durationSec: 60 });
    await updateTask(db, "ropa", taskInput({ title: "Nombre nuevo", durationMin: 30 }), NOW + 1, "edit-snapshot");
    const occurrence = await db.occurrences.get(session.occurrenceId);
    expect(occurrence!.agreement).toMatchObject({ rewardCapRc: 15, task: { title: "Lavar ropa", durationMin: 15 } });
    expect((await db.sessions.get("corto"))!.taskSnapshot.title).toBe("Lavar ropa");
    expect((await db.tasks.get("ropa"))!.durationMin).toBe(30);
    expect(await db.ledger.count()).toBe(0);
  });

  it("repetir el inicio devuelve la misma sesión, sin nuevo evento", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const input = { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full" as const, now: NOW };
    const [a, b] = await Promise.all([startSession(db, input), startSession(db, { ...input, now: NOW + 1000 })]);
    expect(a).toEqual(b);
    expect(await db.sessions.count()).toBe(1);
    expect(await db.events.count()).toBe(2);
  });

  it("vence una sesión corriendo, libera el slot y no repite el evento", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const deadline = NOW + 15 * 60 * 1000;

    const expired = await expireSession(db, "s1", deadline);
    expect(expired).toMatchObject({
      status: "awaiting_confirmation", startedAt: null,
      remainingSecAtStart: 0, elapsedSec: 15 * 60,
    });
    expect(await db.sessions.where("runningSlot").equals("running").count()).toBe(0);
    expect(await db.events.where("type").equals("timer_expired").count()).toBe(1);

    const retried = await expireSession(db, "s1", deadline + 1000);
    expect(retried).toEqual(expired);
    expect(await db.events.where("type").equals("timer_expired").count()).toBe(1);
  });

  it("no vence antes del deadline ni toca una sesión pausada", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await expect(expireSession(db, "s1", NOW + 1000)).rejects.toThrow("todavía no");
    const running = await db.sessions.get("s1");
    const { runningSlot: _runningSlot, startedAt: _startedAt, ...rest } = running!;
    void _runningSlot;
    void _startedAt;
    await db.sessions.put({ ...rest, status: "paused", startedAt: null });
    await expect(expireSession(db, "s1", NOW + 15 * 60 * 1000)).rejects.toThrow("corriendo");
    expect(await db.events.where("type").equals("timer_expired").count()).toBe(0);
  });

  it("no permite reutilizar un ID de sesión para otra variante", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await expect(startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "short", now: NOW })).rejects.toThrow();
  });

  it.each([
    new Date(2026, 9, 26, 17, 59).getTime(),
    new Date(2026, 9, 26, 18, 30).getTime(),
    new Date(2026, 9, 27, 18, 0).getTime(),
  ])("no inicia tareas nuevas antes de hora, fuera de franja o para otra fecha: %s", async (now) => {
    const db = await testDb();
    await createTask(db, "gym", taskInput({
      fixedTime: "18:00", window: { start: "18:00", end: "18:30" },
    }), NOW);
    await expect(startSession(db, {
      sessionId: "s1", taskId: "gym", date: MONDAY, variant: "full", now,
    })).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
    expect(await db.occurrences.count()).toBe(0);
    expect(await db.events.where("type").equals("started").count()).toBe(0);
  });

  it.each(["completed", "already_done", "not_applicable"] as const)(
    "no reabre una ocurrencia %s", async (status) => {
      const db = await testDb();
      await createTask(db, "ropa", taskInput(), NOW);
      const occurrence = await ensureOccurrence(db, "ropa", MONDAY, NOW);
      await db.occurrences.update(occurrence.id, { status });
      await expect(startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW })).rejects.toThrow();
      expect(await db.sessions.count()).toBe(0);
    },
  );
});

describe("resultados y correcciones", () => {
  it("completa antes de tiempo sin cerrar por el timer y sin duplicar el evento", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const started = await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const completed = await completeSession(db, "s1", NOW + 10_000);

    expect(completed).toMatchObject({ status: "completed", startedAt: null, elapsedSec: 10 });
    expect((await db.occurrences.get(started.occurrenceId))!.status).toBe("completed");
    expect(await db.sessions.where("runningSlot").equals("running").count()).toBe(0);
    expect(await db.events.where("type").equals("completed").count()).toBe(1);
    expect(await db.ledger.count()).toBe(1);
    expect((await db.ledger.toArray())[0]).toMatchObject({ deltaRc: 15, reason: "full_completion" });

    expect(await completeSession(db, "s1", NOW + 20_000)).toEqual(completed);
    expect(await db.events.where("type").equals("completed").count()).toBe(1);
  });

  it("completa una sesión ya vencida y conserva el tiempo completo", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const started = await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await expireSession(db, "s1", NOW + 15 * 60 * 1000);
    const completed = await completeSession(db, "s1", NOW + 15 * 60 * 1000 + 1000);

    expect(completed).toMatchObject({ status: "completed", elapsedSec: 15 * 60 });
    expect((await db.occurrences.get(started.occurrenceId))!.timerElapsedSec).toBe(15 * 60);
    expect(await db.events.where("type").equals("timer_expired").count()).toBe(1);
    expect(await db.events.where("type").equals("completed").count()).toBe(1);
  });

  it("marca no aplica, cierra la sesión como abandonada y es idempotente", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const started = await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const closed = await markOccurrenceNotApplicable(db, "s1", NOW + 10_000);

    expect(closed).toMatchObject({ status: "abandoned", elapsedSec: 10 });
    expect((await db.occurrences.get(started.occurrenceId))!.status).toBe("not_applicable");
    expect(await db.events.where("type").equals("not_applicable").count()).toBe(1);
    expect(await markOccurrenceNotApplicable(db, "s1", NOW + 20_000)).toEqual(closed);
    expect(await db.events.where("type").equals("not_applicable").count()).toBe(1);
  });

  it("reintenta cinco minutos sin cambiar el acuerdo ni duplicar con el mismo actionId", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const started = await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const deadline = NOW + 15 * 60 * 1000;
    await expireSession(db, "s1", deadline);

    const retried = await retrySession(db, "s1", "retry-1", deadline + 1000);
    expect(retried).toMatchObject({
      status: "running", remainingSecAtStart: 300, rewardTargetRc: started.rewardTargetRc,
      elapsedSec: 15 * 60,
    });
    expect(await retrySession(db, "s1", "retry-1", deadline + 2000)).toEqual(retried);
    expect(await db.events.where("type").equals("resumed").count()).toBe(1);

    await expect(retrySession(db, "s1", "retry-2", deadline + 3000)).rejects.toThrow("corriendo");
  });

  it("permite un segundo vencimiento tras reintentar y registra eventos separados", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const firstDeadline = NOW + 15 * 60 * 1000;
    await expireSession(db, "s1", firstDeadline);
    const retryAt = firstDeadline + 1000;
    await retrySession(db, "s1", "retry-1", retryAt);

    const second = await expireSession(db, "s1", retryAt + 5 * 60 * 1000);
    expect(second).toMatchObject({ status: "awaiting_confirmation", elapsedSec: 15 * 60 + 5 * 60 });
    expect(await db.events.where("type").equals("timer_expired").count()).toBe(2);
  });
});

describe("pausa y reanudación", () => {
  it("congela el restante y no cuenta el tiempo pausado", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const started = await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const paused = await pauseSession(db, "s1", NOW + 10_000);

    expect(paused).toMatchObject({
      status: "paused", startedAt: null, remainingSecAtStart: 15 * 60 - 10, elapsedSec: 10,
    });
    expect(await db.sessions.where("runningSlot").equals("running").count()).toBe(0);
    expect(await db.events.where("type").equals("paused").count()).toBe(1);

    const resumed = await resumeSession(db, "s1", NOW + 70_000);
    expect(resumed).toMatchObject({
      status: "running", startedAt: NOW + 70_000, remainingSecAtStart: 15 * 60 - 10,
      elapsedSec: 10,
    });
    expect(await db.events.where("type").equals("resumed").count()).toBe(1);
    expect(await resumeSession(db, "s1", NOW + 71_000)).toEqual(resumed);

    const completed = await completeSession(db, "s1", NOW + 80_000);
    expect(completed).toMatchObject({ status: "completed", elapsedSec: 20 });
    expect((await db.occurrences.get(started.occurrenceId))!.timerElapsedSec).toBe(20);
  });

  it("registra vida real solo cuando hay motivo explícito", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await pauseSession(db, "s1", NOW + 10_000, "baby");
    expect(await db.events.where("type").equals("paused").count()).toBe(1);
    expect(await db.events.where("type").equals("life_real").count()).toBe(1);

    await resumeSession(db, "s1", NOW + 20_000);
    await pauseSession(db, "s1", NOW + 30_000);
    expect(await db.events.where("type").equals("paused").count()).toBe(2);
    expect(await db.events.where("type").equals("life_real").count()).toBe(1);
  });

  it("una pausa bloquea iniciar otra tarea hasta resolverla", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await createTask(db, "cafe", taskInput({ title: "Café" }), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await pauseSession(db, "s1", NOW + 10_000);

    await expect(startSession(db, {
      sessionId: "s2", taskId: "cafe", date: MONDAY, variant: "full", now: NOW + 20_000,
    })).rejects.toThrow("continúa o cierra");

    await resumeSession(db, "s1", NOW + 20_000);
    await completeSession(db, "s1", NOW + 25_000);
    await expect(startSession(db, {
      sessionId: "s2", taskId: "cafe", date: MONDAY, variant: "full", now: NOW + 30_000,
    })).resolves.toMatchObject({ status: "running", handId: null });
  });

  it("mantiene la pausa al cerrar y reabrir la DB", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await pauseSession(db, "s1", NOW + 10_000);
    db.close();

    const reopened = await testDb(db.name);
    expect(await reopened.sessions.get("s1")).toMatchObject({
      status: "paused", remainingSecAtStart: 15 * 60 - 10, elapsedSec: 10,
    });
    await expect(resumeSession(reopened, "s1", NOW + 60_000)).resolves.toMatchObject({
      status: "running", startedAt: NOW + 60_000,
    });
  });

  it("no pausa un timer ya vencido", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await expect(pauseSession(db, "s1", NOW + 15 * 60 * 1000)).rejects.toThrow("venció");
    expect(await db.events.where("type").equals("paused").count()).toBe(0);
  });
});

describe("franjas y cierre del día", () => {
  async function readyTasks() {
    const db = await testDb();
    await createTask(db, "a", taskInput({ title: "A", priority: 3 }), NOW);
    await createTask(db, "b", taskInput({ title: "B", priority: 2 }), NOW);
    await createTask(db, "c", taskInput({ title: "C", priority: 2 }), NOW);
    await createTask(db, "d", taskInput({ title: "D", priority: 1 }), NOW);
    for (const id of ["a", "b", "c", "d"]) await ensureOccurrence(db, id, MONDAY, NOW);
    await ensureDay(db, MONDAY, NOW);
    const tasks = await listTasks(db);
    const occurrences = await db.occurrences.where("date").equals(MONDAY).toArray();
    return { db, tasks, occurrences };
  }

  it("crea una franja de hasta tres y no rellena al resolver una carta", async () => {
    const { db, tasks, occurrences } = await readyTasks();
    const first = await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences });
    expect(first.hand).toMatchObject({ ordinal: 1, status: "open" });
    expect(first.tasks).toHaveLength(3);
    expect(first.remainingEligible).toBe(1);
    expect(first.pendingToday).toBe(4);

    await db.occurrences.update(first.hand!.occurrenceIds[0], { status: "completed" });
    const afterOne = await ensureFranja(db, {
      date: MONDAY, now: NOW + 1000, seed: "s", tasks,
      occurrences: await db.occurrences.where("date").equals(MONDAY).toArray(),
    });
    expect(afterOne.hand!.id).toBe(first.hand!.id);
    expect(afterOne.tasks).toHaveLength(2);
    expect(afterOne.remainingEligible).toBe(1);
  });

  it("cierra la franja al resolver todas y abre la siguiente con ordinal nuevo", async () => {
    const { db, tasks, occurrences } = await readyTasks();
    const first = await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences });
    for (const occurrenceId of first.hand!.occurrenceIds) {
      await db.occurrences.update(occurrenceId, { status: "not_applicable" });
    }
    const next = await ensureFranja(db, {
      date: MONDAY, now: NOW + 1000, seed: "s", tasks,
      occurrences: await db.occurrences.where("date").equals(MONDAY).toArray(),
    });
    expect(next.hand).toMatchObject({ ordinal: 2, status: "open" });
    expect(next.tasks).toHaveLength(1);
    expect(await db.events.where("type").equals("hand_closed").count()).toBe(1);
    expect((await db.hands.get(first.hand!.id))!.status).toBe("closed");
  });

  it("terminar por hoy cierra la franja y el día sin pagar pendientes", async () => {
    const { db, tasks, occurrences } = await readyTasks();
    const first = await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences });
    const closed = await closeDay(db, MONDAY, NOW + 1000);
    expect(closed.closedAt).toBe(NOW + 1000);
    expect((await db.hands.get(first.hand!.id))!.status).toBe("closed");
    expect(await db.ledger.count()).toBe(0);
    expect(await closeDay(db, MONDAY, NOW + 2000)).toEqual(closed);
    expect(await db.events.where("type").equals("hand_closed").count()).toBe(1);

    const after = await ensureFranja(db, {
      date: MONDAY, now: NOW + 3000, seed: "s", tasks,
      occurrences: await db.occurrences.where("date").equals(MONDAY).toArray(),
    });
    expect(after.hand).toBeNull();
    await expect(startSession(db, {
      sessionId: "blocked", taskId: "a", date: MONDAY, variant: "full", now: NOW + 3000,
    })).rejects.toThrow("cerrado");
  });

  it("terminar por hoy con sesión pausada conserva el tiempo congelado", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await ensureDay(db, MONDAY, NOW);
    await ensureOccurrence(db, "ropa", MONDAY, NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await pauseSession(db, "s1", NOW + 10_000);
    await closeDay(db, MONDAY, NOW + 20_000);

    expect(await db.sessions.get("s1")).toMatchObject({ status: "abandoned", elapsedSec: 10 });
    expect((await db.occurrences.get(occurrenceIdFor("ropa", MONDAY)))!.status).toBe("partial");
    expect((await db.occurrences.get(occurrenceIdFor("ropa", MONDAY)))!.timerElapsedSec).toBe(10);
    expect(await db.ledger.count()).toBe(0);
  });

  it("terminar por hoy con sesión abierta conserva el tiempo y abandona la sesión", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await ensureDay(db, MONDAY, NOW);
    await ensureOccurrence(db, "ropa", MONDAY, NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const closed = await closeDay(db, MONDAY, NOW + 10_000);

    expect(closed.closedAt).toBe(NOW + 10_000);
    expect(await db.sessions.get("s1")).toMatchObject({ status: "abandoned", elapsedSec: 10 });
    expect((await db.occurrences.get(occurrenceIdFor("ropa", MONDAY)))!.status).toBe("partial");
    expect((await db.occurrences.get(occurrenceIdFor("ropa", MONDAY)))!.timerElapsedSec).toBe(10);
    expect(await db.ledger.count()).toBe(0);
    expect(await db.events.where("type").equals("hand_closed").count()).toBe(1);
  });
});

describe("bloqueo de tarea y franja", () => {
  it("no inicia otra tarea mientras la sesión espera confirmación", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await createTask(db, "cafe", taskInput({ title: "Café" }), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const deadline = NOW + 15 * 60 * 1000;
    await expireSession(db, "s1", deadline);

    await expect(startSession(db, {
      sessionId: "s2", taskId: "cafe", date: MONDAY, variant: "full", now: deadline + 1000,
    })).rejects.toThrow("continúa o cierra");
    expect(await db.sessions.count()).toBe(1);

    await completeSession(db, "s1", deadline + 2000);
    await expect(startSession(db, {
      sessionId: "s2", taskId: "cafe", date: MONDAY, variant: "full", now: deadline + 3000,
    })).resolves.toMatchObject({ status: "running" });
  });

  it("permite iniciar otra tarea después de no aplica", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await createTask(db, "cafe", taskInput({ title: "Café" }), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await markOccurrenceNotApplicable(db, "s1", NOW + 1000);

    await expect(startSession(db, {
      sessionId: "s2", taskId: "cafe", date: MONDAY, variant: "full", now: NOW + 2000,
    })).resolves.toMatchObject({ status: "running" });
  });
});

describe("cambios de franja", () => {
  async function fourTasks() {
    const db = await testDb();
    for (const [id, priority] of [["a", 3], ["b", 2], ["c", 2], ["d", 1]] as const) {
      await createTask(db, id, taskInput({ title: id.toUpperCase(), priority }), NOW);
      await ensureOccurrence(db, id, MONDAY, NOW);
    }
    await ensureDay(db, MONDAY, NOW);
    return {
      db,
      tasks: await listTasks(db),
      occurrences: await db.occurrences.where("date").equals(MONDAY).toArray(),
    };
  }

  it("cambia una carta, comparte el contador y difiere la original", async () => {
    const { db, tasks, occurrences } = await fourTasks();
    const first = await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences });
    expect(first).toMatchObject({ swapsRemaining: 3, canSwap: true });
    const original = first.hand!.occurrenceIds[0];

    const result = await swapFranjaTask(db, {
      handId: first.hand!.id, occurrenceId: original, now: NOW + 1000,
      seed: "s", tasks, occurrences,
    });
    expect(result.swapped).toBe(true);
    if (!result.swapped) return;
    expect(result.day.swapsUsed).toBe(1);
    expect(result.hand.deferredOccurrenceIds).toContain(original);
    expect(result.hand.occurrenceIds).not.toContain(original);
    expect(result.hand.occurrenceIds).toHaveLength(3);
    expect(await db.events.where("type").equals("swapped").count()).toBe(1);
    expect(await db.ledger.count()).toBe(0);

    const after = await ensureFranja(db, {
      date: MONDAY, now: NOW + 2000, seed: "s", tasks,
      occurrences: await db.occurrences.where("date").equals(MONDAY).toArray(),
    });
    expect(after).toMatchObject({ swapsRemaining: 2, canSwap: false });
    expect(after.tasks).toHaveLength(3);
  });

  it("no gasta un cambio si no hay alternativa", async () => {
    const db = await testDb();
    await createTask(db, "solo", taskInput(), NOW);
    await ensureOccurrence(db, "solo", MONDAY, NOW);
    await ensureDay(db, MONDAY, NOW);
    const tasks = await listTasks(db);
    const occurrences = await db.occurrences.where("date").equals(MONDAY).toArray();
    const hand = await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences });

    const result = await swapFranjaTask(db, {
      handId: hand.hand!.id, occurrenceId: hand.hand!.occurrenceIds[0],
      now: NOW + 1000, seed: "s", tasks, occurrences,
    });
    expect(result).toEqual({ swapped: false, reason: "no_alternative" });
    expect((await db.days.get(MONDAY))!.swapsUsed).toBe(0);
    expect(await db.events.where("type").equals("swapped").count()).toBe(0);
  });

  it("limita a tres cambios por fecha aunque queden alternativas", async () => {
    const db = await testDb();
    for (let index = 0; index < 7; index += 1) {
      const id = `t${index}`;
      await createTask(db, id, taskInput({ title: id, priority: 2 }), NOW);
      await ensureOccurrence(db, id, MONDAY, NOW);
    }
    await ensureDay(db, MONDAY, NOW);
    const tasks = await listTasks(db);
    const occurrences = await db.occurrences.where("date").equals(MONDAY).toArray();
    const hand = (await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences })).hand!;
    let occurrenceIds = hand.occurrenceIds;

    for (let index = 0; index < 3; index += 1) {
      const result = await swapFranjaTask(db, {
        handId: hand.id, occurrenceId: occurrenceIds[0],
        now: NOW + index * 1000, seed: "s", tasks, occurrences,
      });
      expect(result.swapped).toBe(true);
      if (!result.swapped) return;
      occurrenceIds = result.hand.occurrenceIds;
    }
    expect((await db.days.get(MONDAY))!.swapsUsed).toBe(3);

    const fourth = await swapFranjaTask(db, {
      handId: hand.id, occurrenceId: occurrenceIds[0],
      now: NOW + 5000, seed: "s", tasks, occurrences,
    });
    expect(fourth).toEqual({ swapped: false, reason: "no_swaps" });
    expect(await db.events.where("type").equals("swapped").count()).toBe(3);
  });

  it("no cambia mientras hay una sesión activa", async () => {
    const { db, tasks, occurrences } = await fourTasks();
    const hand = await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences });
    await startSession(db, { sessionId: "s1", taskId: tasks[0].id, date: MONDAY, variant: "full", now: NOW });
    const result = await swapFranjaTask(db, {
      handId: hand.hand!.id, occurrenceId: hand.hand!.occurrenceIds[0],
      now: NOW + 1000, seed: "s", tasks, occurrences,
    });
    expect(result).toEqual({ swapped: false, reason: "active_session" });
    expect((await db.days.get(MONDAY))!.swapsUsed).toBe(0);
  });

  it("la tarea cambiada puede volver en la franja siguiente", async () => {
    const { db, tasks, occurrences } = await fourTasks();
    const first = await ensureFranja(db, { date: MONDAY, now: NOW, seed: "s", tasks, occurrences });
    const original = first.hand!.occurrenceIds[0];
    const swapped = await swapFranjaTask(db, {
      handId: first.hand!.id, occurrenceId: original, now: NOW + 1000,
      seed: "s", tasks, occurrences,
    });
    expect(swapped.swapped).toBe(true);
    if (!swapped.swapped) return;

    for (const occurrenceId of swapped.hand.occurrenceIds) {
      await db.occurrences.update(occurrenceId, { status: "completed" });
    }
    const next = await ensureFranja(db, {
      date: MONDAY, now: NOW + 2000, seed: "s", tasks,
      occurrences: await db.occurrences.where("date").equals(MONDAY).toArray(),
    });
    expect(next.hand).toMatchObject({ ordinal: 2, status: "open" });
    expect(next.hand!.occurrenceIds).toContain(original);
  });
});

describe("escalones", () => {
  it("completa el paso corto sin terminar la tarea y bloquea repetirlo", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const short = await startSession(db, {
      sessionId: "short", taskId: "ropa", date: MONDAY, variant: "short", now: NOW,
    });
    expect(short).toMatchObject({
      variant: "short", durationSec: 60, remainingSecAtStart: 60,
      elapsedSec: 0, rewardTargetRc: 1, rewardCapRc: 15,
    });

    const completed = await completeSession(db, "short", NOW + 60_000);
    const occurrence = await db.occurrences.get(occurrenceIdFor("ropa", MONDAY));
    expect(completed).toMatchObject({ status: "completed", variant: "short", elapsedSec: 60 });
    expect(occurrence).toMatchObject({
      status: "partial", shortStepCompleted: true, timerElapsedSec: 60,
    });
    expect(await db.events.where("type").equals("completed").count()).toBe(1);
    expect(await db.ledger.count()).toBe(1);
    expect((await db.ledger.toArray())[0]).toMatchObject({ deltaRc: 1, reason: "short_step" });

    await expect(startSession(db, {
      sessionId: "short-again", taskId: "ropa", date: MONDAY, variant: "short", now: NOW + 61_000,
    })).rejects.toThrow("primer paso");
  });

  it("continúa el resto con el tiempo restante y cierra la tarea al completarla", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "short", taskId: "ropa", date: MONDAY, variant: "short", now: NOW });
    await completeSession(db, "short", NOW + 60_000);

    const full = await startSession(db, {
      sessionId: "full", taskId: "ropa", date: MONDAY, variant: "full", now: NOW + 61_000,
    });
    expect(full).toMatchObject({
      variant: "full", durationSec: 15 * 60, remainingSecAtStart: 14 * 60,
      elapsedSec: 60, rewardTargetRc: 14, rewardCapRc: 15,
    });
    const completed = await completeSession(db, "full", NOW + 61_000 + 14 * 60_000);
    expect(completed).toMatchObject({ status: "completed", elapsedSec: 15 * 60 });
    expect(await db.occurrences.get(occurrenceIdFor("ropa", MONDAY))).toMatchObject({
      status: "completed", shortStepCompleted: true, timerElapsedSec: 15 * 60,
      creditedRc: 15,
    });
    expect(await db.ledger.count()).toBe(2);
    expect((await db.ledger.toArray()).reduce((sum, entry) => sum + entry.deltaRc, 0)).toBe(15);
  });

  it("la franja muestra el paso hecho y los minutos restantes", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await ensureOccurrence(db, "ropa", MONDAY, NOW);
    await startSession(db, { sessionId: "short", taskId: "ropa", date: MONDAY, variant: "short", now: NOW });
    await completeSession(db, "short", NOW + 60_000);
    const tasks = await listTasks(db);
    const occurrences = await db.occurrences.where("date").equals(MONDAY).toArray();
    const franja = await ensureFranja(db, { date: MONDAY, now: NOW + 61_000, seed: "s", tasks, occurrences });
    expect(franja.tasks[0]).toMatchObject({ shortStepCompleted: true, remainingMin: 14 });
  });
});

describe("cruce de medianoche", () => {
  const daily = taskInput({ days: [0, 1, 2, 3, 4, 5, 6] });
  const lateMonday = new Date(2026, 9, 26, 23, 50).getTime();
  const afterMidnight = new Date(2026, 9, 27, 0, 5).getTime();

  it("completa la ocurrencia original y crea una nueva para el día siguiente", async () => {
    const db = await testDb();
    await createTask(db, "diaria", daily, NOW);
    const started = await startSession(db, {
      sessionId: "s1", taskId: "diaria", date: MONDAY, variant: "full", now: lateMonday,
    });
    const completed = await completeSession(db, "s1", afterMidnight);

    expect(completed.occurrenceId).toBe(started.occurrenceId);
    expect((await db.occurrences.get(started.occurrenceId))!.status).toBe("completed");
    const next = await ensureOccurrence(db, "diaria", TUESDAY, afterMidnight);
    expect(next).toMatchObject({ date: TUESDAY, status: "pending" });
    expect(next.id).not.toBe(started.occurrenceId);
    expect(await db.ledger.count()).toBe(1);
  });

  it("una pausa que cruza medianoche conserva el restante y la ocurrencia", async () => {
    const db = await testDb();
    await createTask(db, "diaria", daily, NOW);
    const started = await startSession(db, {
      sessionId: "s1", taskId: "diaria", date: MONDAY, variant: "full", now: lateMonday,
    });
    const paused = await pauseSession(db, "s1", lateMonday + 5 * 60_000);
    expect(paused).toMatchObject({ status: "paused", remainingSecAtStart: 10 * 60 });

    const resumed = await resumeSession(db, "s1", afterMidnight);
    expect(resumed).toMatchObject({ status: "running", startedAt: afterMidnight });
    await completeSession(db, "s1", afterMidnight + 5 * 60_000);
    expect((await db.occurrences.get(started.occurrenceId))).toMatchObject({
      date: MONDAY, status: "completed", timerElapsedSec: 10 * 60,
    });
    expect(await ensureOccurrence(db, "diaria", TUESDAY, afterMidnight)).toMatchObject({
      date: TUESDAY, status: "pending",
    });
    expect(await db.ledger.count()).toBe(1);
  });

  it("cerrar el día de una sesión anterior no cierra el día nuevo", async () => {
    const db = await testDb();
    await createTask(db, "diaria", daily, NOW);
    const started = await startSession(db, {
      sessionId: "s1", taskId: "diaria", date: MONDAY, variant: "full", now: lateMonday,
    });
    const closed = await closeDay(db, MONDAY, afterMidnight);
    expect(closed.closedAt).toBe(afterMidnight);
    expect(await db.sessions.get("s1")).toMatchObject({ status: "abandoned" });
    expect((await db.occurrences.get(started.occurrenceId))!.date).toBe(MONDAY);
    expect((await db.occurrences.get(started.occurrenceId))!.status).toBe("partial");
    expect((await ensureDay(db, TUESDAY, afterMidnight)).closedAt).toBeNull();
    expect(await db.ledger.count()).toBe(0);
  });
});

describe("economía fija", () => {
  it("paga el tope completo una vez y no duplica al reintentar", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    const result = await completeSessionWithCredit(db, "s1", NOW + 10_000);

    expect(result).toMatchObject({ creditedRc: 15, totalCreditedRc: 15 });
    expect(result.session).toMatchObject({ status: "completed", rewardTargetRc: 15, rewardCapRc: 15 });
    expect((await db.occurrences.get(occurrenceIdFor("ropa", MONDAY)))!.creditedRc).toBe(15);
    expect(await db.ledger.count()).toBe(1);
    expect((await db.ledger.toArray())[0]).toMatchObject({
      deltaRc: 15, reason: "full_completion", occurrenceId: occurrenceIdFor("ropa", MONDAY),
    });

    const retry = await completeSessionWithCredit(db, "s1", NOW + 20_000);
    expect(retry).toMatchObject({ creditedRc: 0, totalCreditedRc: 15 });
    expect(await db.ledger.count()).toBe(1);
  });

  it("paga 1 por el paso y 14 al completar, no 16", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "short", taskId: "ropa", date: MONDAY, variant: "short", now: NOW });
    const short = await completeSessionWithCredit(db, "short", NOW + 60_000);
    expect(short).toMatchObject({ creditedRc: 1, totalCreditedRc: 1 });

    const full = await startSession(db, {
      sessionId: "full", taskId: "ropa", date: MONDAY, variant: "full", now: NOW + 61_000,
    });
    expect(full).toMatchObject({ rewardTargetRc: 14, rewardCapRc: 15 });
    const completed = await completeSessionWithCredit(db, "full", NOW + 61_000 + 14 * 60_000);

    expect(completed).toMatchObject({ creditedRc: 14, totalCreditedRc: 15 });
    expect((await db.occurrences.get(occurrenceIdFor("ropa", MONDAY)))!.creditedRc).toBe(15);
    const entries = await db.ledger.orderBy("at").toArray();
    expect(entries.map((entry) => [entry.deltaRc, entry.reason])).toEqual([
      [1, "short_step"],
      [14, "full_completion"],
    ]);
    expect(entries.reduce((sum, entry) => sum + entry.deltaRc, 0)).toBe(15);
  });

  it("editar la tarea después del primer asalto no aumenta el acuerdo", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "short", taskId: "ropa", date: MONDAY, variant: "short", now: NOW });
    await completeSessionWithCredit(db, "short", NOW + 60_000);
    await updateTask(db, "ropa", taskInput({ durationMin: 30, title: "Ropa nueva" }), NOW + 61_000, "edit-after-start");

    const full = await startSession(db, {
      sessionId: "full", taskId: "ropa", date: MONDAY, variant: "full", now: NOW + 62_000,
    });
    expect(full).toMatchObject({
      durationSec: 15 * 60, remainingSecAtStart: 14 * 60,
      rewardTargetRc: 14, rewardCapRc: 15,
      taskSnapshot: { title: "Lavar ropa", durationMin: 15 },
    });
  });

  it("el saldo del ledger sobrevive cerrar y reabrir la DB", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await startSession(db, { sessionId: "short", taskId: "ropa", date: MONDAY, variant: "short", now: NOW });
    await completeSessionWithCredit(db, "short", NOW + 60_000);
    db.close();

    const reopened = await testDb(db.name);
    expect(await reopened.ledger.count()).toBe(1);
    expect((await reopened.occurrences.get(occurrenceIdFor("ropa", MONDAY)))!.creditedRc).toBe(1);
    const full = await startSession(reopened, {
      sessionId: "full", taskId: "ropa", date: MONDAY, variant: "full", now: NOW + 61_000,
    });
    expect(full).toMatchObject({ rewardTargetRc: 14 });
    const completed = await completeSessionWithCredit(reopened, "full", NOW + 61_000 + 14 * 60_000);
    expect(completed).toMatchObject({ creditedRc: 14, totalCreditedRc: 15 });
    expect(await reopened.ledger.count()).toBe(2);
  });
});

describe("ancla ligera", () => {
  const gymNow = new Date(2026, 9, 26, 18, 0).getTime();
  const gym = taskInput({
    title: "Gym", fixedTime: "18:00", window: { start: "18:00", end: "18:30" },
  });

  it("se reclama una vez, registra el evento y no se repite", async () => {
    const db = await testDb();
    await createTask(db, "gym", gym, NOW);
    await ensureDay(db, MONDAY, NOW);
    await ensureOccurrence(db, "gym", MONDAY, NOW);

    const claimed = await claimAnchor(db, {
      taskId: "gym", date: MONDAY, fixedTime: "18:00", now: gymNow,
    });
    expect(claimed).toMatchObject({ anchorPresentedAt: gymNow });
    expect(await claimAnchor(db, {
      taskId: "gym", date: MONDAY, fixedTime: "18:00", now: gymNow + 1000,
    })).toBeNull();
    expect(await db.events.where("type").equals("anchor_presented").count()).toBe(1);
  });

  it("permite iniciar el ancla con una sesión previa pausada", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await createTask(db, "gym", gym, NOW);
    await ensureDay(db, MONDAY, NOW);
    await ensureOccurrence(db, "ropa", MONDAY, NOW);
    await ensureOccurrence(db, "gym", MONDAY, NOW);
    await startSession(db, { sessionId: "ropa-session", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await pauseSession(db, "ropa-session", NOW + 1000);
    await claimAnchor(db, { taskId: "gym", date: MONDAY, fixedTime: "18:00", now: gymNow });

    await expect(startSession(db, {
      sessionId: "gym-session", taskId: "gym", date: MONDAY, variant: "full", now: gymNow, anchor: true,
    })).resolves.toMatchObject({ status: "running", taskSnapshot: { title: "Gym" } });
    expect(await db.sessions.get("ropa-session")).toMatchObject({ status: "paused" });
  });

  it("no inicia un ancla que no fue presentada", async () => {
    const db = await testDb();
    await createTask(db, "gym", gym, NOW);
    await ensureDay(db, MONDAY, NOW);
    await ensureOccurrence(db, "gym", MONDAY, NOW);
    await expect(startSession(db, {
      sessionId: "gym-session", taskId: "gym", date: MONDAY, variant: "full", now: gymNow, anchor: true,
    })).rejects.toThrow("presentada");
  });

  it("no aplica desde el ancla sin abrir sesión", async () => {
    const db = await testDb();
    await createTask(db, "gym", gym, NOW);
    await ensureOccurrence(db, "gym", MONDAY, NOW);
    await markOccurrenceNotApplicableDirect(db, occurrenceIdFor("gym", MONDAY), gymNow);
    expect((await db.occurrences.get(occurrenceIdFor("gym", MONDAY)))!.status).toBe("not_applicable");
    expect(await db.events.where("type").equals("not_applicable").count()).toBe(1);
    expect(await db.sessions.count()).toBe(0);
  });
});

describe("atomicidad y concurrencia", () => {
  it("solo concede un timer corriendo entre dos conexiones a la misma DB", async () => {
    const db = await testDb();
    const other = await testDb(db.name);
    await createTask(db, "ropa", taskInput(), NOW);
    await createTask(db, "cafe", taskInput({ title: "Café" }), NOW);
    const results = await Promise.allSettled([
      startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW }),
      startSession(other, { sessionId: "s2", taskId: "cafe", date: MONDAY, variant: "full", now: NOW }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await db.sessions.where("runningSlot").equals("running").count()).toBe(1);
    expect(await db.events.count()).toBe(3);
  });

  it("el índice único impide otro runningSlot aunque se salte el repositorio", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const session = await startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW });
    await expect(db.sessions.add({ ...session, id: "otro" })).rejects.toMatchObject({ name: "ConstraintError" });
  });

  it("revierte sesión, acuerdo y ocurrencia si falla la escritura del evento", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    const collision: RunoEvent = {
      id: eventIdFor("start:s1", "started"), actionId: "otra-accion", type: "started", at: NOW, context: {},
    };
    await db.events.add(collision);
    await expect(startSession(db, { sessionId: "s1", taskId: "ropa", date: MONDAY, variant: "full", now: NOW })).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
    expect(await db.occurrences.count()).toBe(0);
    expect(await db.events.count()).toBe(2);
    expect(await db.ledger.count()).toBe(0);
  });

  it("el origen de un movimiento del ledger es único incluso con otro ID", async () => {
    const db = await testDb();
    const fixture = { id: "l1", sourceKey: "ocurrencia:ropa:full", deltaRc: 15, reason: "full_completion" as const, at: NOW };
    await db.ledger.add(fixture);
    await expect(db.ledger.add({ ...fixture, id: "l2" })).rejects.toMatchObject({ name: "ConstraintError" });
    expect(await db.ledger.count()).toBe(1);
  });
});
