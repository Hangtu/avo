import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import {
  accountStage,
  logAccountFailure,
  withAccountDiagnostics,
} from "@/lib/observability/account-diagnostics";
import { createRateLimitStore } from "@/lib/security/rate-limit-store";
import { readAccountData } from "@/lib/sync/server-repository";

vi.mock("server-only", () => ({}));
const pg = new PGlite();
const database = drizzle(pg, { schema });
const authId = "synthetic-diagnostics-account";
beforeAll(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  await database.insert(schema.authUsers).values({
    id: authId,
    name: "Synthetic",
    email: "diagnostics@example.test",
    emailVerified: true,
  });
  await readAccountData(database, authId);
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => pg.close());

async function diagnose(work: () => Promise<unknown>) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const response = await withAccountDiagnostics("account.data.get", async () => {
    try {
      await work();
      return new Response(null, { status: 204 });
    } catch (error) {
      logAccountFailure(error);
      return Response.json({ error: "temporarily_unavailable" }, { status: 503 });
    }
  });
  expect(response.status).toBe(503);
  expect(console.error).toHaveBeenCalledTimes(1);
  const line = vi.mocked(console.error).mock.calls[0][0] as string;
  expect(line).not.toContain(authId);
  expect(line).not.toContain("diagnostics@example.test");
  expect(line).not.toContain("select ");
  expect(line).not.toContain("synthetic-private");
  return JSON.parse(line);
}

describe("diagnostics with real SQL errors — isolated in-memory PGlite, no Neon", () => {
  it.each([
    ["runo_users", "auth_user_id", "account.owner", 1],
    ["runo_tasks", "revision", "account.snapshot_version", 1],
    ["runo_tasks", "title", "account.tasks", 1],
    ["runo_pendings", "title", "account.pendings", 1],
    ["runo_settings", "audio_enabled", "account.preferences", 1],
    ["runo_routines", "revision", "account.snapshot_version", 2],
    ["runo_routines", "title", "account.routines", 2],
  ] as const)("identifies %s.%s failures at %s with protocol v%s", async (table, column, stage, version) => {
    // Fixed test literals only; these mutations affect this disposable PGlite instance.
    await pg.exec(`alter table ${table} rename column ${column} to diagnostics_hidden_column`);
    try {
      const event = await diagnose(() =>
        accountStage("account.read", () => readAccountData(database, authId, undefined, version)),
      );
      expect(event).toMatchObject({ stage, stagePath: ["account.read", stage], errorCodes: ["42703"] });
    } finally {
      await pg.exec(`alter table ${table} rename column diagnostics_hidden_column to ${column}`);
    }
  });

  it("distinguishes limiter consumption from session/account persistence", async () => {
    const store = createRateLimitStore({ database, secret: "synthetic-diagnostics-secret" });
    await pg.exec("alter table runo_rate_limits rename to diagnostics_hidden_limits");
    try {
      const event = await diagnose(() =>
        accountStage("rate_limit.ip", () => store.consume("synthetic-private-key", { window: 60, max: 10 })),
      );
      expect(event).toMatchObject({
        stage: "rate_limit.consume",
        stagePath: ["rate_limit.ip", "rate_limit.consume"],
        errorCodes: ["42P01"],
      });
    } finally {
      await pg.exec("alter table diagnostics_hidden_limits rename to runo_rate_limits");
    }
  });

  it("identifies an accepted-request cleanup error separately from consumption", async () => {
    const store = createRateLimitStore({ database, secret: "synthetic-diagnostics-cleanup" });
    await pg.exec(`
      create function diagnostics_reject_cleanup() returns trigger language plpgsql as $$
      begin raise exception 'synthetic-private-cleanup-details' using errcode = '42501'; end $$;
      create trigger diagnostics_cleanup_failure before delete on runo_rate_limits
      for each statement execute function diagnostics_reject_cleanup();
    `);
    try {
      const event = await diagnose(() =>
        accountStage("rate_limit.ip", () => store.consume("synthetic-private-key", { window: 60, max: 10 })),
      );
      expect(event).toMatchObject({
        stage: "rate_limit.cleanup",
        stagePath: ["rate_limit.ip", "rate_limit.cleanup"],
        errorCodes: ["42501"],
      });
    } finally {
      await pg.exec(`
        drop trigger diagnostics_cleanup_failure on runo_rate_limits;
        drop function diagnostics_reject_cleanup();
      `);
    }
  });
});
