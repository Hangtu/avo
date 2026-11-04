import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { env } from "@/lib/env";

const connectionString = env.DATABASE_URL;

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
