import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });
config();

async function main() {
  const { db, pool } = await import("../lib/db/client");
  try {
    const tables = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name like 'runo_%'
      order by table_name
    `);
    console.log("tablas:", tables.rows.map((row) => row.table_name).join(", ") || "(ninguna)");
    if (tables.rows.length === 0) {
      console.log("conteos: (sin tablas; falta migrar)");
      return;
    }
    const counts = await db.execute(sql`
      select
        (select count(*)::int from runo_users) as users,
        (select count(*)::int from runo_settings) as settings,
        (select count(*)::int from runo_tasks) as tasks,
        (select count(*)::int from runo_pendings) as pendings,
        (select count(*)::int from runo_events) as events,
        (select count(*)::int from runo_ledger) as ledger,
        (select count(*)::int from drizzle.__drizzle_migrations) as migrations
    `);
    const owner = await db.execute(sql`select id, time_zone from runo_users order by created_at limit 1`);
    const preferences = await db.execute(sql`
      select audio_enabled, sound, max_tone, theme, show_wallet from runo_settings limit 1
    `);
    console.log("conteos:", JSON.stringify(counts.rows[0]));
    console.log("owner:", JSON.stringify(owner.rows[0] ?? null));
    console.log("preferencias:", JSON.stringify(preferences.rows[0] ?? null));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
