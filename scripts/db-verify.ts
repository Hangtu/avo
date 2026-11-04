import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { sql } from "drizzle-orm";

/**
 * Read-only check. Usage: `tsx scripts/db-verify.ts [envFile]`
 * Never writes, never migrates. Uses the direct URL when available so the
 * result does not depend on the pooler. Personal rows are printed only for the
 * local development env file.
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
  // The app client reads DATABASE_URL; set it before the dynamic import.
  process.env.DATABASE_URL = databaseUrl;
  return new URL(databaseUrl).hostname;
}

async function main() {
  const hostname = loadEnv(envPath);
  const development = envPath === ".env";
  const { db, pool } = await import("../lib/db/client");
  try {
    const tables = await db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name like 'runo_%'
      order by table_name
    `);
    const found = tables.rows.map((row) => row.table_name);
    console.log(`entorno: ${envPath}  host: ${hostname}`);
    console.log("tablas:", found.join(", ") || "(ninguna)");
    if (found.length === 0) {
      console.log("resultado: sin tablas del dominio; falta migrar");
      process.exitCode = 1;
      return;
    }

    const columns = await db.execute<{ table_name: string; column_name: string }>(sql`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public' and table_name like 'runo_%'
    `);
    const have = new Set(columns.rows.map((row) => `${row.table_name}.${row.column_name}`));
    const required: [string, string][] = [
      ["runo_users", "auth_user_id"],
      ["runo_settings", "locale"],
      ["runo_settings", "task_order"],
      ["runo_settings", "revision"],
      ["runo_tasks", "revision"],
      ["runo_pendings", "revision"],
      ["runo_metadata", "user_id"],
      ["runo_metadata", "key"],
      ["runo_auth_accounts", "provider_id"],
      ["runo_auth_accounts", "account_id"],
    ];
    const missing = required
      .filter(([table, column]) => !have.has(`${table}.${column}`))
      .map(([table, column]) => `${table}.${column}`);
    console.log("esquema requerido:", missing.length ? `faltan ${missing.join(", ")}` : "completo");

    const journal = await db
      .execute<{ applied: number; last: string | null }>(
        sql`
      select count(*)::int as applied, max(created_at)::text as last
      from drizzle.__drizzle_migrations
    `,
      )
      .catch(() => null);
    console.log("migraciones:", journal ? JSON.stringify(journal.rows[0]) : "(sin journal de Drizzle)");

    const counts = await db.execute<Record<string, number>>(sql`
      select
        (select count(*)::int from runo_users) as users,
        (select count(*)::int from runo_settings) as settings,
        (select count(*)::int from runo_tasks) as tasks,
        (select count(*)::int from runo_pendings) as pendings,
        (select count(*)::int from runo_auth_users) as auth_users,
        (select count(*)::int from runo_auth_sessions) as auth_sessions,
        (select count(*)::int from runo_users where auth_user_id is not null) as linked_users,
        (select count(*)::int from runo_metadata where key like 'sync:v1:%') as receipts,
        (select count(*)::int from runo_tasks t join runo_users u on u.id = t.user_id where u.auth_user_id is not null) as account_tasks,
        (select count(*)::int from runo_pendings p join runo_users u on u.id = p.user_id where u.auth_user_id is not null) as account_pendings,
        (select count(*)::int from runo_pendings p join runo_users u on u.id = p.user_id where u.auth_user_id is not null and p.completed_at is not null) as account_completed,
        (select count(*)::int from runo_settings s join runo_users u on u.id = s.user_id where u.auth_user_id is not null) as account_settings
    `);
    console.log("conteos:", JSON.stringify(counts.rows[0]));

    if (development) {
      const owner = await db.execute(sql`select id, time_zone from runo_users order by created_at limit 1`);
      const preferences = await db.execute(sql`
        select audio_enabled, sound, max_tone, theme, show_wallet from runo_settings limit 1
      `);
      console.log("owner:", JSON.stringify(owner.rows[0] ?? null));
      console.log("preferencias:", JSON.stringify(preferences.rows[0] ?? null));
    }

    if (missing.length) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
