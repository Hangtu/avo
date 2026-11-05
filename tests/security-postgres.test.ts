import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { createRateLimitStore } from "@/lib/security/rate-limit-store";

vi.mock("server-only", () => ({}));
const pg = new PGlite();
const trace: string[] = [];
const remote = drizzle(pg, {
  schema,
  logger: {
    logQuery: (query) => {
      trace.push(query);
    },
  },
});
const first = createRateLimitStore({ database: remote, secret: "synthetic-test-key" });
const second = createRateLimitStore({ database: remote, secret: "synthetic-test-key" });
let auth: (typeof import("@/lib/auth"))["auth"];

beforeAll(async () => {
  await migrate(remote, { migrationsFolder: "./drizzle" });
  vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@127.0.0.1:5432/synthetic");
  vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-security-test-key-never-production-123456789");
  vi.stubEnv("BETTER_AUTH_URL", "https://avo.example.test");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-google-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "synthetic-google-secret");
  vi.stubEnv("FACEBOOK_CLIENT_ID", undefined);
  vi.stubEnv("FACEBOOK_CLIENT_SECRET", undefined);
  vi.doMock("@/lib/db/client", () => ({ db: remote }));
  auth = (await import("@/lib/auth")).auth;
});
beforeEach(async () => {
  await remote.delete(schema.rateLimits);
  trace.length = 0;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/db/client");
  await pg.close();
});

describe("shared Postgres abuse counters — in-memory PGlite, no Neon", () => {
  it("does not let concurrent stores exceed one shared budget", async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        (i % 2 ? first : second).consume("concurrent", { window: 60, max: 7 }),
      ),
    );
    expect(results.filter((row) => row.allowed)).toHaveLength(7);
    expect(
      results.filter((row) => !row.allowed).every((row) => row.retryAfter! >= 1 && row.retryAfter! <= 60),
    ).toBe(true);
  });
  it("does not update the tuple/count or prune on saturated denials", async () => {
    const store = createRateLimitStore({ database: remote, secret: "synthetic-noop" });
    await store.consume("saturated", { window: 60, max: 1 });
    const before = (
      await remote.execute<{ version: string }>(sql`select xmin::text as version from runo_rate_limits`)
    ).rows;
    trace.length = 0;
    for (let i = 0; i < 5; i++)
      expect((await store.consume("saturated", { window: 60, max: 1 })).allowed).toBe(false);
    expect((await remote.select().from(schema.rateLimits))[0]?.count).toBe(1);
    expect(
      (await remote.execute<{ version: string }>(sql`select xmin::text as version from runo_rate_limits`))
        .rows,
    ).toEqual(before);
    expect(trace.some((query) => query.startsWith('delete from "runo_rate_limits"'))).toBe(false);
  });
  it("paces accepted-request cleanup independently of shared quota decisions", async () => {
    let clock = 1_000;
    const store = createRateLimitStore({ database: remote, secret: "synthetic-cleanup", now: () => clock });
    await store.consume("old", { window: 60, max: 10 });
    await remote
      .update(schema.rateLimits)
      .set({ expiresAt: sql`statement_timestamp() - interval '1 second'` });
    trace.length = 0;
    await store.consume("new", { window: 60, max: 10 });
    expect(await remote.select().from(schema.rateLimits)).toHaveLength(2);
    expect(trace.some((query) => query.startsWith('delete from "runo_rate_limits"'))).toBe(false);
    clock += 60_000;
    await store.consume("new", { window: 60, max: 10 });
    expect(await remote.select().from(schema.rateLimits)).toHaveLength(1);
    expect(trace.filter((query) => query.startsWith('delete from "runo_rate_limits"'))).toHaveLength(1);
  });
  it("keeps keys isolated and never stores plaintext identifiers", async () => {
    expect((await first.consume("account:read:synthetic-A", { window: 60, max: 1 })).allowed).toBe(true);
    expect((await second.consume("account:read:synthetic-A", { window: 60, max: 1 })).allowed).toBe(false);
    expect((await second.consume("account:read:synthetic-B", { window: 60, max: 1 })).allowed).toBe(true);
    const rows = await remote.select().from(schema.rateLimits);
    expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.key))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("synthetic-");
  });
  it("does not extend denied windows; expired counters reset and old keys are pruned", async () => {
    await first.consume("expiry", { window: 60, max: 1 });
    const before = await remote.select().from(schema.rateLimits);
    await first.consume("expiry", { window: 60, max: 1 });
    expect((await remote.select().from(schema.rateLimits)).map((row) => row.expiresAt)).toEqual(
      before.map((row) => row.expiresAt),
    );
    await remote
      .update(schema.rateLimits)
      .set({ expiresAt: sql`statement_timestamp() - interval '1 second'` });
    expect((await second.consume("expiry", { window: 60, max: 1 })).allowed).toBe(true);
    expect(await remote.select().from(schema.rateLimits)).toHaveLength(1);
  });
});

describe("real Better Auth persistence hooks with synthetic providers", () => {
  it("keeps identities but omits all provider tokens on create and update", async () => {
    const context = await auth.$context;
    const user = await context.internalAdapter.createUser(
      {
        name: "Synthetic",
        email: "security@example.test",
        emailVerified: true,
      },
      { method: "oauth", oauth: { providerId: "google" } },
    );
    const account = await context.internalAdapter.createAccount({
      userId: user.id,
      providerId: "google",
      accountId: "synthetic-provider-id",
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
      idToken: "synthetic-id",
      scope: "openid email",
      accessTokenExpiresAt: new Date(Date.now() + 1000),
    });
    const assertNoTokens = async () => {
      const [row] = await remote
        .select()
        .from(schema.authAccounts)
        .where(eq(schema.authAccounts.id, account.id));
      expect(row).toMatchObject({
        providerId: "google",
        accountId: "synthetic-provider-id",
        userId: user.id,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        scope: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      });
    };
    await assertNoTokens();
    // Synthetic legacy row: only a subsequent account write is cleaned, not a
    // hidden batch rewrite of existing real data.
    await remote
      .update(schema.authAccounts)
      .set({ accessToken: "legacy-synthetic", idToken: "legacy-synthetic-id" })
      .where(eq(schema.authAccounts.id, account.id));
    await context.internalAdapter.updateAccount(account.id, {
      refreshToken: "replacement-synthetic",
      idToken: "replacement-id",
    });
    await assertNoTokens();
    const session = await context.internalAdapter.createSession(user.id);
    expect(session.userId).toBe(user.id);
  });
  it("throttles social sign-in at 10/15 minutes without calling a provider", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await auth.handler(
        new Request("https://avo.example.test/api/auth/sign-in/social", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-vercel-forwarded-for": "192.0.2.11",
            origin: "https://avo.example.test",
          },
          // Unknown provider avoids any outbound OAuth request.
          body: JSON.stringify({ provider: "synthetic-not-configured" }),
        }),
      );
      expect(response.status).not.toBe(429);
    }
    const response = await auth.handler(
      new Request("https://avo.example.test/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json", "x-vercel-forwarded-for": "192.0.2.11" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("x-retry-after"))).toBeGreaterThan(0);
  });
  it("ignores forged forwarding chains and normalizes IPv6 /64 buckets", async () => {
    const { rateLimitIp } = await import("@/lib/security/rate-limit");
    const request = (headers: Record<string, string>) => new Request("https://avo.example.test", { headers });
    expect(rateLimitIp(request({ "x-forwarded-for": "192.0.2.100" }))).toBe(
      rateLimitIp(request({ "x-forwarded-for": "192.0.2.101" })),
    );
    expect(rateLimitIp(request({ "x-vercel-forwarded-for": "192.0.2.11, 192.0.2.12" }))).not.toBe(
      "192.0.2.11",
    );
    expect(rateLimitIp(request({ "x-vercel-forwarded-for": "2001:db8:1:2::a" }))).toBe(
      rateLimitIp(request({ "x-vercel-forwarded-for": "2001:db8:1:2::b" })),
    );
    expect(rateLimitIp(request({ "x-vercel-forwarded-for": "192.0.2.12" }))).toBe("192.0.2.12");
  });
});
