import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn(async () => undefined);
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const transaction = { insert: vi.fn(() => ({ values })), execute: vi.fn(async () => undefined) };
  return {
    ...transaction,
    transaction: vi.fn(async (work) => work(transaction)),
    values,
    onConflictDoNothing,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: database }));
const counter = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/security/rate-limit-store", () => ({ createRateLimitStore: () => counter }));

beforeEach(() => {
  vi.resetModules();
  counter.consume.mockResolvedValue({ allowed: true, retryAfter: null });
  vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@127.0.0.1:5432/avo_test");
  vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-test-secret-never-a-production-secret-123456789");
  vi.stubEnv("BETTER_AUTH_URL", undefined);
  vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", undefined);
  vi.stubEnv("AVO_DEV_AUTH_ORIGINS", undefined);
  vi.stubEnv("VERCEL", undefined);
  for (const key of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "FACEBOOK_CLIENT_ID",
    "FACEBOOK_CLIENT_SECRET",
  ]) {
    vi.stubEnv(key, undefined);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth without legacy cloud configuration — no database or OAuth network", () => {
  it("uses the local base URL without an additional origin list", async () => {
    const { auth } = await import("./auth");
    expect(auth.options.baseURL).toBe("http://localhost:3000");
    expect(auth.options).not.toHaveProperty("trustedOrigins");
    expect((await auth.$context).trustedOrigins).toEqual(["http://localhost:3000"]);
  });

  it("shares the explicit development allowlist with Better Auth, without disabling CSRF", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AVO_DEV_AUTH_ORIGINS", "http://192.168.68.109:3000");
    const { auth } = await import("./auth");
    expect((await auth.$context).trustedOrigins).toEqual([
      "http://localhost:3000",
      "http://192.168.68.109:3000",
    ]);
    expect(auth.options).not.toHaveProperty("advanced.disableOriginCheck", true);
    expect(auth.options).not.toHaveProperty("advanced.disableCSRFCheck", true);
  });
  it("ignores the development allowlist in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AVO_DEV_AUTH_ORIGINS", "http://192.168.68.109:3000");
    vi.stubEnv("BETTER_AUTH_URL", "https://avo.example.test");
    const { auth } = await import("./auth");
    expect((await auth.$context).trustedOrigins).toEqual(["https://avo.example.test"]);
  });
  it("trusts only the configured base origin and still rejects a foreign origin", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://avo.example.test");
    const { auth } = await import("./auth");
    const context = await auth.$context;
    expect(context.trustedOrigins).toEqual(["https://avo.example.test"]);
    expect(auth.options).not.toHaveProperty("advanced.disableOriginCheck", true);
    expect(auth.options).not.toHaveProperty("advanced.disableCSRFCheck", true);
    // Better Auth skips origin checks in its test environment by default.
    // Exercise the production middleware without changing app configuration.
    context.skipOriginCheck = false;

    const response = await auth.handler(
      new Request("https://avo.example.test/api/auth/sign-out", {
        method: "POST",
        headers: {
          origin: "https://foreign.example.test",
          cookie: "synthetic-cookie=not-a-session",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("enables shared limits and never stores provider tokens in a cookie", async () => {
    const { auth } = await import("./auth");
    expect(auth.options.account.storeAccountCookie).toBe(false);
    expect(auth.options.rateLimit.enabled).toBe(true);
    expect(auth.options.rateLimit.customStorage.consume).toBeTypeOf("function");
    expect(auth.options.rateLimit.customRules["/sign-in/*"]).toEqual({ window: 900, max: 10 });
    expect(auth.options.advanced.ipAddress.ipAddressHeaders).toEqual([]);
  });

  it("creates the domain user using the existing default time zone, not a fixed owner", async () => {
    const { auth } = await import("./auth");
    const user = {
      id: "synthetic-account-id",
      name: "Synthetic",
      email: "synthetic@example.test",
      emailVerified: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    await auth.options.databaseHooks.user.create.after(user);
    expect(database.values).toHaveBeenCalledWith({
      id: user.id,
      authUserId: user.id,
      timeZone: "America/Mexico_City",
    });
    expect(database.onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it("links the second provider with the same email, in either order, without our own email verification", async () => {
    const { auth } = await import("./auth");
    expect(auth.options.account.accountLinking).toMatchObject({
      enabled: true,
      // Pattern 1: the same email links the second provider into the existing user.
      disableImplicitLinking: false,
      // Facebook does not assert a verified email in this library version.
      trustedProviders: ["facebook"],
      updateUserInfoOnLink: false,
    });
    const before = auth.options.databaseHooks.user.create.before;
    const base = {
      id: "synthetic-account-id",
      name: "Synthetic",
      email: "synthetic@example.test",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    // Facebook first: the local user must count as verified so Google can link later.
    expect(await before({ ...base, emailVerified: false })).toEqual({ data: { emailVerified: true } });
    expect(await before({ ...base, emailVerified: true })).toBeUndefined();
    expect(await before({ ...base, email: "", emailVerified: false })).toBeUndefined();
  });

  it("enables only social providers with a complete credential pair", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-google-id");
    vi.stubEnv("FACEBOOK_CLIENT_ID", "synthetic-facebook-id");
    vi.stubEnv("FACEBOOK_CLIENT_SECRET", "synthetic-facebook-secret");
    const { auth } = await import("./auth");
    expect(auth.options.socialProviders).toEqual({
      facebook: { clientId: "synthetic-facebook-id", clientSecret: "synthetic-facebook-secret" },
    });
  });
});
