import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig, type AnyPgColumn } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { rowsForSnapshot } from "@/lib/cloud/snapshot";
import { accountSnapshot } from "@/tests/account-snapshot";
import * as schema from "./schema";

// Run the real cloud repository against local PostgreSQL/WASM, not Neon or a
// mocked transaction engine. Only the server-only guard/connection are replaced.
const client = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ get db() { return client.db; } }));

const sqlFile = (name: string) => readFileSync(new URL(`../../drizzle/${name}`, import.meta.url), "utf8");
const initialSQL = sqlFile("0000_yellow_zodiak.sql");
const soundsSQL = sqlFile("0001_zippy_sentinel.sql");
const authSQL = sqlFile("0002_dry_lethal_legion.sql");
const accountSQL = sqlFile("0003_account_spaces.sql");
const authTables = [schema.authUsers, schema.authSessions, schema.authAccounts, schema.authVerifications];
const domainTables = [schema.users, schema.tasks, schema.pendings, schema.days, schema.hands,
  schema.occurrences, schema.handItems, schema.sessions, schema.events, schema.ledger,
  schema.settings, schema.metadata];

async function initialize(pg: PGlite) {
  await pg.exec(initialSQL);
  await pg.exec(soundsSQL);
  await pg.exec(authSQL);
  // An account/session introduced by main must survive 0003 unchanged.
  await pg.exec(`
    INSERT INTO runo_auth_users (id, name, email, email_verified) VALUES ('existing-auth', 'Existing', 'existing@example.test', true);
    INSERT INTO runo_users (id) VALUES ('existing-auth');
    INSERT INTO runo_auth_accounts (id, account_id, provider_id, user_id) VALUES ('existing-facebook', 'existing-provider-id', 'facebook', 'existing-auth');
    INSERT INTO runo_auth_sessions (id, token, expires_at, user_id) VALUES ('existing-session', 'synthetic-never-real-token', '2027-01-01T00:00:00Z', 'existing-auth');
  `);
}

async function migrate(pg: PGlite, sql = accountSQL) {
  await pg.exec("BEGIN");
  try {
    await pg.exec(sql);
    await pg.exec("COMMIT");
  } catch (error) {
    await pg.exec("ROLLBACK");
    throw error;
  }
}

/** Fixture insertion in the pre-E4 schema, using only columns that existed then. */
async function seedLegacy(pg: PGlite) {
  const rows = rowsForSnapshot(accountSnapshot("Synthetic legacy data"), "legacy-owner", "America/Mexico_City");
  const groups = [
    [schema.users, [rows.user]], [schema.tasks, rows.tasks], [schema.pendings, rows.pendings],
    [schema.days, rows.days], [schema.hands, rows.hands], [schema.occurrences, rows.occurrences],
    [schema.handItems, rows.handItems], [schema.sessions, rows.sessions], [schema.events, rows.events],
    [schema.ledger, rows.ledger], [schema.settings, [rows.settings]], [schema.metadata, rows.metadata],
  ] as const;
  for (const [table, records] of groups) {
    const name = getTableConfig(table).name;
    const existing = await pg.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [name],
    );
    const allowed = new Set(existing.rows.map((row) => row.column_name));
    const columns: Record<string, AnyPgColumn> = getTableColumns(table);
    for (const row of records) {
      const values = Object.entries(row).flatMap(([key, value]) => {
        const column = columns[key];
        return column && value !== undefined && allowed.has(column.name) ? [{ column, value }] : [];
      });
      await pg.query(
        `INSERT INTO "${name}" (${values.map(({ column }) => `"${column.name}"`).join(", ")}) VALUES (${values.map((_, i) => `$${i + 1}`).join(", ")})`,
        values.map(({ column, value }) => value === null ? null : column.mapToDriverValue(value)),
      );
    }
  }
}

type LegacyColumns = Record<string, string[]>;
async function legacyColumns(pg: PGlite): Promise<LegacyColumns> {
  const result: LegacyColumns = {};
  for (const table of domainTables) {
    const name = getTableConfig(table).name;
    const columns = await pg.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position", [name],
    );
    result[name] = columns.rows.map((column) => column.column_name);
  }
  return result;
}

async function captureLegacy(pg: PGlite, columns: LegacyColumns) {
  const result: Record<string, unknown> = {};
  for (const [name, keys] of Object.entries(columns)) {
    result[name] = (await pg.query(`SELECT ${keys.map((key) => `"${key}"`).join(", ")} FROM "${name}" ORDER BY 1, 2`)).rows;
  }
  return result;
}

async function captureOwner(pg: PGlite, owner: string) {
  const result: Record<string, unknown> = {};
  for (const table of domainTables) {
    const name = getTableConfig(table).name;
    const key = table === schema.users ? "id" : "user_id";
    result[name] = (await pg.query(`SELECT to_jsonb(t) AS row FROM "${name}" t WHERE "${key}" = $1 ORDER BY 1`, [owner])).rows;
  }
  return result;
}

async function captureAuth(pg: PGlite) {
  const result: Record<string, unknown> = {};
  for (const table of authTables) {
    const name = getTableConfig(table).name;
    result[name] = (await pg.query(`SELECT * FROM "${name}" ORDER BY id`)).rows;
  }
  return result;
}

async function expectNoPartialMigration(pg: PGlite) {
  const tables = await pg.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'runo_auth_%' ORDER BY tablename");
  expect(tables.rows).toEqual(authTables.map((table) => ({ tablename: getTableConfig(table).name })).sort((a, b) => a.tablename.localeCompare(b.tablename)));
  const indexes = await pg.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'runo_auth_users_email_normalized_idx'");
  expect(indexes.rows).toEqual([]);
  const columns = await pg.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'runo_hand_items' AND column_name = 'user_id'");
  expect(columns.rows).toEqual([]);
}

describe("E4.2 migration and repository isolation — local PostgreSQL/WASM, not Neon", () => {
  let pg: PGlite;
  let cloud: typeof import("@/lib/cloud/repository");
  let columns: LegacyColumns;
  let original: Record<string, unknown>;
  let originalAuth: Record<string, unknown>;
  beforeAll(async () => {
    pg = new PGlite();
    await initialize(pg);
    await seedLegacy(pg);
    columns = await legacyColumns(pg);
    original = await captureLegacy(pg, columns);
    originalAuth = await captureAuth(pg);
    await migrate(pg);
    client.db = drizzle(pg, { schema });
    cloud = await import("@/lib/cloud/repository");
  }, 30_000);
  afterAll(async () => { await pg?.close(); });

  it("preserves all legacy columns/rows and backfills join ownership without adopting owner", async () => {
    expect(await captureLegacy(pg, columns)).toEqual(original);
    const user = await pg.query("SELECT auth_user_id FROM runo_users WHERE id = 'legacy-owner'");
    expect(user.rows).toEqual([{ auth_user_id: null }]);
    const items = await pg.query("SELECT DISTINCT user_id FROM runo_hand_items");
    expect(items.rows).toEqual([{ user_id: "legacy-owner" }]);
    expect(await captureAuth(pg)).toEqual(originalAuth);
  });

  it("backs up/replaces/deletes A with the same IDs as B without touching B or legacy", async () => {
    const legacyBefore = await captureOwner(pg, "legacy-owner");
    await cloud.replaceRemoteSnapshot(accountSnapshot("A"), "account-A", "America/Mexico_City");
    await cloud.replaceRemoteSnapshot(accountSnapshot("B"), "account-B", "America/Mexico_City");
    const before = await captureOwner(pg, "account-B");
    expect((await pg.query("SELECT user_id, title FROM runo_tasks WHERE id = 'seed:coffee' ORDER BY user_id")).rows)
      .toEqual([{ user_id: "account-A", title: "A" }, { user_id: "account-B", title: "B" }, { user_id: "legacy-owner", title: "Synthetic legacy data" }]);
    await cloud.replaceRemoteSnapshot(accountSnapshot("A edited"), "account-A", "America/Mexico_City");
    expect(await captureOwner(pg, "account-B")).toEqual(before);
    await cloud.deleteRemoteSnapshot("account-A");
    expect(await captureOwner(pg, "account-B")).toEqual(before);
    expect(Object.values(await captureOwner(pg, "account-A")).every((rows) => Array.isArray(rows) && rows.length === 0)).toBe(true);
    expect(await captureOwner(pg, "legacy-owner")).toEqual(legacyBefore);
  });

  it("rejects cross-account session, hand-item and ledger foreign keys", async () => {
    await cloud.replaceRemoteSnapshot(accountSnapshot("C"), "account-C", "America/Mexico_City");
    await cloud.replaceRemoteSnapshot(accountSnapshot("D"), "account-D", "America/Mexico_City");
    await pg.exec(`
      INSERT INTO runo_occurrences (user_id, id, task_id, date) VALUES ('account-D', 'D-only-occurrence', 'quick:D', '2026-10-26');
      INSERT INTO runo_hands (user_id, id, date, ordinal) VALUES ('account-D', 'D-only-hand', '2026-10-26', 2);
      INSERT INTO runo_pendings (user_id, id, title, duration_min) VALUES ('account-D', 'D-only-pending', 'D', 25);
    `);
    for (const query of [
      "UPDATE runo_sessions SET occurrence_id = 'D-only-occurrence' WHERE user_id = 'account-C'",
      "UPDATE runo_sessions SET hand_id = 'D-only-hand' WHERE user_id = 'account-C'",
      "UPDATE runo_sessions SET pending_id = 'D-only-pending' WHERE user_id = 'account-C'",
      "INSERT INTO runo_hand_items (user_id, hand_id, occurrence_id, state) VALUES ('account-C', 'hand:same', 'D-only-occurrence', 'deferred')",
      "INSERT INTO runo_hand_items (user_id, hand_id, occurrence_id, state) VALUES ('account-C', 'D-only-hand', 'occurrence:same', 'deferred')",
      "UPDATE runo_ledger SET occurrence_id = 'D-only-occurrence' WHERE user_id = 'account-C'",
    ]) await expect(pg.exec(query)).rejects.toMatchObject({ code: "23503" });
  });

  it("enforces normalized-email, provider-identity and internal-account mapping uniqueness", async () => {
    await pg.exec(`
      INSERT INTO runo_auth_users (id, name, email, email_verified) VALUES ('auth-A', 'A', 'Person@example.test', true), ('auth-B', 'B', 'other@example.test', true);
      INSERT INTO runo_auth_accounts (id, account_id, provider_id, user_id, updated_at) VALUES ('provider-A', 'stable-provider-id', 'google', 'auth-A', now());
      INSERT INTO runo_users (id, auth_user_id) VALUES ('internal-A', 'auth-A');
    `);
    await expect(pg.exec("INSERT INTO runo_auth_users (id, name, email) VALUES ('auth-duplicate', 'Duplicate', ' person@EXAMPLE.TEST ')")).rejects.toMatchObject({ code: "23505" });
    await expect(pg.exec("INSERT INTO runo_auth_accounts (id, account_id, provider_id, user_id, updated_at) VALUES ('provider-duplicate', 'stable-provider-id', 'google', 'auth-B', now())")).rejects.toMatchObject({ code: "23505" });
    await expect(pg.exec("INSERT INTO runo_users (id, auth_user_id) VALUES ('another-internal-A', 'auth-A')")).rejects.toMatchObject({ code: "23505" });
    // IDs from different providers are not interchangeable identities.
    await pg.exec("INSERT INTO runo_auth_accounts (id, account_id, provider_id, user_id, updated_at) VALUES ('provider-B', 'stable-provider-id', 'facebook', 'auth-B', now())");
    // Default auth deletion cannot silently bypass domain-account cleanup.
    await expect(pg.exec("DELETE FROM runo_auth_users WHERE id = 'auth-A'")).rejects.toMatchObject({ code: "23001" });
  });

  it("rolls back rather than repairing/reassigning legacy cross-owner rows", async () => {
    const isolated = new PGlite();
    try {
      await initialize(isolated);
      await seedLegacy(isolated);
      await isolated.exec(`
        INSERT INTO runo_users (id) VALUES ('different-legacy-owner');
        INSERT INTO runo_occurrences (id, user_id, task_id, date) VALUES ('cross-owner', 'different-legacy-owner', 'quick:other', '2026-10-26');
        UPDATE runo_hand_items SET occurrence_id = 'cross-owner' WHERE state = 'active';
      `);
      const before = await captureLegacy(isolated, columns);
      const authBefore = await captureAuth(isolated);
      await expect(migrate(isolated)).rejects.toThrow(/cross-owner/);
      expect(await captureLegacy(isolated, columns)).toEqual(before);
      expect(await captureAuth(isolated)).toEqual(authBefore);
      await expectNoPartialMigration(isolated);
    } finally { await isolated.close(); }
  }, 30_000);

  it("rolls back without merging or deleting existing main accounts with colliding normalized emails", async () => {
    const isolated = new PGlite();
    try {
      await initialize(isolated);
      await seedLegacy(isolated);
      await isolated.exec("INSERT INTO runo_auth_users (id, name, email) VALUES ('existing-case-variant', 'Other', 'EXISTING@example.test')");
      const before = await captureLegacy(isolated, columns);
      const authBefore = await captureAuth(isolated);
      await expect(migrate(isolated)).rejects.toMatchObject({ code: "23505" });
      expect(await captureLegacy(isolated, columns)).toEqual(before);
      expect(await captureAuth(isolated)).toEqual(authBefore);
      await expectNoPartialMigration(isolated);
    } finally { await isolated.close(); }
  }, 30_000);

  it("recovers the original data and schema when execution fails after the new constraints", async () => {
    const isolated = new PGlite();
    try {
      await initialize(isolated);
      await seedLegacy(isolated);
      const before = await captureLegacy(isolated, columns);
      const authBefore = await captureAuth(isolated);
      await expect(migrate(isolated, `${accountSQL}\nSELECT 1 / 0;`)).rejects.toThrow(/division by zero/);
      expect(await captureLegacy(isolated, columns)).toEqual(before);
      expect(await captureAuth(isolated)).toEqual(authBefore);
      await expectNoPartialMigration(isolated);
    } finally { await isolated.close(); }
  }, 30_000);
});
