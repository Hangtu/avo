import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runMigrationCommand, type MigrationEvent } from "@/lib/db/migration-runner";

vi.mock("server-only", () => ({}));
let directory: string;
let events: MigrationEvent[];
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "avo-runner-pglite-"));
  cpSync("drizzle", join(directory, "drizzle"), { recursive: true });
  writeFileSync(
    join(directory, ".env.prod"),
    "DATABASE_URL_UNPOOLED=postgresql://synthetic_user:synthetic_password@never-connect.example.invalid/db\n",
  );
  events = [];
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

async function inspect(pg: PGlite) {
  const journal = await pg.query<{ hash: string; created_at: number }>(
    "select hash, created_at::float8 from drizzle.__drizzle_migrations order by created_at",
  );
  const schema = await pg.query<{ routines: string | null; tasks: string | null }>(
    "select to_regclass('public.runo_routines')::text as routines, to_regclass('public.runo_tasks')::text as tasks",
  );
  return { journal: journal.rows, schema: schema.rows[0] };
}

async function run() {
  let snapshot: Awaited<ReturnType<typeof inspect>> | undefined;
  let closed = false;
  const code = await runMigrationCommand({
    args: ["production"],
    directory,
    variables: {},
    write: (event) => events.push(event),
    // Database boundary only: real SQL and Drizzle migration semantics, no pg/TCP/Neon.
    connectionFactory: () => {
      const pg = new PGlite(join(directory, "synthetic-data"));
      return {
        connect: async () => {
          await pg.waitReady;
        },
        migrate: (migrationsFolder) => migrate(drizzle(pg), { migrationsFolder }),
        close: async () => {
          try {
            snapshot = await inspect(pg);
          } finally {
            await pg.close();
            closed = true;
          }
        },
      };
    },
  });
  expect(closed).toBe(true);
  return { code, snapshot };
}

function expectedJournal() {
  return readMigrationFiles({ migrationsFolder: join(directory, "drizzle") }).map((migration) => ({
    hash: migration.hash,
    created_at: migration.folderMillis,
  }));
}

describe("migration runner with disposable PGlite — not a Neon/TCP migration", () => {
  it("applies all six unchanged repository migrations and preserves journal hashes/timestamps on repetition", async () => {
    const expected = expectedJournal();
    const first = await run();
    expect(first.code).toBe(0);
    expect(first.snapshot).toEqual({
      journal: expected,
      schema: { routines: "runo_routines", tasks: "runo_tasks" },
    });
    const repeated = await run();
    expect(repeated.code).toBe(0);
    expect(repeated.snapshot).toEqual(first.snapshot);
    expect(events.filter((event) => event.event === "migration_completed")).toHaveLength(2);
    expect(events.filter((event) => event.event === "migration_failed")).toHaveLength(0);
  }, 15_000);

  it("reports a real nested 42P01 without private SQL and rolls back pending migrations/journal", async () => {
    appendFileSync(
      join(directory, "drizzle", "0005_orange_jack_flag.sql"),
      "\n--> statement-breakpoint\nselect 'synthetic-private-value' from synthetic_private_missing_relation;\n",
    );
    const result = await run();
    expect(result.code).toBe(1);
    expect(result.snapshot).toEqual({ journal: [], schema: { routines: null, tasks: null } });
    expect(events.filter((event) => event.event === "migration_failed")).toEqual([
      expect.objectContaining({ stage: "apply", errorCodes: ["42P01"] }),
    ]);
    expect(events.some((event) => event.event === "migration_completed")).toBe(false);
    for (const secret of [
      "synthetic_private",
      "synthetic-private",
      "select ",
      "password",
      "example.invalid",
    ]) {
      expect(JSON.stringify(events)).not.toContain(secret);
    }
  }, 15_000);

  it("preserves already-applied journal entries when a later pending migration fails", async () => {
    // First run establishes the actual six-entry journal; only the disposable copy is extended.
    const first = await run();
    expect(first.code).toBe(0);
    const journalPath = join(directory, "drizzle", "meta", "_journal.json");
    const journal = z
      .object({
        version: z.string(),
        dialect: z.literal("postgresql"),
        entries: z.array(
          z.object({
            idx: z.number(),
            version: z.string(),
            when: z.number(),
            tag: z.string(),
            breakpoints: z.boolean(),
          }),
        ),
      })
      .parse(JSON.parse(readFileSync(journalPath, "utf8")));
    journal.entries.push({
      idx: journal.entries.length,
      version: "7",
      when: Math.max(...journal.entries.map((m) => m.when)) + 1,
      tag: "0006_synthetic_failure",
      breakpoints: true,
    });
    writeFileSync(journalPath, JSON.stringify(journal));
    writeFileSync(
      join(directory, "drizzle", "0006_synthetic_failure.sql"),
      "create table synthetic_private_rollback (id int);\n--> statement-breakpoint\nselect * from synthetic_private_missing_relation;",
    );
    const failed = await run();
    expect(failed.code).toBe(1);
    expect(failed.snapshot).toEqual(first.snapshot);
    expect(events.at(-1)).toMatchObject({ event: "migration_failed", stage: "apply", errorCodes: ["42P01"] });
  }, 15_000);
});
