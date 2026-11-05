import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { boundedAuthAdapter } from "./auth-adapter";
import { boundedTransaction, postgresCode } from "./transaction";
vi.mock("server-only", () => ({}));
const pg = new PGlite();
const queries: string[] = [];
const database = drizzle(pg, {
  schema,
  logger: {
    logQuery: (query) => {
      queries.push(query);
    },
  },
});
beforeAll(async () => {
  await pg.exec("create table avo_test_budget (id integer primary key)");
});
afterAll(() => pg.close());
describe("transaction-local SQL budgets", () => {
  it("sets the bounds before work and resets them after commit and rollback", async () => {
    const before = await database.execute<{ setting: string }>(
      sql`select current_setting('statement_timeout') as setting`,
    );
    await boundedTransaction({
      database,
      work: async (tx) => {
        const result = await tx
          .select({
            statement: sql<string>`current_setting('statement_timeout')`,
            lock: sql<string>`current_setting('lock_timeout')`,
          })
          .from(sql`(values (1)) as budget_probe(value)`);
        expect(result[0]).toEqual({ statement: "4s", lock: "1s" });
      },
    });
    expect(
      (
        await database.execute<{ setting: string }>(
          sql`select current_setting('statement_timeout') as setting`,
        )
      ).rows,
    ).toEqual(before.rows);
    await expect(
      boundedTransaction({
        database,
        work: async (tx) => {
          await tx.execute(sql`insert into avo_test_budget values (1)`);
          throw new Error("synthetic rollback");
        },
      }),
    ).rejects.toThrow("synthetic rollback");
    expect(
      (await database.execute<{ count: number }>(sql`select count(*)::int as count from avo_test_budget`))
        .rows[0]?.count,
    ).toBe(0);
    expect(
      (
        await database.execute<{ setting: string }>(
          sql`select current_setting('statement_timeout') as setting`,
        )
      ).rows,
    ).toEqual(before.rows);
  });
  it("requests repeatable-read and retries only aborted serialization/deadlock work", async () => {
    queries.length = 0;
    let attempts = 0;
    await boundedTransaction({
      database,
      isolationLevel: "repeatable read",
      retries: 2,
      work: async () => {
        if (++attempts < 3) throw Object.assign(new Error("synthetic conflict"), { code: "40001" });
      },
    });
    expect(attempts).toBe(3);
    expect(queries.filter((query) => query.includes("isolation level repeatable read"))).toHaveLength(3);
    const work = vi.fn(async () => {
      throw Object.assign(new Error("ambiguous connection failure"), { code: "08006" });
    });
    await expect(boundedTransaction({ database, retries: 2, work })).rejects.toThrow(
      "ambiguous connection failure",
    );
    expect(work).toHaveBeenCalledTimes(1);
    expect(postgresCode({ cause: { cause: { code: "55P03" } } })).toBe("55P03");
  });
  it("bounds auth adapter operations before the first persistence query", async () => {
    // The real full-schema adapter exercises the same budget wrapper even on a
    // missing table: rollback must happen and no unbounded fallback is allowed.
    const adapter = boundedAuthAdapter(database, { provider: "pg", schema: { user: schema.authUsers } })({});
    queries.length = 0;
    await expect(
      adapter.findOne({ model: "user", where: [{ field: "id", value: "synthetic" }] }),
    ).rejects.toThrow();
    const budget = queries.findIndex((query) => query.includes("set_config"));
    const persistence = queries.findIndex((query) => query.includes('from "runo_auth_users"'));
    expect(budget).toBeGreaterThanOrEqual(0);
    expect(persistence).toBeGreaterThan(budget);
  });
});
