import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type InspectionTarget = {
  connectionString: string;
  hostname: string;
  development: boolean;
};

/** Select only the explicitly requested database credentials, not app/auth env. */
export function inspectionTarget(
  values: Readonly<Record<string, string | undefined>>,
  envPath: string,
): InspectionTarget {
  const connectionString = values.DATABASE_URL_UNPOOLED?.trim() || values.DATABASE_URL?.trim();
  if (!connectionString) throw new Error(`${envPath} debe definir DATABASE_URL_UNPOOLED o DATABASE_URL.`);
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${envPath} contiene una URL de PostgreSQL inválida.`);
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2)
    throw new Error(`${envPath} debe definir una URL de PostgreSQL con host y base de datos.`);
  return { connectionString, hostname: url.hostname, development: envPath === ".env" };
}

/** A one-connection inspection pool deliberately independent of Better Auth/runtime env. */
export function createInspectionDatabase(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5_000 });
  pool.on("error", () => console.error("Database inspection connection unavailable"));
  return { db: drizzle({ client: pool, schema }), pool };
}
