import { describe, expect, it, vi } from "vitest";
import { RunoDatabase, openDatabase } from "./database";
import { eventIdFor } from "./events";
import {
  archiveTask, completeSession, createTask, ensureDay, ensureOccurrence, expireSession,
  getSettings, listTasks, markOccurrenceNotApplicable, occurrenceIdFor, retrySession,
  saveSettings, startSession, updateTask,
} from "./repository";
import { MONDAY, NOW, taskInput } from "@/tests/fixtures";
import type { RunoEvent } from "@/lib/domain/types";
import { setupTestDatabase } from "@/tests/database";

const testDb = setupTestDatabase();

describe("schema versionado y almacenamiento local", () => {
  it("no abre una conexión al construir la clase", () => {
    const db = new RunoDatabase(`runo-test-${crypto.randomUUID()}`);
    expect(db.isOpen()).toBe(false);
    db.close();
  });

  it("crea las ocho entidades y un marcador interno de migración", async () => {
    const db = await testDb();
    expect(db.verno).toBe(1);
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
    expect(await db.ledger.count()).toBe(0);

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
