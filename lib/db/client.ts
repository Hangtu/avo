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
const globalForDb = globalThis as typeof globalThis & {
  runoPool?: Pool;
  runoObservedPools?: WeakSet<Pool>;
};

const pool =
  globalForDb.runoPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

// Reusing a pre-existing HMR pool must also install the listener exactly once.
const observed = (globalForDb.runoObservedPools ??= new WeakSet<Pool>());
if (!observed.has(pool)) {
  pool.on("error", () => {
    // Idle errors are asynchronous: route try/catch cannot catch this event.
    console.error("Database idle connection unavailable");
  });
  observed.add(pool);
}

if (!globalForDb.runoPool) {
  attachDatabasePool(pool);
  globalForDb.runoPool = pool;
}

export const db = drizzle({ client: pool, schema });
export { pool };
