import { describe, expect, it } from "vitest";
import { initialTaskTemplates, seedDatabase } from "./seed";
import { archiveTask, getSettings, updateTask } from "./repository";
import { setupTestDatabase } from "@/tests/database";
import { NOW, taskInput } from "@/tests/fixtures";

const testDb = setupTestDatabase();

describe("semilla del Mazo", () => {
  it("crea dos hábitos de ejemplo y preferencias silenciosas", async () => {
    const db = await testDb();
    expect(await seedDatabase(db, NOW)).toEqual({ createdTaskCount: 2 });
    expect(await db.tasks.count()).toBe(2);
    expect(await getSettings(db, NOW)).toMatchObject({ audioEnabled: false, showWallet: false });
    expect(await db.tasks.filter((task) => task.days.length === 0).count()).toBe(0);
  });

  it("programa los dos ejemplos todos los días con su primer paso", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    const tasks = await db.tasks.bulkGet(["seed:brush-teeth", "seed:shower"]);
    expect(tasks.map((task) => task?.days)).toEqual([
      [0, 1, 2, 3, 4, 5, 6],
      [0, 1, 2, 3, 4, 5, 6],
    ]);
    expect(tasks[0]?.shortStep).toEqual({ title: "Preparar el cepillo", durationMin: 1 });
    expect(tasks[1]?.shortStep).toEqual({ title: "Preparar ropa y toalla", durationMin: 1 });
  });

  it("no inventa ventanas ni horas fijas en los ejemplos", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    const tasks = await db.tasks.toArray();
    expect(tasks.every((task) => task.window === undefined && task.fixedTime === undefined)).toBe(true);
  });

  it("dos inicializaciones concurrentes no duplican plantillas", async () => {
    const db = await testDb();
    const other = await testDb(db.name);
    const results = await Promise.all([seedDatabase(db, NOW), seedDatabase(other, NOW + 1)]);
    expect(results.reduce((sum, result) => sum + result.createdTaskCount, 0)).toBe(2);
    expect(await db.tasks.count()).toBe(2);
    expect(await db.metadata.count()).toBe(1);
  });

  it("reabrir no pisa ediciones, archivos o preferencias", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    await updateTask(db, "seed:brush-teeth", taskInput({ title: "Mi cepillo", days: [6], durationMin: 7 }), NOW + 1, "edit-brush");
    await archiveTask(db, "seed:shower", NOW + 1);
    await db.settings.update("preferences", { theme: "dark", maxTone: 0 });
    db.close();
    const reopened = await testDb(db.name);
    expect(await seedDatabase(reopened, NOW + 1000)).toEqual({ createdTaskCount: 0 });
    expect(await reopened.tasks.get("seed:brush-teeth")).toMatchObject({ title: "Mi cepillo", days: [6], durationMin: 7 });
    expect((await reopened.tasks.get("seed:shower"))!.archivedAt).toBe(NOW + 1);
    expect(await getSettings(reopened, NOW)).toMatchObject({ theme: "dark", maxTone: 0 });
  });

  it("una nueva inicialización no resucita una fila eliminada manualmente", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    await db.tasks.delete("seed:brush-teeth");
    await seedDatabase(db, NOW + 1);
    expect(await db.tasks.count()).toBe(1);
  });

  it("editar una copia de las plantillas no cambia la semilla compartida", () => {
    const copy = initialTaskTemplates();
    copy[0].input.title = "Otro";
    copy[0].input.days = [1];
    expect(initialTaskTemplates()[0].input.title).toBe("Cepillarme los dientes");
    expect(initialTaskTemplates()[0].input.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
