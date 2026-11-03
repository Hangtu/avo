import { afterEach, describe, expect, it, vi } from "vitest";
import { openDatabaseForSpace, resetActiveDatabaseName, setActiveUserDatabase, type RunoDatabase } from "@/lib/db/database";
import { preferenceWriteState, retryPreferenceWrites, writePreferences } from "./preference-writer";
import { getSettings } from "@/lib/db/repository";

const connections: RunoDatabase[] = [];
afterEach(async () => {
  vi.restoreAllMocks(); resetActiveDatabaseName();
  for (const db of connections) { db.close(); if (!db.name.startsWith("runo-user-runo-test-")) throw new Error("Unsafe cleanup"); await db.delete(); }
  connections.length = 0;
});
async function local() {
  const id = `runo-test-${crypto.randomUUID()}`;
  setActiveUserDatabase(id);
  const db = await openDatabaseForSpace({ kind: "account", userId: id }); connections.push(db); return db;
}
describe("retryable, scoped preference persistence", () => {
  it("serializes quick reorders and preserves a simultaneous language change", async () => {
    const db = await local();
    await Promise.all([writePreferences(db.name, { taskOrder: { a: 0, b: 1, c: 2 } }),
      writePreferences(db.name, { taskOrder: { b: 0, c: 1, a: 2 } }), writePreferences(db.name, { locale: "en" })]);
    expect(await getSettings(db, Date.now())).toMatchObject({ taskOrder: { b: 0, c: 1, a: 2 }, locale: "en" });
    expect(preferenceWriteState(db.name)).toEqual({ pending: 0, failed: 0 });
  });
  it("keeps a failed patch retryable without undoing newer unrelated preferences", async () => {
    const db = await local();
    const { RunoDatabase } = await import("@/lib/db/database");
    vi.spyOn(RunoDatabase.prototype, "open").mockRejectedValueOnce(new Error("synthetic unavailable"));
    await expect(writePreferences(db.name, { locale: "en" })).rejects.toThrow("synthetic");
    expect(preferenceWriteState(db.name).failed).toBe(1);
    await writePreferences(db.name, { theme: "dark" });
    await retryPreferenceWrites(db.name);
    expect(await getSettings(db, Date.now())).toMatchObject({ theme: "dark", locale: "en" });
    expect(preferenceWriteState(db.name)).toEqual({ pending: 0, failed: 0 });
  });
  it("does not retry an older failed value over a newer successful value of the same field", async () => {
    const db = await local();
    const { RunoDatabase } = await import("@/lib/db/database");
    vi.spyOn(RunoDatabase.prototype, "open").mockRejectedValueOnce(new Error("unavailable"));
    await expect(writePreferences(db.name, { locale: "en" })).rejects.toThrow();
    await writePreferences(db.name, { locale: "es" });
    expect(preferenceWriteState(db.name).failed).toBe(0);
    expect((await getSettings(db, Date.now())).locale).toBe("es");
  });
  it("does not write a queued patch under a different selected space", async () => {
    const a = await local(), pending = writePreferences(a.name, { locale: "en" });
    setActiveUserDatabase(`runo-test-${crypto.randomUUID()}`);
    await expect(pending).rejects.toThrow("space_changed");
    const inspected = await openDatabaseForSpace({ kind: "account", userId: a.accountId! });
    try { expect(await inspected.settings.get("preferences")).toBeUndefined(); } finally { inspected.close(); }
    expect(preferenceWriteState(a.name).failed).toBe(1);
  });
});
