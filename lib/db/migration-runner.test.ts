import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runMigrationCommand,
  type MigrationConnectionFactory,
  type MigrationEvent,
} from "./migration-runner";

vi.mock("server-only", () => ({}));

const direct = "postgresql://synthetic_user:synthetic_password@direct.example.invalid/synthetic_db";
const inherited = "postgresql://inherited_user:inherited_password@inherited.example.invalid/other_db";
let directory: string;
let events: MigrationEvent[];
const connection = {
  connect: vi.fn(async () => {}),
  migrate: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
};
const connectionFactory = vi.fn<MigrationConnectionFactory>(() => connection);

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "avo-runner-unit-"));
  cpSync("drizzle", join(directory, "drizzle"), { recursive: true });
  events = [];
  vi.resetAllMocks();
  connection.connect.mockResolvedValue(undefined);
  connection.migrate.mockResolvedValue(undefined);
  connection.close.mockResolvedValue(undefined);
  connectionFactory.mockReturnValue(connection);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  rmSync(directory, { recursive: true, force: true });
});

function run(args: readonly string[] = ["development"], variables: Record<string, string> = {}) {
  return runMigrationCommand({
    args,
    directory,
    variables,
    connectionFactory,
    write: (event) => events.push(event),
  });
}
function env(file = ".env", url = direct) {
  writeFileSync(join(directory, file), `DATABASE_URL_UNPOOLED=${url}\n`);
}
function failures() {
  return events.filter((event) => event.event === "migration_failed");
}

function privateError(code = "42P01") {
  return new Error(`synthetic-private-sql ${direct}`, {
    cause: Object.assign(new Error("synthetic-private-relation synthetic@example.test"), {
      code,
      query: "select * from synthetic_private_relation",
      params: ["synthetic-private-param"],
    }),
  });
}

function expectPrivateOutput() {
  const output = JSON.stringify(events);
  for (const secret of [
    direct,
    inherited,
    "synthetic_password",
    "synthetic_user",
    "synthetic_db",
    "example.invalid",
    "synthetic-private",
    "synthetic_private",
    "synthetic@example.test",
    "select ",
    "Error:",
    '"stack"',
  ])
    expect(output).not.toContain(secret);
}

describe("migration command boundary — synthetic fixtures only", () => {
  it("configures the real pg pool's budgets/listener and closes it after a boundary-level connection error", async () => {
    // Only pg.connect is replaced: no socket opens, and the real pool is constructed/ended.
    const connect = vi.spyOn(pg.Pool.prototype, "connect").mockImplementationOnce(async () => {
      throw privateError("ECONNRESET");
    });
    const close = vi.spyOn(pg.Pool.prototype, "end");
    const code = await runMigrationCommand({
      args: ["development"],
      directory,
      variables: { DATABASE_URL_UNPOOLED: direct },
      write: (event) => events.push(event),
    });
    const pool = connect.mock.contexts[0];
    if (!(pool instanceof pg.Pool)) throw new Error("Missing synthetic pg pool.");
    expect(pool.options).toMatchObject({
      connectionString: direct,
      max: 1,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 120_000,
      lock_timeout: 10_000,
    });
    expect(pool.listenerCount("error")).toBe(1);
    expect(close).toHaveBeenCalledOnce();
    expect(code).toBe(1);
    expect(failures()).toEqual([expect.objectContaining({ stage: "connect", errorCodes: ["ECONNRESET"] })]);
    expectPrivateOutput();
  });

  it("finishes only after cleanup, with safe stages, duration and available (not applied) count", async () => {
    env();
    connection.close.mockImplementationOnce(async () => {
      expect(events.some((event) => event.event === "migration_completed")).toBe(false);
    });
    expect(await run()).toBe(0);
    expect(connectionFactory).toHaveBeenCalledWith(direct, expect.any(Function));
    expect(connection.connect).toHaveBeenCalledOnce();
    expect(connection.migrate).toHaveBeenCalledExactlyOnceWith(join(directory, "drizzle"));
    expect(connection.close).toHaveBeenCalledOnce();
    expect(events[0]).toMatchObject({ event: "migration_started", environment: "development" });
    expect(events.filter((event) => event.event === "migration_stage").map((event) => event.stage)).toEqual([
      "files",
      "connect",
      "apply",
      "close",
    ]);
    expect(events.at(-1)).toMatchObject({ event: "migration_completed", availableMigrations: 6 });
    expect(new Set(events.map((event) => event.runId)).size).toBe(1);
    for (const event of events) expect(event.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(failures()).toHaveLength(0);
    expectPrivateOutput();
  });

  it("keeps development process-env precedence and does not mutate inherited variables", async () => {
    env();
    const variables = { DATABASE_URL_UNPOOLED: inherited };
    expect(await run(["development"], variables)).toBe(0);
    expect(connectionFactory).toHaveBeenCalledWith(inherited, expect.any(Function));
    expect(events.at(-1)).toMatchObject({ source: "process.env" });
    expect(variables).toEqual({ DATABASE_URL_UNPOOLED: inherited });
    expectPrivateOutput();
  });

  it("supports CI's process-env-only direct URL without any env file", async () => {
    expect(await run(["development"], { DATABASE_URL_UNPOOLED: direct })).toBe(0);
    expect(connectionFactory).toHaveBeenCalledWith(direct, expect.any(Function));
  });

  it("uses only .env.prod in production, never inherited credentials or .env", async () => {
    env(".env", inherited);
    env(".env.prod");
    expect(await run(["production"], { DATABASE_URL_UNPOOLED: inherited })).toBe(0);
    expect(connectionFactory).toHaveBeenCalledWith(direct, expect.any(Function));
    expect(events.at(-1)).toMatchObject({ environment: "production", source: ".env.prod" });
    expectPrivateOutput();
  });

  it.each(["missing", "DATABASE_URL only", "empty direct key"])(
    "refuses production fallback with %s configuration",
    async (kind) => {
      env(".env");
      if (kind !== "missing")
        writeFileSync(
          join(directory, ".env.prod"),
          kind === "DATABASE_URL only" ? `DATABASE_URL=${direct}` : "DATABASE_URL_UNPOOLED=\n",
        );
      expect(await run(["production"], { DATABASE_URL_UNPOOLED: direct })).toBe(1);
      expect(connectionFactory).not.toHaveBeenCalled();
      expect(failures()).toEqual([expect.objectContaining({ stage: "configuration" })]);
      expectPrivateOutput();
    },
  );

  it.each([
    "",
    "not-a-url-synthetic-private",
    "https://synthetic-private.invalid/db",
    "postgresql://user:secret@ep-synthetic-pooler.example.invalid/db",
    `${direct}?host=synthetic-private.invalid`,
    "postgresql://synthetic-private.invalid/",
  ])("rejects invalid/pooled/redirected URLs before connecting (%#)", async (url) => {
    env(".env", url);
    expect(await run()).toBe(1);
    expect(connectionFactory).not.toHaveBeenCalled();
    expect(failures()).toHaveLength(1);
    expectPrivateOutput();
  });

  it("does not fall back when the inherited direct key is explicitly empty", async () => {
    env();
    expect(await run(["development"], { DATABASE_URL_UNPOOLED: "" })).toBe(1);
    expect(connectionFactory).not.toHaveBeenCalled();
  });

  it.each([
    { args: [] },
    { args: ["synthetic-private-argument"] },
    { args: ["production", "synthetic-private-argument"] },
  ])("rejects unsupported arguments without reflecting them (%#)", async ({ args }) => {
    expect(await run(args)).toBe(1);
    expect(connectionFactory).not.toHaveBeenCalled();
    expect(failures()).toEqual([expect.objectContaining({ stage: "configuration", environment: "invalid" })]);
    expectPrivateOutput();
  });

  it("checks local migration files before opening any connection", async () => {
    env();
    rmSync(join(directory, "drizzle", "0005_orange_jack_flag.sql"));
    expect(await run()).toBe(1);
    expect(connectionFactory).not.toHaveBeenCalled();
    expect(failures()).toEqual([expect.objectContaining({ stage: "files" })]);
    expect(JSON.stringify(events)).not.toContain(directory);
  });

  it.each(["connect", "migrate"] as const)(
    "closes after %s failure, exits 1 and logs only safe nested causes",
    async (method) => {
      env();
      connection[method].mockRejectedValueOnce(privateError());
      expect(await run()).toBe(1);
      expect(connection.close).toHaveBeenCalledOnce();
      expect(failures()).toEqual([
        expect.objectContaining({
          stage: method === "connect" ? "connect" : "apply",
          errorCodes: ["42P01"],
        }),
      ]);
      expect(events.some((event) => event.event === "migration_completed")).toBe(false);
      if (method === "connect") expect(connection.migrate).not.toHaveBeenCalled();
      expectPrivateOutput();
    },
  );

  it("treats cleanup failure as failure, never success", async () => {
    env();
    connection.close.mockRejectedValueOnce(privateError("ECONNRESET"));
    expect(await run()).toBe(1);
    expect(failures()).toEqual([expect.objectContaining({ stage: "close", errorCodes: ["ECONNRESET"] })]);
    expect(events.some((event) => event.event === "migration_completed")).toBe(false);
    expectPrivateOutput();
  });

  it("preserves the original SQL failure when cleanup also fails", async () => {
    env();
    connection.migrate.mockRejectedValueOnce(privateError());
    connection.close.mockRejectedValueOnce(privateError("ECONNRESET"));
    expect(await run()).toBe(1);
    expect(failures()).toEqual([
      expect.objectContaining({
        stage: "apply",
        errorCodes: ["42P01"],
        cleanupError: expect.objectContaining({ errorCodes: ["ECONNRESET"] }),
      }),
    ]);
    expectPrivateOutput();
  });

  it("handles asynchronous idle-pool errors without an unhandled/raw error or false success", async () => {
    env();
    connectionFactory.mockImplementationOnce((_url, onError) => {
      connection.migrate.mockImplementationOnce(async () => onError(privateError("ECONNRESET")));
      return connection;
    });
    expect(await run()).toBe(1);
    expect(connection.close).toHaveBeenCalledOnce();
    expect(failures()).toEqual([expect.objectContaining({ stage: "apply", errorCodes: ["ECONNRESET"] })]);
    expectPrivateOutput();
  });

  it("does not serialize unknown codes or invoke error getters", async () => {
    env();
    const error = Object.assign(new Error("synthetic-private-message"), { code: "synthetic-private-code" });
    Object.defineProperty(error, "cause", {
      get: () => {
        throw new Error("getter invoked");
      },
    });
    connection.migrate.mockRejectedValueOnce(error);
    expect(await run()).toBe(1);
    expect(failures()).toEqual([expect.objectContaining({ errorCodes: [], errorSignals: [] })]);
    expectPrivateOutput();
  });

  it("reports progress during a wait and clears the interval after completion without retrying", async () => {
    env();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    let finish: () => void = () => {
      throw new Error("migration not started");
    };
    connection.migrate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = run();
    await vi.waitFor(() => expect(connection.migrate).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(5_000);
    expect(events.some((event) => event.event === "migration_progress" && event.stage === "apply")).toBe(
      true,
    );
    finish();
    expect(await pending).toBe(0);
    const count = events.length;
    await vi.advanceTimersByTimeAsync(15_000);
    expect(events).toHaveLength(count);
    expect(connection.migrate).toHaveBeenCalledOnce();
  });
});
