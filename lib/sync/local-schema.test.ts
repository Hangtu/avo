import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentDatabaseName,
  openDatabase,
  openDatabaseForSpace,
  resetActiveDatabaseName,
  setActiveDatabaseName,
  setActiveUserDatabase,
} from "@/lib/db/database";
import { createPending, startPendingSession } from "@/lib/db/repository";
import { defaultSettings } from "@/lib/domain/validation";
import { NOW, taskInput } from "@/tests/fixtures";
import {
  ACCESS_KEY,
  beginAccountSignIn,
  enterSpace,
  finishAccountSignOut,
  lockAccountAccess,
  readAccess,
  receiveAccessLock,
  suspendSpace,
} from "./access";

const names: string[] = [];
afterEach(async () => {
  resetActiveDatabaseName();
  vi.unstubAllGlobals();
  for (const name of names) {
    if (!name.startsWith("runo-user-runo-test-") && !name.startsWith("runo-test-"))
      throw new Error("Unsafe test cleanup");
    await Dexie.delete(name);
  }
  names.length = 0;
});
const stores = {
  tasks: "id, archivedAt, *days",
  occurrences: "id, &[taskId+date], taskId, date, status",
  days: "date",
  hands: "id, date, &[date+ordinal], status",
  sessions: "id, occurrenceId, status, &runningSlot, updatedAt, pendingId",
  events: "id, actionId, &[actionId+type], occurrenceId, sessionId, at, type",
  ledger: "id, &sourceKey, occurrenceId, at",
  settings: "id",
  metadata: "key",
  pendings: "id, createdAt, completedAt, deletedAt",
};
async function oldDatabase(account: boolean) {
  const name = `${account ? "runo-user-" : ""}runo-test-${crypto.randomUUID()}`;
  names.push(name);
  const old = new Dexie(name);
  old.version(4).stores(stores);
  await old.open();
  await old
    .table("tasks")
    .add({ ...taskInput(), id: "routine", createdAt: NOW, updatedAt: NOW, archivedAt: null });
  await old.table("pendings").add({
    id: "pending",
    title: "Legacy local",
    durationMin: 25,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: NOW + 1,
    deletedAt: null,
  });
  await old.table("settings").add(defaultSettings(NOW));
  await old.table("sessions").add({ id: "local-session", status: "paused", elapsedSec: 12 });
  old.close();
  return openDatabase(name);
}
async function account() {
  const id = `runo-test-${crypto.randomUUID()}`;
  const db = await openDatabaseForSpace({ kind: "account", userId: id });
  names.push(db.name);
  return db;
}

describe("non-destructive local upgrade and account access", () => {
  it("upgrades v4 account data into an atomic queue without losing local runtime", async () => {
    const db = await oldDatabase(true);
    try {
      expect(db.verno).toBe(5);
      expect(await db.tasks.count()).toBe(1);
      expect((await db.pendings.get("pending"))?.completedAt).toBe(NOW + 1);
      expect(await db.outbox.count()).toBe(3);
      expect((await db.outbox.toArray()).map((row) => row.kind).sort()).toEqual([
        "pending",
        "settings",
        "task",
      ]);
      expect(
        (await db.outbox.toArray()).every((row) => row.baseRevision === 0 && row.state === "queued"),
      ).toBe(true);
      expect(await db.sessions.get("local-session")).toEqual({
        id: "local-session",
        status: "paused",
        elapsedSec: 12,
      });
    } finally {
      db.close();
    }
  });
  it("upgrades guests without adopting or queueing their definitions", async () => {
    const db = await oldDatabase(false);
    try {
      expect(await db.tasks.count()).toBe(1);
      expect(await db.outbox.count()).toBe(0);
    } finally {
      db.close();
    }
  });
  it("switching closes old connections and blocks late default opens during a privacy lock", async () => {
    const a = await account(),
      b = await account();
    setActiveUserDatabase(a.accountId);
    const active = await openDatabase();
    setActiveUserDatabase(b.accountId);
    expect(active.isOpen()).toBe(false);
    const events = new EventTarget();
    vi.stubGlobal("window", events);
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    lockAccountAccess();
    expect(readAccess()).toEqual({ accountId: null, locked: true });
    expect(currentDatabaseName()).toMatch(/^runo-locked-/);
    await expect(openDatabase()).rejects.toThrow("cambiando");
    a.close();
    b.close();
  });
  it("does not pause a running guest-like space when re-entering after reload", async () => {
    const name = `runo-test-${crypto.randomUUID()}`;
    names.push(name);
    setActiveDatabaseName(name);
    const db = await openDatabase();
    try {
      const now = Date.now();
      await createPending(db, "p1", { title: "Guest", durationMin: 25 }, now);
      await startPendingSession(db, { pendingId: "p1", sessionId: "s1", now });
      const entered = await enterSpace(name);
      entered.close();
      expect((await db.sessions.get("s1"))?.status).toBe("running");
    } finally {
      db.close();
    }
  });
  it("keeps A running on recheck and pauses A only when actually entering B", async () => {
    const a = await account(),
      b = await account();
    setActiveUserDatabase(a.accountId);
    const now = Date.now();
    await createPending(a, "p1", { title: "A", durationMin: 25 }, now);
    await startPendingSession(a, { pendingId: "p1", sessionId: "s1", now });
    const rechecked = await enterSpace(a.name);
    rechecked.close();
    expect((await a.sessions.get("s1"))?.status).toBe("running");
    const changed = await enterSpace(b.name);
    changed.close();
    const inspected = await openDatabase(a.name);
    try {
      expect((await inspected.sessions.get("s1"))?.status).toBe("paused");
    } finally {
      inspected.close();
      a.close();
      b.close();
    }
  });
  it("does not let an obsolete selection activate a new space", async () => {
    const a = await account(),
      b = await account();
    setActiveUserDatabase(a.accountId);
    await expect(enterSpace(b.name, () => false)).rejects.toMatchObject({ name: "AbortError" });
    expect(currentDatabaseName()).toBe(a.name);
    a.close();
    b.close();
  });
  it("pauses execution and revokes offline cache access without a remote mutation", async () => {
    const db = await account();
    const now = Date.now();
    await createPending(db, "p1", { title: "Pending", durationMin: 25 }, now);
    await startPendingSession(db, { pendingId: "p1", sessionId: "s1", now });
    await db.metadata.put({ key: "account-access-v1", value: true });
    const before = await db.outbox.toArray();
    await suspendSpace(db.name, true);
    expect((await db.sessions.get("s1"))?.status).toBe("paused");
    expect((await db.metadata.get("account-access-v1"))?.value).toBe(false);
    expect(await db.outbox.toArray()).toEqual(before);
    db.close();
  });
  it("keeps sign-out pending/failure explicit and ignores a late result after a new selection", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    lockAccountAccess(true);
    expect(readAccess().locked).toBe(true);
    expect(readAccess().signOutUntil).toBeGreaterThan(Date.now());
    finishAccountSignOut(true);
    expect(readAccess()).toEqual({ accountId: null, locked: true, signOutFailed: true });
    values.set(ACCESS_KEY, JSON.stringify({ accountId: "new-account", locked: false }));
    finishAccountSignOut(true);
    expect(readAccess()).toEqual({ accountId: "new-account", locked: false });
  });
  it("accepts cross-tab messages only as privacy locks, never as account authorization", () => {
    const values = new Map([[ACCESS_KEY, JSON.stringify({ accountId: "A", locked: false })]]);
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    receiveAccessLock({ accountId: "B", locked: false });
    expect(readAccess()).toEqual({ accountId: "A", locked: false });
    receiveAccessLock({ accountId: null, locked: true });
    expect(readAccess()).toEqual({ accountId: null, locked: true });
  });
  it("keeps a privacy lock even when localStorage rejects every operation", () => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    lockAccountAccess(true);
    finishAccountSignOut(true);
    expect(readAccess()).toEqual({ accountId: null, locked: true, signOutFailed: true });
    beginAccountSignIn();
    expect(readAccess()).toEqual({ accountId: null, locked: false });
    vi.stubGlobal("localStorage", { setItem: () => {} });
    // Clear the volatile test marker through a successful explicit lock.
    lockAccountAccess();
  });
  it("times out a hung open and permits an explicit retry", async () => {
    const name = `runo-test-${crypto.randomUUID()}`;
    names.push(name);
    const spy = vi
      .spyOn(Dexie.prototype, "open")
      .mockImplementationOnce(() => new Promise(() => {}) as ReturnType<Dexie["open"]>);
    try {
      await expect(openDatabase(name, { timeoutMs: 20 })).rejects.toMatchObject({ code: "timeout" });
    } finally {
      spy.mockRestore();
    }
    const recovered = await openDatabase(name);
    recovered.close();
  });
  it("reports an upgrade blocked by another tab without deleting either side", async () => {
    const name = `runo-test-${crypto.randomUUID()}`;
    names.push(name);
    const old = new Dexie(name);
    old.version(4).stores(stores);
    await old.open();
    await old.table("pendings").add({ id: "retained", title: "Keep me" });
    old.close();
    const held = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(openDatabase(name, { timeoutMs: 100 })).rejects.toMatchObject({ code: "blocked" });
    } finally {
      held.close();
      warning.mockRestore();
    }
    const recovered = await openDatabase(name);
    expect((await recovered.pendings.get("retained"))?.title).toBe("Keep me");
    recovered.close();
  });
  it("cancels a storage open when selection was already aborted", async () => {
    const name = `runo-test-${crypto.randomUUID()}`;
    names.push(name);
    const controller = new AbortController();
    controller.abort();
    await expect(openDatabase(name, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });
  it("does not infer offline account access from a malformed storage marker", () => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ accountId: 42, locked: false }) });
    expect(readAccess()).toEqual({ accountId: null, locked: false });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        expect(key).toBe(ACCESS_KEY);
        throw new Error("unavailable");
      },
    });
    expect(readAccess()).toEqual({ accountId: null, locked: false });
  });
});
