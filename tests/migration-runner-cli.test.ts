import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

const root = process.cwd();
let directory: string;
let direct: string;
beforeAll(async () => {
  // Reserve then release an ephemeral LOOPBACK port. No real PostgreSQL or remote host.
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing synthetic loopback port.");
  direct = `postgresql://synthetic_cli_user:synthetic_cli_password@127.0.0.1:${address.port}/synthetic_db?sslmode=disable`;
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "avo-runner-cli-"));
  cpSync(join(root, "drizzle"), join(directory, "drizzle"), { recursive: true });
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

const eventSchema = z.object({
  event: z.string(),
  stage: z.string(),
  environment: z.string(),
  source: z.string().optional(),
  elapsedMs: z.number(),
  errorCodes: z.array(z.string()).optional(),
});
function execute(args: string[], variables: Record<string, string> = {}) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "node_modules/tsx/dist/cli.mjs"),
      "--tsconfig",
      resolve(root, "tsconfig.json"),
      "--conditions=react-server",
      resolve(root, "scripts/db-migrate.ts"),
      ...args,
    ],
    {
      cwd: directory,
      encoding: "utf8",
      timeout: 20_000,
      env: { ...process.env, DATABASE_URL: "", DATABASE_URL_UNPOOLED: "", ...variables },
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  const out = result.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => eventSchema.parse(JSON.parse(line)));
  const errors = result.stderr
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => eventSchema.parse(JSON.parse(line)));
  const logs = result.stdout + result.stderr;
  for (const secret of [
    direct,
    "synthetic_cli_user",
    "synthetic_cli_password",
    "synthetic_db",
    "select ",
    "Error:",
  ]) {
    expect(logs).not.toContain(secret);
  }
  return { ...result, out, errors };
}

describe("real migration CLI process — refused loopback, no real migrations", () => {
  it("production reaches pg, prints safe ECONNREFUSED and exits 1 rather than hanging", () => {
    writeFileSync(join(directory, ".env.prod"), `DATABASE_URL_UNPOOLED=${direct}\n`);
    const result = execute(["production"], { DATABASE_URL_UNPOOLED: "deliberately-invalid-inherited-value" });
    expect(result.status).toBe(1);
    expect(result.out[0]).toMatchObject({ event: "migration_started", environment: "production" });
    expect(result.out.at(-1)).toMatchObject({ stage: "close" });
    expect(result.errors).toEqual([
      expect.objectContaining({
        event: "migration_failed",
        stage: "connect",
        source: ".env.prod",
        errorCodes: ["ECONNREFUSED"],
      }),
    ]);
  });

  it("keeps the CI process-env-only entry point and safe exit status", () => {
    const result = execute(["development"], { DATABASE_URL_UNPOOLED: direct });
    expect(result.status).toBe(1);
    expect(result.errors).toEqual([
      expect.objectContaining({
        stage: "connect",
        source: "process.env",
        errorCodes: ["ECONNREFUSED"],
      }),
    ]);
  });

  it("refuses production without .env.prod despite a valid inherited direct URL", () => {
    writeFileSync(join(directory, ".env"), `DATABASE_URL_UNPOOLED=${direct}\n`);
    const result = execute(["production"], { DATABASE_URL_UNPOOLED: direct });
    expect(result.status).toBe(1);
    expect(result.out.some((event) => event.stage === "connect")).toBe(false);
    expect(result.errors).toEqual([expect.objectContaining({ stage: "configuration" })]);
  });

  it("refuses unexpected arguments without echoing them or opening a connection", () => {
    const result = execute(["production", "synthetic-private-argument"], { DATABASE_URL_UNPOOLED: direct });
    expect(result.status).toBe(1);
    expect(result.out.some((event) => event.stage === "connect")).toBe(false);
    expect(result.stderr).not.toContain("synthetic-private-argument");
    expect(result.errors).toEqual([
      expect.objectContaining({ stage: "configuration", environment: "invalid" }),
    ]);
  });
});
