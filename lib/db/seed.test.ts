import { describe, expect, it } from "vitest";
import { initialTaskTemplates, seedDatabase } from "./seed";
import { archiveTask, getSettings, updateTask } from "./repository";
import { setupTestDatabase } from "@/tests/database";
import { NOW, taskInput } from "@/tests/fixtures";

const testDb = setupTestDatabase();

describe("semilla del Mazo", () => {
  it("crea diez plantillas y preferencias silenciosas", async () => {
    const db = await testDb();
    expect(await seedDatabase(db, NOW)).toEqual({ createdTaskCount: 10 });
    expect(await db.tasks.count()).toBe(10);
    expect(await getSettings(db, NOW)).toMatchObject({ audioEnabled: false, showWallet: false });
    expect(await db.tasks.filter((task) => task.days.length === 0).count()).toBe(0);
  });

  it("programa suplementos/cuidados todos los días sin inventar escalones", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    const daily = await db.tasks.bulkGet([
      "seed:creatine-vitamin-d", "seed:elian-care", "seed:elian-vitamins",
    ]);
    expect(daily.map((task) => task?.days)).toEqual([
      [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6],
    ]);
    expect(daily.every((task) => task?.shortStep === undefined)).toBe(true);
  });

  it("conserva días y hora de los ejemplos domésticos/gym", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    expect(await db.tasks.get("seed:coffee")).toMatchObject({
      days: [0, 1, 2, 3, 4, 5, 6], window: { start: "06:00", end: "12:00" },
    });
    expect(await db.tasks.get("seed:laundry")).toMatchObject({ days: [1] });
    expect(await db.tasks.get("seed:gym-prep")).toMatchObject({
      days: [1, 2, 3, 4, 5], fixedTime: "18:00",
      window: { start: "18:00", end: "18:30" },
    });
  });

  it("dos inicializaciones concurrentes no duplican plantillas", async () => {
    const db = await testDb();
    const other = await testDb(db.name);
    const results = await Promise.all([seedDatabase(db, NOW), seedDatabase(other, NOW + 1)]);
    expect(results.reduce((sum, result) => sum + result.createdTaskCount, 0)).toBe(10);
    expect(await db.tasks.count()).toBe(10);
    expect(await db.metadata.count()).toBe(1);
  });

  it("reabrir no pisa ediciones, archivos o preferencias", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    await updateTask(db, "seed:coffee", taskInput({ title: "Mi café", days: [6], durationMin: 7 }), NOW + 1, "edit-coffee");
    await archiveTask(db, "seed:shower", NOW + 1);
    await db.settings.update("preferences", { theme: "dark", maxTone: 0 });
    db.close();
    const reopened = await testDb(db.name);
    expect(await seedDatabase(reopened, NOW + 1000)).toEqual({ createdTaskCount: 0 });
    expect(await reopened.tasks.get("seed:coffee")).toMatchObject({ title: "Mi café", days: [6], durationMin: 7 });
    expect((await reopened.tasks.get("seed:shower"))!.archivedAt).toBe(NOW + 1);
    expect(await getSettings(reopened, NOW)).toMatchObject({ theme: "dark", maxTone: 0 });
  });

  it("una nueva inicialización no resucita una fila eliminada manualmente", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    await db.tasks.delete("seed:coffee");
    await seedDatabase(db, NOW + 1);
    expect(await db.tasks.count()).toBe(9);
  });

  it("editar una copia de las plantillas no cambia la semilla compartida", () => {
    const copy = initialTaskTemplates();
    copy[0].input.title = "Otro";
    copy[0].input.days = [1];
    expect(initialTaskTemplates()[0].input.title).toBe("Creatina + Vitamina D");
    expect(initialTaskTemplates()[0].input.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
