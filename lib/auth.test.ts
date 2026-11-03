import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn(async () => undefined);
  const values = vi.fn(() => ({ onConflictDoNothing }));
  return { insert: vi.fn(() => ({ values })), values, onConflictDoNothing };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: database }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-test-secret-never-a-production-secret-123456789");
  vi.stubEnv("BETTER_AUTH_URL", undefined);
  vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", undefined);
  for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"]) {
    vi.stubEnv(key, undefined);
  }
});

afterEach(() => { vi.unstubAllEnvs(); });

describe("auth without legacy cloud configuration — no database or OAuth network", () => {
  it("uses the local base URL without an additional origin list", async () => {
    const { auth } = await import("./auth");
    expect(auth.options.baseURL).toBe("http://localhost:3000");
    expect(auth.options).not.toHaveProperty("trustedOrigins");
    expect((await auth.$context).trustedOrigins).toEqual(["http://localhost:3000"]);
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

    const response = await auth.handler(new Request("https://avo.example.test/api/auth/sign-out", {
      method: "POST",
      headers: {
        origin: "https://foreign.example.test",
        cookie: "synthetic-cookie=not-a-session",
        "content-type": "application/json",
      },
      body: "{}",
    }));
    expect(response.status).toBe(403);
    expect(database.insert).not.toHaveBeenCalled();
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
      timeZone: "America/Mexico_City",
    });
    expect(database.onConflictDoNothing).toHaveBeenCalledOnce();
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
