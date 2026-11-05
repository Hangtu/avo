import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createInspectionDatabase, inspectionTarget } from "./inspection";

afterEach(() => vi.unstubAllEnvs());
describe("read-only database inspection configuration", () => {
  it("selects production Postgres using only its database URL, without Better Auth secrets", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", undefined);
    const target = inspectionTarget(
      {
        DATABASE_URL_UNPOOLED: "postgresql://synthetic:synthetic@ep-production.aws.neon.tech/avo",
      },
      ".env.prod",
    );
    expect(target).toMatchObject({ hostname: "ep-production.aws.neon.tech", development: false });
    const { pool } = createInspectionDatabase(target.connectionString);
    await pool.end();
  });
  it("prefers a direct URL and retains the explicit runtime fallback for old env files", () => {
    expect(
      inspectionTarget(
        {
          DATABASE_URL_UNPOOLED: "postgresql://direct:secret@db.example.test/avo",
          DATABASE_URL: "postgresql://pooled:secret@db-pooler.example.test/avo",
        },
        ".env.prod",
      ).hostname,
    ).toBe("db.example.test");
    expect(
      inspectionTarget({ DATABASE_URL: "postgresql://local:local@127.0.0.1/avo" }, ".env").hostname,
    ).toBe("127.0.0.1");
  });
  it.each([
    {},
    { DATABASE_URL: "" },
    { DATABASE_URL: "not-a-url" },
    { DATABASE_URL: "https://db.example.test/avo" },
    { DATABASE_URL: "postgresql://db.example.test/" },
  ])("rejects invalid database targets without including their values in errors", (values) => {
    expect(() => inspectionTarget(values, ".env.prod")).toThrow();
    try {
      inspectionTarget(values, ".env.prod");
    } catch (error) {
      expect(String(error)).not.toContain("secret");
      expect(String(error)).not.toContain("db.example.test");
    }
  });
});
