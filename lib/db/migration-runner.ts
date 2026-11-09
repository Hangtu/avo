import "server-only";

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { safeErrorSignals } from "@/lib/observability/account-diagnostics";
import { directMigrationUrl } from "./migration-url";

type Environment = "development" | "production" | "invalid";
type Stage = "configuration" | "files" | "connect" | "apply" | "close";
type Signals = ReturnType<typeof safeErrorSignals>;
type BaseEvent = {
  runId: string;
  environment: Environment;
  stage: Stage;
  source?: ".env" | ".env.prod" | "process.env";
  elapsedMs: number;
};
export type MigrationEvent = BaseEvent &
  (
    | { event: "migration_started" | "migration_stage" | "migration_progress" }
    | { event: "migration_completed"; availableMigrations: number }
    | ({ event: "migration_failed"; hint: string; cleanupError?: Signals } & Signals)
  );
type MigrationConnection = {
  connect: () => Promise<void>;
  migrate: (folder: string) => Promise<void>;
  close: () => Promise<void>;
};
export type MigrationConnectionFactory = (
  connectionString: string,
  onError: (error: unknown) => void,
) => MigrationConnection;

const HINTS: Record<Stage, string> = {
  configuration:
    "Check the development/production argument and direct DATABASE_URL_UNPOOLED. Production reads only .env.prod; there is no pooled fallback.",
  files: "Check drizzle/meta/_journal.json and its generated SQL files. Do not edit applied migrations.",
  connect:
    "Check the approved direct target, credentials, network and TLS configuration. Do not weaken SSL or retry blindly.",
  apply:
    "Inspect the safe error codes. Do not retry blindly: a lost connection can leave the commit outcome unknown. Follow the approved recovery plan.",
  close: "Connection cleanup failed; migration SQL may already be committed. Do not rerun blindly.",
};

/** No query logger, retries, app schema/auth imports, or SSL overrides. */
const postgresConnection: MigrationConnectionFactory = (connectionString, onError) => {
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 120_000,
    lock_timeout: 10_000,
  });
  // Idle-client errors must not become uncaught exceptions printing private pg errors.
  pool.on("error", onError);
  return {
    connect: async () => {
      const client = await pool.connect();
      client.release();
    },
    // Drizzle owns SQL execution, transactional rollback, hashes and journal defaults.
    migrate: (migrationsFolder) => migrate(drizzle(pool), { migrationsFolder }),
    close: () => pool.end(),
  };
};

function writeEvent(event: MigrationEvent): void {
  const line = JSON.stringify(event);
  if (event.event === "migration_failed") console.error(line);
  else console.log(line);
}

/** CLI boundary. Only selected env/file labels and allowlisted signals may reach output. */
export async function runMigrationCommand({
  args,
  directory = process.cwd(),
  variables = process.env,
  connectionFactory = postgresConnection,
  write = writeEvent,
}: {
  args: readonly string[];
  directory?: string;
  variables?: Readonly<Record<string, string | undefined>>;
  connectionFactory?: MigrationConnectionFactory;
  write?: (event: MigrationEvent) => void;
}): Promise<0 | 1> {
  const startedAt = performance.now();
  const runId = randomUUID();
  const argument = args.length === 1 ? args[0] : undefined;
  const environment: Environment =
    argument === "development" || argument === "production" ? argument : "invalid";
  let stage: Stage = "configuration";
  let source: BaseEvent["source"];
  let availableMigrations = 0;
  let connection: MigrationConnection | undefined;
  // A holder also tracks failures delivered asynchronously by the pool listener.
  const state: { failure?: { stage: Stage; error: unknown }; cleanupError?: Signals } = {};
  const context = (): BaseEvent => ({
    runId,
    environment,
    stage,
    source,
    elapsedMs: Math.max(0, Math.round(performance.now() - startedAt)),
  });
  const enter = (next: Stage) => {
    stage = next;
    write({ ...context(), event: "migration_stage" });
  };
  const fail = (error: unknown) => {
    state.failure ??= { stage, error };
  };

  write({ ...context(), event: "migration_started" });
  const heartbeat = setInterval(() => write({ ...context(), event: "migration_progress" }), 5_000);
  heartbeat.unref();
  try {
    if (environment === "invalid") throw new Error("Unsupported migration arguments.");
    const inherited = environment === "development" ? variables.DATABASE_URL_UNPOOLED : undefined;
    source = inherited !== undefined ? "process.env" : environment === "production" ? ".env.prod" : ".env";
    // Unlike development/CI, production must never inherit shell credentials.
    const value =
      inherited !== undefined
        ? inherited
        : parse(readFileSync(join(directory, source))).DATABASE_URL_UNPOOLED;
    const connectionString = directMigrationUrl(value);

    enter("files");
    const migrationsFolder = join(directory, "drizzle");
    availableMigrations = readMigrationFiles({ migrationsFolder }).length;

    enter("connect");
    connection = connectionFactory(connectionString, fail);
    await connection.connect();
    if (state.failure) throw state.failure.error;
    enter("apply");
    await connection.migrate(migrationsFolder);
  } catch (error) {
    fail(error);
  } finally {
    try {
      if (connection) {
        enter("close");
        try {
          await connection.close();
        } catch (error) {
          if (state.failure) state.cleanupError = safeErrorSignals(error);
          else fail(error);
        }
      }
    } finally {
      clearInterval(heartbeat);
    }
  }

  if (state.failure) {
    write({
      ...context(),
      event: "migration_failed",
      stage: state.failure.stage,
      ...safeErrorSignals(state.failure.error),
      ...(state.cleanupError ? { cleanupError: state.cleanupError } : {}),
      hint: HINTS[state.failure.stage],
    });
    return 1;
  }
  // This includes no-op runs. A file count is not an applied-count or schema proof.
  write({ ...context(), event: "migration_completed", availableMigrations });
  return 0;
}
