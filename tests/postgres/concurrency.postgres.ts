import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { boundedTransaction, postgresCode } from "@/lib/db/transaction";
import { createRateLimitStore } from "@/lib/security/rate-limit-store";
import { mutateAccountData, readAccountData } from "@/lib/sync/server-repository";
import type { Mutation } from "@/lib/sync/protocol";
import type { Pending, Settings } from "@/lib/domain/types";
import { localPostgresTestTarget } from "./target";

vi.mock("server-only", () => ({}));
let pool: Pool;
let database: NodePgDatabase<typeof schema>;
beforeAll(async () => {
  const connectionString = localPostgresTestTarget(
    process.env.AVO_TEST_DATABASE_URL,
    process.env.AVO_ALLOW_LOCAL_POSTGRES_TESTS,
  );
  pool = new Pool({
    connectionString,
    max: 8,
    connectionTimeoutMillis: 3_000,
    application_name: "avo-local-concurrency-tests",
  });
  pool.on("error", () => {
    console.error("Disposable PostgreSQL connection unavailable");
  });
  const existing = await pool.query(
    "select tablename from pg_tables where schemaname not like 'pg_%' and schemaname <> 'information_schema'",
  );
  // Refuse reused/nonempty targets rather than wiping tables to get green tests.
  if (existing.rows.length)
    throw new Error(
      "Integration suite requires a fresh empty disposable database; no cleanup was performed.",
    );
  database = drizzle(pool, { schema });
  await migrate(database, { migrationsFolder: "./drizzle" });
});
beforeEach(async () => {
  await database.delete(schema.rateLimits);
});
afterAll(async () => {
  if (pool) await pool.end();
});

function store(now?: () => number) {
  return createRateLimitStore({
    database,
    secret: "synthetic-local-multi-connection",
    ...(now ? { now } : {}),
  });
}
async function identity(): Promise<string> {
  const id = `avo-test-${randomUUID()}`;
  await database.insert(schema.authUsers).values({ id, name: "Synthetic", email: `${id}@example.test` });
  return id;
}
function pending(title: string): Pending {
  return { id: "p", title, durationMin: 25, createdAt: 1, updatedAt: 1, completedAt: null, deletedAt: null };
}
function preferences(theme: "light" | "dark"): Settings {
  return {
    id: "preferences",
    audioEnabled: false,
    sound: "brown",
    maxTone: 2,
    theme,
    showWallet: false,
    locale: "es",
    taskOrder: {},
    updatedAt: 1,
  };
}
function mutation(kind: Mutation["kind"], value: Mutation["value"], baseRevision = 0): Mutation {
  return { kind, value, id: value.id, operationId: randomUUID(), baseRevision };
}

/** Instrument transport timing, not SQL results or the DAL under review. */
function interleavedReader(onTasksRead: () => Promise<void>): NodePgDatabase<typeof schema> {
  let observed = false;
  function instrument(client: PoolClient): PoolClient {
    return new Proxy(client, {
      get(target, property) {
        if (property === "query")
          return async (...args: unknown[]) => {
            const result: unknown = await Reflect.apply(target.query, target, args);
            const input = args[0];
            const text =
              typeof input === "string"
                ? input
                : input && typeof input === "object" && "text" in input
                  ? String(input.text)
                  : "";
            if (!observed && text.includes('from "runo_tasks"')) {
              observed = true;
              await onTasksRead();
            }
            return result;
          };
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  const connection = new Proxy(pool, {
    get(target, property) {
      if (property === "connect") return async () => instrument(await target.connect());
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return drizzle(connection, { schema });
}

describe("independent PostgreSQL sessions — explicit disposable local target only", () => {
  it("enforces one quota across simultaneous connections and never updates saturated tuples", async () => {
    const held = await Promise.all(Array.from({ length: 4 }, () => pool.connect()));
    const identities = await Promise.all(
      held.map(
        async (client) => (await client.query<{ id: number }>("select pg_backend_pid() as id")).rows[0]?.id,
      ),
    );
    expect(new Set(identities).size).toBe(4);
    held.forEach((client) => client.release());
    const first = store(),
      second = store();
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        (i % 2 ? first : second).consume("shared", { window: 60, max: 7 }),
      ),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(7);
    const before = await pool.query<{ version: string; count: number }>(
      "select xmin::text as version, count from runo_rate_limits",
    );
    await Promise.all(Array.from({ length: 8 }, () => first.consume("shared", { window: 60, max: 7 })));
    expect((await pool.query("select xmin::text as version, count from runo_rate_limits")).rows).toEqual(
      before.rows,
    );
    expect(before.rows[0]?.count).toBe(7);
  });
  it("resets an expired quota exactly once under contention", async () => {
    const first = store(),
      second = store();
    await first.consume("reset", { window: 60, max: 3 });
    await database
      .update(schema.rateLimits)
      .set({ expiresAt: sql`statement_timestamp() - interval '1 second'` });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => (i % 2 ? first : second).consume("reset", { window: 60, max: 3 })),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect((await database.select().from(schema.rateLimits))[0]?.count).toBe(3);
  });
  it("prunes without blocking a locked expired row, then removes it on later eligible traffic", async () => {
    let clock = 0;
    const first = store(() => clock);
    await first.consume("expired", { window: 60, max: 10 });
    const [old] = await database.select().from(schema.rateLimits);
    await database
      .update(schema.rateLimits)
      .set({ expiresAt: sql`statement_timestamp() - interval '1 second'` });
    const lock = await pool.connect();
    await lock.query("begin");
    try {
      await lock.query("select key from runo_rate_limits where key = $1 for update", [old.key]);
      clock = 60_000;
      expect((await first.consume("healthy", { window: 60, max: 10 })).allowed).toBe(true);
      expect(
        await database.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, old.key)),
      ).toHaveLength(1);
    } finally {
      await lock.query("rollback");
      lock.release();
    }
    clock += 60_000;
    await first.consume("healthy", { window: 60, max: 10 });
    expect(
      await database.select().from(schema.rateLimits).where(eq(schema.rateLimits.key, old.key)),
    ).toHaveLength(0);
  });
  it("cancels SQL/lock waits and does not leak local budgets to reused sessions", async () => {
    const before = await pool.query("show statement_timeout");
    let statementError: unknown;
    try {
      await boundedTransaction({
        database,
        budget: { statementMs: 100, lockMs: 50 },
        work: async (tx) => {
          await tx.execute(sql`select pg_sleep(1)`);
        },
      });
    } catch (error) {
      statementError = error;
    }
    expect(postgresCode(statementError)).toBe("57014");
    await store().consume("locked", { window: 60, max: 1 });
    const lock = await pool.connect();
    await lock.query("begin");
    try {
      await lock.query("select key from runo_rate_limits for update");
      let lockError: unknown;
      try {
        await boundedTransaction({
          database,
          budget: { statementMs: 200, lockMs: 50 },
          work: async (tx) => {
            await tx.update(schema.rateLimits).set({ count: 2 });
          },
        });
      } catch (error) {
        lockError = error;
      }
      expect(postgresCode(lockError)).toBe("55P03");
    } finally {
      await lock.query("rollback");
      lock.release();
    }
    const held = await Promise.all(Array.from({ length: 8 }, () => pool.connect()));
    try {
      for (const client of held)
        expect((await client.query("show statement_timeout")).rows).toEqual(before.rows);
    } finally {
      held.forEach((client) => client.release());
    }
  });
  it("reads one pre-batch snapshot even when another connection commits between SELECTs", async () => {
    const id = await identity();
    await mutateAccountData(database, id, [
      mutation("pending", pending("Before")),
      mutation("settings", preferences("light")),
    ]);
    const baseline = await readAccountData(database, id);
    const reader = interleavedReader(async () => {
      await mutateAccountData(database, id, [
        mutation("pending", pending("After"), 1),
        mutation("settings", preferences("dark"), 1),
      ]);
    });
    const snapshot = await readAccountData(reader, id);
    expect(snapshot.etag).toBe(baseline.etag);
    expect(snapshot.records.find((row) => row.kind === "pending")?.value).toMatchObject({ title: "Before" });
    expect(snapshot.records.find((row) => row.kind === "settings")?.value).toMatchObject({ theme: "light" });
    expect((await readAccountData(database, id)).etag).not.toBe(snapshot.etag);
  });
  it("retries concurrent lazy owner/version creation without duplicate domain identities", async () => {
    const id = await identity();
    const snapshots = await Promise.all([readAccountData(database, id), readAccountData(database, id)]);
    expect(snapshots[0]?.etag).toBe(snapshots[1]?.etag);
    expect(await database.select().from(schema.users).where(eq(schema.users.authUserId, id))).toHaveLength(1);
  });
});
