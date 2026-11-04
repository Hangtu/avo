import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as database from "@/lib/db/database";
import { createPending, createTask, saveSettings } from "@/lib/db/repository";
import { defaultSettings } from "@/lib/domain/validation";
import { NOW, taskInput } from "@/tests/fixtures";
import { setupTestDatabase } from "@/tests/database";
import { guestPreview, importGuest } from "./guest-import";

const guestFixture = setupTestDatabase();
let sourceName: string;
const connections: database.RunoDatabase[] = [];
beforeEach(async () => {
  const source = await guestFixture();
  sourceName = source.name;
  const actual = database.openDatabaseForSpace;
  vi.spyOn(database, "openDatabaseForSpace").mockImplementation((space) =>
    space.kind === "guest" ? guestFixture(sourceName) : actual(space),
  );
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const db of connections) {
    if (!db.name.startsWith("runo-user-runo-test-")) throw new Error("Unsafe test cleanup");
    db.close();
    await db.delete();
  }
  connections.length = 0;
});
async function account() {
  const db = await database.openDatabaseForSpace({
    kind: "account",
    userId: `runo-test-${crypto.randomUUID()}`,
  });
  connections.push(db);
  return db;
}
async function source() {
  return guestFixture(sourceName);
}

describe("consented guest incorporation — synthetic IndexedDB only", () => {
  it("review/cancel neither copies data nor adds a marker to the guest", async () => {
    const guest = await source(),
      target = await account();
    await createPending(guest, "p1", { title: "Guest", durationMin: 25 }, NOW);
    const preview = await guestPreview();
    expect(preview.pendings).toHaveLength(1);
    expect(await target.pendings.count()).toBe(0);
    expect(await target.outbox.count()).toBe(0);
    expect(await guest.metadata.get("guest-source-v1")).toBeUndefined();
    expect((await guest.pendings.get("p1"))?.title).toBe("Guest");
  });
  it("copies definitions/final states with a recovery receipt, never execution, without duplicating retries", async () => {
    const guest = await source(),
      target = await account();
    await createPending(guest, "same", { title: "Guest pending", durationMin: 25 }, NOW);
    await guest.pendings.update("same", { completedAt: NOW + 1 });
    await createTask(guest, "same", taskInput(), NOW);
    // Synthetic unrelated runtime marker must never cross into the account.
    await guest.days.put({ date: "2026-10-26", swapsUsed: 2, createdAt: NOW, closedAt: NOW });
    await createPending(target, "same", { title: "Account original", durationMin: 25 }, NOW);
    const preview = await guestPreview();
    expect(await importGuest(target, preview)).toEqual({ added: 2 });
    expect(await importGuest(target, await guestPreview())).toEqual({ added: 0 });
    expect(await target.pendings.count()).toBe(2);
    expect((await target.pendings.get("same"))?.title).toBe("Account original");
    const imported = await target.pendings.filter((row) => row.id !== "same").first();
    expect(imported).toMatchObject({ title: "Guest pending", completedAt: NOW + 1 });
    expect(await target.tasks.count()).toBe(1);
    expect(await target.days.count()).toBe(0);
    expect(await target.sessions.count()).toBe(0);
    expect(await target.events.count()).toBe(0);
    expect(await target.metadata.filter((row) => row.key.startsWith("guest-import-v1:")).count()).toBe(1);
    expect(await guest.pendings.count()).toBe(1);
    expect(await guest.days.count()).toBe(1);
  });
  it("keeps existing account preferences rather than overwriting them with guest settings", async () => {
    const guest = await source(),
      target = await account();
    await saveSettings(guest, { ...defaultSettings(NOW), theme: "light", locale: "es" });
    await saveSettings(target, { ...defaultSettings(NOW), theme: "dark", locale: "en" });
    await importGuest(target, await guestPreview());
    expect(await target.settings.get("preferences")).toMatchObject({ theme: "dark", locale: "en" });
  });
  it("requires another review if the guest changes after consent", async () => {
    const guest = await source(),
      target = await account();
    const consented = await guestPreview();
    await createPending(guest, "p1", { title: "Changed", durationMin: 25 }, NOW);
    await expect(importGuest(target, consented)).rejects.toThrow("guest_changed_review_again");
    expect(await target.outbox.count()).toBe(0);
    expect(await target.pendings.count()).toBe(0);
  });
  it("rolls back imported rows and receipt if enqueue fails, retaining guest data", async () => {
    const guest = await source(),
      target = await account();
    await createPending(guest, "p1", { title: "Guest", durationMin: 25 }, NOW);
    vi.spyOn(target.outbox, "put").mockRejectedValueOnce(new Error("synthetic quota"));
    await expect(importGuest(target, await guestPreview())).rejects.toThrow("quota");
    expect(await target.pendings.count()).toBe(0);
    expect(await target.metadata.count()).toBe(0);
    expect(await guest.pendings.count()).toBe(1);
  });
});
