import "server-only";

import { createHash } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import type { ServerDatabase } from "@/lib/db/transaction";
import { canonicalJSON, ProtocolError } from "./protocol";

/**
 * Existing writers increase revisions for every durable change and use
 * tombstones, never physical domain deletes. Counts + revision sums therefore
 * change monotonically without a new metadata token that old writers could miss.
 * Read inside the same RR transaction as the payload. This scans narrow values
 * on Postgres, but transfers only three aggregate rows, not full records.
 */
export async function snapshotEtag(transaction: ServerDatabase, ownerId: string): Promise<string> {
  const versions = await unionAll(
    transaction
      .select({
        kind: sql<string>`'task'`.as("kind"),
        count: count(),
        revision: sql<string>`coalesce(sum(${schema.tasks.revision}), 0)::text`,
      })
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, ownerId)),
    transaction
      .select({
        kind: sql<string>`'pending'`.as("kind"),
        count: count(),
        revision: sql<string>`coalesce(sum(${schema.pendings.revision}), 0)::text`,
      })
      .from(schema.pendings)
      .where(eq(schema.pendings.userId, ownerId)),
    transaction
      .select({
        kind: sql<string>`'settings'`.as("kind"),
        count: count(),
        revision: sql<string>`coalesce(sum(${schema.settings.revision}), 0)::text`,
      })
      .from(schema.settings)
      .where(eq(schema.settings.userId, ownerId)),
  );
  if (versions.some((row) => row.count > 10_000)) throw new ProtocolError("snapshot_too_large");
  const version = canonicalJSON({
    ownerId,
    protocol: 1,
    versions: versions.toSorted((a, b) => a.kind.localeCompare(b.kind)),
  });
  return `"avo-snapshot:v2:${createHash("sha256").update(version).digest("hex")}"`;
}
