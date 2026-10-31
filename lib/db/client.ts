import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Falta DATABASE_URL. Copia .env.example a .env.local y usa la cadena pooled de Neon.",
  );
}

/**
 * Reuse the pool across HMR in development. On Vercel Fluid, attachDatabasePool
 * closes idle connections before the function is suspended.
 */
const globalForDb = globalThis as unknown as { runoPool?: Pool };

const pool =
  globalForDb.runoPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (!globalForDb.runoPool) {
  attachDatabasePool(pool);
  globalForDb.runoPool = pool;
}

export const db = drizzle({ client: pool, schema });
export { pool };
