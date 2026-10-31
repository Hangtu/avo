import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import type { JsonValue } from "@/lib/domain/types";
import { rowsForSnapshot } from "./snapshot";
import type { BackupCounts, RunoSnapshot } from "./snapshot-types";

function backupValue(at: number, counts: BackupCounts): Record<string, JsonValue> {
  return { at, counts: { ...counts } };
}

function countsFor(snapshot: RunoSnapshot): BackupCounts {
  return {
    tasks: snapshot.tasks.length,
    pendings: snapshot.pendings.length,
    occurrences: snapshot.occurrences.length,
    days: snapshot.days.length,
    hands: snapshot.hands.length,
    sessions: snapshot.sessions.length,
    events: snapshot.events.length,
    ledger: snapshot.ledger.length,
  };
}

/**
 * The local device is the source for E3. This replaces this owner's remote
 * mirror atomically; it does not reconcile two remote writers.
 */
export async function replaceRemoteSnapshot(
  snapshot: RunoSnapshot,
  ownerId: string,
  timeZone: string,
): Promise<{ lastBackupAt: number; counts: BackupCounts }> {
  const rows = rowsForSnapshot(snapshot, ownerId, timeZone);
  const lastBackupAt = Date.now();
  const counts = countsFor(snapshot);

  await db.transaction(async (tx) => {
    await tx.insert(schema.users).values(rows.user).onConflictDoNothing();

    // Child rows first; scope every delete to this owner.
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, ownerId));
    await tx.execute(sql`
      delete from runo_hand_items
      where hand_id in (select id from runo_hands where user_id = ${ownerId})
    `);
    await tx.delete(schema.ledger).where(eq(schema.ledger.userId, ownerId));
    await tx.delete(schema.events).where(eq(schema.events.userId, ownerId));
    await tx.delete(schema.occurrences).where(eq(schema.occurrences.userId, ownerId));
    await tx.delete(schema.hands).where(eq(schema.hands.userId, ownerId));
    await tx.delete(schema.pendings).where(eq(schema.pendings.userId, ownerId));
    await tx.delete(schema.tasks).where(eq(schema.tasks.userId, ownerId));
    await tx.delete(schema.days).where(eq(schema.days.userId, ownerId));
    await tx.delete(schema.metadata).where(eq(schema.metadata.userId, ownerId));
    await tx.delete(schema.settings).where(eq(schema.settings.userId, ownerId));

    if (rows.tasks.length) await tx.insert(schema.tasks).values(rows.tasks);
    if (rows.pendings.length) await tx.insert(schema.pendings).values(rows.pendings);
    if (rows.days.length) await tx.insert(schema.days).values(rows.days);
    if (rows.hands.length) await tx.insert(schema.hands).values(rows.hands);
    if (rows.occurrences.length) await tx.insert(schema.occurrences).values(rows.occurrences);
    if (rows.handItems.length) await tx.insert(schema.handItems).values(rows.handItems);
    if (rows.sessions.length) await tx.insert(schema.sessions).values(rows.sessions);
    if (rows.events.length) await tx.insert(schema.events).values(rows.events);
    if (rows.ledger.length) await tx.insert(schema.ledger).values(rows.ledger);
    await tx.insert(schema.settings).values(rows.settings);
    if (rows.metadata.length) {
      await tx.insert(schema.metadata).values(rows.metadata).onConflictDoNothing();
    }

    await tx
      .insert(schema.metadata)
      .values({
        userId: ownerId,
        key: "cloud-backup",
        value: backupValue(lastBackupAt, counts),
        updatedAt: new Date(lastBackupAt),
      })
      .onConflictDoUpdate({
        target: [schema.metadata.userId, schema.metadata.key],
        set: {
          value: backupValue(lastBackupAt, counts),
          updatedAt: new Date(lastBackupAt),
        },
      });
  });

  return { lastBackupAt, counts };
}

export async function getLastBackup(ownerId: string): Promise<{
  lastBackupAt: number | null;
  counts: BackupCounts | null;
}> {
  const [row] = await db
    .select({ value: schema.metadata.value })
    .from(schema.metadata)
    .where(and(eq(schema.metadata.userId, ownerId), eq(schema.metadata.key, "cloud-backup")))
    .limit(1);
  const value = row?.value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { lastBackupAt: null, counts: null };
  }
  const data = value as { at?: unknown; counts?: unknown };
  if (!Number.isFinite(data.at) || typeof data.counts !== "object" || data.counts === null) {
    return { lastBackupAt: null, counts: null };
  }
  return {
    lastBackupAt: data.at as number,
    counts: data.counts as BackupCounts,
  };
}
