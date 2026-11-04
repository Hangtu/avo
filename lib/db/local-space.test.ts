import { afterEach, describe, expect, it } from "vitest";
import { DATABASE_NAME, databaseNameForUser, openDatabaseForSpace, type RunoDatabase } from "./database";
import {
  databaseNameForSpace,
  GUEST_SPACE,
  readSpaceStorage,
  removeSpaceStorage,
  SPACE_STORAGE_KEYS,
  storageKeyForSpace,
  writeSpaceStorage,
  type LocalSpace,
} from "./local-space";
import { createTask } from "./repository";
import { localeStorageKey } from "@/lib/i18n/config";
import { THEME_STORAGE_KEY } from "@/lib/domain/theme";
import { NOW, taskInput } from "@/tests/fixtures";
import { setupTestDatabase } from "@/tests/database";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

const A: LocalSpace = { kind: "account", userId: "account:A" };
const B: LocalSpace = { kind: "account", userId: "account:B" };

describe("local space names and browser preferences", () => {
  it("preserves the old guest DB and preference names without a destructive migration", () => {
    expect(databaseNameForSpace(GUEST_SPACE)).toBe("runo");
    expect(DATABASE_NAME).toBe("runo");
    for (const key of Object.values(SPACE_STORAGE_KEYS)) {
      expect(storageKeyForSpace(GUEST_SPACE, key)).toBe(key);
    }
    expect(SPACE_STORAGE_KEYS.locale).toBe(localeStorageKey);
    expect(SPACE_STORAGE_KEYS.theme).toBe(THEME_STORAGE_KEY);
  });

  it("uses only the stable internal ID, with no separator, guest or percent collisions", () => {
    const ids = ["guest", "owner", "A", "a", "account:A", "account%3AA", "a:b", "a%3Ab", "ñ"];
    const names = ids.map((userId) => databaseNameForSpace({ kind: "account", userId }));
    expect(new Set([databaseNameForSpace(GUEST_SPACE), ...names]).size).toBe(ids.length + 1);
    expect(databaseNameForSpace(A)).toBe(databaseNameForSpace({ ...A }));
    for (const userId of ids) {
      expect(databaseNameForSpace({ kind: "account", userId })).toBe(databaseNameForUser(userId));
    }
  });

  it.each(["", " ", " A", "A ", "a".repeat(257)])("rejects an invalid account ID: %j", (userId) => {
    expect(() => databaseNameForSpace({ kind: "account", userId })).toThrow(/ID de cuenta/);
  });

  it("removes only guest preferences without clearing account copies or unrelated storage", () => {
    const stores = { local: memoryStorage(), session: memoryStorage() };
    for (const storage of Object.values(stores)) {
      storage.setItem("another-app:important", "keep");
      storage.setItem("runo:unmanaged", "keep");
      for (const key of Object.values(SPACE_STORAGE_KEYS)) {
        writeSpaceStorage(storage, GUEST_SPACE, key, "guest");
        writeSpaceStorage(storage, A, key, "A");
        writeSpaceStorage(storage, B, key, "B");
      }
    }
    removeSpaceStorage(GUEST_SPACE, stores);
    for (const storage of Object.values(stores)) {
      expect(storage.getItem("another-app:important")).toBe("keep");
      expect(storage.getItem("runo:unmanaged")).toBe("keep");
      for (const key of Object.values(SPACE_STORAGE_KEYS)) {
        expect(readSpaceStorage(storage, GUEST_SPACE, key)).toBeNull();
        expect(readSpaceStorage(storage, A, key)).toBe("A");
        expect(readSpaceStorage(storage, B, key)).toBe("B");
      }
    }
  });

  it("keeps every preference/draft separate and cleans only the selected Runo space", () => {
    const stores = { local: memoryStorage(), session: memoryStorage() };
    for (const storage of Object.values(stores)) {
      storage.setItem("another-app:important", "keep");
      for (const key of Object.values(SPACE_STORAGE_KEYS)) {
        writeSpaceStorage(storage, GUEST_SPACE, key, "guest");
        writeSpaceStorage(storage, A, key, "A");
        writeSpaceStorage(storage, B, key, "B");
        // A similar prefix is not permission to delete another key.
        storage.setItem(`${storageKeyForSpace(A, key)}:unmanaged`, "keep");
      }
    }
    removeSpaceStorage(A, stores);
    for (const storage of Object.values(stores)) {
      expect(storage.getItem("another-app:important")).toBe("keep");
      for (const key of Object.values(SPACE_STORAGE_KEYS)) {
        expect(readSpaceStorage(storage, A, key)).toBeNull();
        expect(readSpaceStorage(storage, B, key)).toBe("B");
        expect(readSpaceStorage(storage, GUEST_SPACE, key)).toBe("guest");
        expect(storage.getItem(`${storageKeyForSpace(A, key)}:unmanaged`)).toBe("keep");
      }
    }
    removeSpaceStorage(GUEST_SPACE, stores);
    expect(readSpaceStorage(stores.local, B, SPACE_STORAGE_KEYS.locale)).toBe("B");
  });
});

describe("isolated Dexie spaces (fake IndexedDB, never the real runo DB)", () => {
  const openGuestFixture = setupTestDatabase();
  const connections: RunoDatabase[] = [];
  afterEach(async () => {
    const unique = new Map(connections.map((db) => [db.name, db]));
    for (const db of connections) db.close();
    for (const db of unique.values()) {
      if (!db.name.startsWith("runo-user-runo-test-")) throw new Error("Unsafe test DB cleanup");
      await db.delete();
    }
    connections.length = 0;
  });

  const openAccount = async (space: LocalSpace) => {
    const db = await openDatabaseForSpace(space);
    connections.push(db);
    return db;
  };

  it("starts an account empty, with no owner seed or automatic guest import", async () => {
    const db = await openAccount({ kind: "account", userId: `runo-test-${crypto.randomUUID()}` });
    for (const table of db.tables) expect(await table.count()).toBe(0);
  });

  it("allows the same IDs and deleting A without changing B or the existing local data", async () => {
    const guest = await openGuestFixture();
    const spaceA: LocalSpace = { kind: "account", userId: `runo-test-${crypto.randomUUID()}` };
    const spaceB: LocalSpace = { kind: "account", userId: `runo-test-${crypto.randomUUID()}` };
    const a = await openAccount(spaceA);
    const b = await openAccount(spaceB);
    for (const [db, title] of [
      [guest, "Guest unchanged"],
      [a, "A only"],
      [b, "B only"],
    ] as const) {
      await createTask(db, "seed:coffee", taskInput({ title }), NOW);
      await db.metadata.put({ key: "test:private-state", value: { title } });
    }
    await a.tasks.update("seed:coffee", { title: "A edited" });
    expect((await b.tasks.get("seed:coffee"))?.title).toBe("B only");
    expect((await guest.tasks.get("seed:coffee"))?.title).toBe("Guest unchanged");
    a.close();
    const reopened = await openAccount(spaceA);
    expect((await reopened.tasks.get("seed:coffee"))?.title).toBe("A edited");
    reopened.close();
    await a.delete();
    expect(await b.metadata.get("test:private-state")).toEqual({
      key: "test:private-state",
      value: { title: "B only" },
    });
    expect((await guest.tasks.get("seed:coffee"))?.title).toBe("Guest unchanged");
    expect(await b.events.count()).toBe(1);
    expect(await guest.events.count()).toBe(1);
  });
});
