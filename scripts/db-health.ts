import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env" });

async function main() {
  const { db, pool } = await import("../lib/db/client");
  try {
    const result = await db.execute(sql`select 1 as ok`);
    console.log("Neon respondió:", result.rows[0]?.ok === 1 ? "ok" : result.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
