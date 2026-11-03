import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { sql } from "drizzle-orm";

/**
 * Read-only connectivity check. Usage: `tsx scripts/db-health.ts [envFile]`
 * Prints only the target host and a single `select 1`; no data is read.
 */
const envPath = process.argv[2] ?? ".env";

function loadEnv(path: string) {
  let env: Record<string, string>;
  try {
    env = parse(readFileSync(path));
  } catch {
    throw new Error(`No pude leer ${path}.`);
  }
  const databaseUrl = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  if (!databaseUrl) throw new Error(`${path} debe definir DATABASE_URL_UNPOOLED o DATABASE_URL.`);
  process.env.DATABASE_URL = databaseUrl;
  return new URL(databaseUrl).hostname;
}

async function main() {
  const hostname = loadEnv(envPath);
  const { db, pool } = await import("../lib/db/client");
  try {
    const result = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    console.log(`entorno: ${envPath}  host: ${hostname}`);
    console.log("Neon respondió:", result.rows[0]?.ok === 1 ? "ok" : result.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
