import { afterEach, vi } from "vitest";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";

/** Every test uses a random, test-prefixed database. Never touches the real "runo". */
export function setupTestDatabase() {
  const connections: RunoDatabase[] = [];
  afterEach(async () => {
    vi.unstubAllGlobals();
    const byName = new Map(connections.map((db) => [db.name, db]));
    for (const db of connections) db.close();
    for (const db of byName.values()) await db.delete();
    connections.length = 0;
  });
  return async (name = `runo-test-${crypto.randomUUID()}`) => {
    if (!name.startsWith("runo-test-")) throw new Error("Unsafe test database name.");
    const db = await openDatabase(name);
    connections.push(db);
    return db;
  };
}
