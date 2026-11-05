import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { sql } from "drizzle-orm";
import { createInspectionDatabase, inspectionTarget } from "@/lib/db/inspection";

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
  return inspectionTarget(env, path);
}

async function main() {
  const target = loadEnv(envPath);
  console.log(`entorno: ${envPath}  host: ${target.hostname}`);
  const { db, pool } = createInspectionDatabase(target.connectionString);
  try {
    const result = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    console.log("Neon respondió:", result.rows[0]?.ok === 1 ? "ok" : result.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
