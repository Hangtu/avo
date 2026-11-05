import "server-only";

import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type ServerDatabase = PgDatabase<PgQueryResultHKT, typeof import("./schema")>;
export const SQL_BUDGET = { statementMs: 4_000, lockMs: 1_000 } as const;
type Budget = { statementMs: number; lockMs: number };

/** Unwrap Drizzle errors without logging SQL, parameters or connection details. */
export function postgresCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && typeof current.code === "string" && /^[A-Z\d]{5}$/.test(current.code))
      return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

/**
 * SET LOCAL via set_config(..., true) runs before work on the same transaction.
 * It cannot leak session settings through transaction-mode PgBouncer. Only
 * aborted serialization/deadlock transactions are retried, never ambiguous IO.
 * Work must contain database operations only, not HTTP or other external effects.
 */
export async function boundedTransaction<T>({
  database,
  work,
  isolationLevel = "read committed",
  retries = 0,
  budget = SQL_BUDGET,
}: {
  database: ServerDatabase;
  work: (transaction: ServerDatabase) => Promise<T>;
  isolationLevel?: "read committed" | "repeatable read";
  retries?: number;
  budget?: Budget;
}): Promise<T> {
  if (
    !Number.isSafeInteger(retries) ||
    retries < 0 ||
    retries > 2 ||
    !Number.isSafeInteger(budget.statementMs) ||
    budget.statementMs < 1 ||
    budget.statementMs > 4_000 ||
    !Number.isSafeInteger(budget.lockMs) ||
    budget.lockMs < 1 ||
    budget.lockMs > budget.statementMs
  )
    throw new Error("Invalid SQL budget");
  for (let attempt = 0; ; attempt++) {
    try {
      return await database.transaction(
        async (transaction) => {
          await transaction.execute(sql`select
          set_config('statement_timeout', ${String(budget.statementMs)}, true),
          set_config('lock_timeout', ${String(budget.lockMs)}, true)`);
          return work(transaction);
        },
        { isolationLevel },
      );
    } catch (error) {
      if (attempt >= retries || !["40001", "40P01"].includes(postgresCode(error) ?? "")) throw error;
    }
  }
}
