import { describe, expect, it } from "vitest";
import { appendEvent } from "./events";
import { createTask, updateTask, archiveTask } from "./repository";
import { EVENT_TYPES, type JsonValue } from "@/lib/domain/types";
import { setupTestDatabase } from "@/tests/database";
import { NOW, taskInput } from "@/tests/fixtures";

const testDb = setupTestDatabase();

describe("eventos append-only", () => {
  it.each(EVENT_TYPES)("admite el vocabulario canónico: %s", async (type) => {
    const db = await testDb();
    const { event, inserted } = await appendEvent(db, {
      actionId: "action",
      type,
      at: NOW,
      taskId: "ropa",
      context: { variant: "full" },
    });
    expect(inserted).toBe(true);
    expect(event.type).toBe(type);
    expect(await db.events.count()).toBe(1);
  });

  it("preserva el timestamp original en reintentos concurrentes", async () => {
    const db = await testDb();
    const other = await testDb(db.name);
    const input = { actionId: "offer-1", type: "offered" as const, at: NOW, taskId: "ropa" };
    const results = await Promise.all([
      appendEvent(db, input),
      appendEvent(other, { ...input, at: NOW + 1000 }),
    ]);
    expect(results.filter((result) => result.inserted)).toHaveLength(1);
    expect(results[0].event).toEqual(results[1].event);
    expect(await db.events.count()).toBe(1);
  });

  it("una misma acción puede registrar pausa y vida real sin colapsarlas", async () => {
    const db = await testDb();
    for (const type of ["paused", "life_real"] as const) {
      await appendEvent(db, { actionId: "pause-1", type, at: NOW, context: { reason: "baby" } });
    }
    for (const type of ["swapped", "not_applicable", "already_done"] as const) {
      await appendEvent(db, { actionId: type, type, at: NOW });
    }
    expect(await db.events.count()).toBe(5);
    expect(await db.events.where("type").equals("swapped").count()).toBe(1);
    expect(await db.events.where("type").equals("life_real").count()).toBe(1);
  });

  it("compara JSON por contenido, no por orden de propiedades", async () => {
    const db = await testDb();
    await appendEvent(db, { actionId: "a1", type: "offered", at: NOW, context: { b: 2, a: 1 } });
    expect(
      (await appendEvent(db, { actionId: "a1", type: "offered", at: NOW + 1, context: { a: 1, b: 2 } }))
        .inserted,
    ).toBe(false);
  });

  it("no permite cambiar el payload de una acción ya registrada", async () => {
    const db = await testDb();
    await appendEvent(db, { actionId: "a1", type: "offered", at: NOW, taskId: "ropa" });
    await expect(
      appendEvent(db, { actionId: "a1", type: "offered", at: NOW, taskId: "cafe" }),
    ).rejects.toThrow();
    expect((await db.events.toArray())[0].taskId).toBe("ropa");
  });

  it("no persiste referencias mutables al contexto del llamador", async () => {
    const db = await testDb();
    const context = { window: { start: "06:00", end: "12:00" } };
    await appendEvent(db, { actionId: "a1", type: "offered", at: NOW, context });
    context.window.end = "20:00";
    expect((await db.events.toArray())[0].context).toEqual({ window: { start: "06:00", end: "12:00" } });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, undefined, () => 1, new Date(NOW)])(
    "rechaza contexto no serializable: %s",
    async (value) => {
      const db = await testDb();
      await expect(
        appendEvent(db, {
          actionId: "a1",
          type: "offered",
          at: NOW,
          context: { value: value as JsonValue },
        }),
      ).rejects.toThrow();
      expect(await db.events.count()).toBe(0);
    },
  );

  it("rechaza ciclos y tipos de evento desconocidos", async () => {
    const db = await testDb();
    const cycle: Record<string, JsonValue> = {};
    cycle.self = cycle;
    await expect(
      appendEvent(db, { actionId: "a1", type: "offered", at: NOW, context: cycle }),
    ).rejects.toThrow();
    await expect(appendEvent(db, { actionId: "a1", type: "otro" as never, at: NOW })).rejects.toThrow();
  });
});

describe("eventos unidos a operaciones del repositorio", () => {
  it("crear/editar/archivar registran acciones distintas sin repetirlas", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await createTask(db, "ropa", taskInput(), NOW + 1);
    await updateTask(db, "ropa", taskInput({ title: "Ropa limpia" }), NOW + 2, "edit-1");
    await updateTask(db, "ropa", taskInput({ title: "Ropa limpia" }), NOW + 3, "edit-1");
    await archiveTask(db, "ropa", NOW + 4);
    await archiveTask(db, "ropa", NOW + 5);
    expect((await db.events.orderBy("at").toArray()).map((event) => event.type)).toEqual([
      "task_created",
      "task_updated",
      "task_archived",
    ]);
  });

  it("reintentar una edición anterior no sobrescribe otra más reciente", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await updateTask(db, "ropa", taskInput({ title: "Primero" }), NOW + 1, "edit-1");
    await updateTask(db, "ropa", taskInput({ title: "Después" }), NOW + 2, "edit-2");
    await updateTask(db, "ropa", taskInput({ title: "Primero" }), NOW + 3, "edit-1");
    expect((await db.tasks.get("ropa"))!.title).toBe("Después");
    expect(await db.events.where("type").equals("task_updated").count()).toBe(2);
  });

  it("un ID de edición con otro contenido aborta sin tocar la tarea", async () => {
    const db = await testDb();
    await createTask(db, "ropa", taskInput(), NOW);
    await updateTask(db, "ropa", taskInput({ title: "Primero" }), NOW + 1, "edit-1");
    await expect(updateTask(db, "ropa", taskInput({ title: "Otro" }), NOW + 2, "edit-1")).rejects.toThrow();
    expect((await db.tasks.get("ropa"))!.title).toBe("Primero");
  });
});
