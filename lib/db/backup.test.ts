import { describe, expect, it } from "vitest";
import { exportLocalSnapshot, importLocalSnapshot } from "./backup";
import { createTask, getSettings, listTasks } from "./repository";
import { seedDatabase } from "./seed";
import { setupTestDatabase } from "@/tests/database";
import { NOW, taskInput } from "@/tests/fixtures";

const testDb = setupTestDatabase();

describe("copia local", () => {
  it("exporta e importa el estado completo en una transacción", async () => {
    const source = await testDb();
    await seedDatabase(source, NOW);
    const snapshot = await exportLocalSnapshot(source, NOW);

    const target = await testDb();
    await createTask(target, "extra", taskInput({ title: "Extra" }), NOW);
    await importLocalSnapshot(target, snapshot);

    expect(await target.tasks.count()).toBe(2);
    expect((await listTasks(target)).map((task) => task.id).sort()).toEqual([
      "seed:brush-teeth",
      "seed:shower",
    ]);
    expect(await getSettings(target, NOW)).toMatchObject({ audioEnabled: false });
    expect(await target.metadata.count()).toBe(1);
  });

  it("rechaza una copia de otra versión", async () => {
    const db = await testDb();
    await seedDatabase(db, NOW);
    const snapshot = await exportLocalSnapshot(db, NOW);
    await expect(importLocalSnapshot(db, { ...snapshot, schemaVersion: 2 } as never)).rejects.toThrow(
      /versión/i,
    );
  });
});
