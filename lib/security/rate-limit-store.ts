import "server-only";

import { createHmac } from "node:crypto";
import { accountStage } from "@/lib/observability/account-diagnostics";
import { and, inArray, lt, or, sql } from "drizzle-orm";
import { rateLimits } from "@/lib/db/schema";
import { boundedTransaction, type ServerDatabase } from "@/lib/db/transaction";

export type RateLimitRule = { window: number; max: number };
export type RateLimitDecision = { allowed: boolean; retryAfter: number | null };
const CLEANUP_INTERVAL_MS = 60_000;

/** Shared fixed windows; local cleanup pacing never participates in quota decisions. */
export function createRateLimitStore({
  database,
  secret,
  now = Date.now,
}: {
  database: ServerDatabase;
  secret: string;
  now?: () => number;
}): { consume: (key: string, rule: RateLimitRule) => Promise<RateLimitDecision> } {
  let nextCleanup = 0;
  return {
    async consume(key, rule) {
      if (
        !Number.isSafeInteger(rule.window) ||
        rule.window < 1 ||
        rule.window > 900 ||
        !Number.isSafeInteger(rule.max) ||
        rule.max < 1 ||
        rule.max > 10_000
      )
        throw new Error("Invalid rate limit rule");
      const digest = createHmac("sha256", secret).update(`avo-rate-limit:v1\0${key}`).digest("hex");
      const decision = await accountStage("rate_limit.consume", () =>
        boundedTransaction({
          database,
          work: async (transaction) => {
            const clock = sql`statement_timestamp()`;
            const elapsed = sql`${rateLimits.expiresAt} <= ${clock}`;
            const [applied] = await transaction
              .insert(rateLimits)
              .values({
                key: digest,
                count: 1,
                expiresAt: sql`${clock} + ${rule.window} * interval '1 second'`,
              })
              .onConflictDoUpdate({
                target: rateLimits.key,
                set: {
                  count: sql`case when ${elapsed} then 1 else ${rateLimits.count} + 1 end`,
                  expiresAt: sql`case when ${elapsed} then ${clock} + ${rule.window} * interval '1 second' else ${rateLimits.expiresAt} end`,
                },
                // A denial locks the row but does not UPDATE it/create a new tuple.
                setWhere: or(elapsed, lt(rateLimits.count, rule.max)),
              })
              .returning({ key: rateLimits.key });
            if (applied) return { allowed: true, retryAfter: null };
            // The conflict row remains locked until this transaction ends, so a
            // concurrent reset/pruner cannot invalidate the denial decision.
            const [denied] = await transaction
              .select({
                retryAfter: sql<number>`greatest(1, ceil(extract(epoch from (${rateLimits.expiresAt} - ${clock}))))::integer`,
              })
              .from(rateLimits)
              .where(sql`${rateLimits.key} = ${digest}`);
            if (!denied) throw new Error("Rate limit store unavailable");
            return { allowed: false, retryAfter: denied.retryAfter };
          },
        }),
      );
      // Never prune on denials. One accepted request per minute per store does
      // bounded maintenance; no fire-and-forget work or interval on serverless.
      if (decision.allowed && now() >= nextCleanup) {
        nextCleanup = now() + CLEANUP_INTERVAL_MS;
        await accountStage("rate_limit.cleanup", () =>
          boundedTransaction({
            database,
            work: async (transaction) => {
              const clock = sql`statement_timestamp()`;
              await transaction
                .delete(rateLimits)
                .where(
                  and(
                    lt(rateLimits.expiresAt, clock),
                    inArray(
                      rateLimits.key,
                      transaction
                        .select({ key: rateLimits.key })
                        .from(rateLimits)
                        .where(lt(rateLimits.expiresAt, clock))
                        .orderBy(rateLimits.expiresAt, rateLimits.key)
                        .limit(100)
                        .for("update", { skipLocked: true }),
                    ),
                  ),
                );
            },
          }),
        );
      }
      return decision;
    },
  };
}
