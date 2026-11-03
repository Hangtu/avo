import { eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";
import { rowsForSnapshot } from "@/lib/db/snapshot";
import type { RunoSnapshot } from "@/lib/db/snapshot-types";

/** Test-only full-row fixtures for migration/FK isolation, never production sync. */
export async function replaceAccountFixture(
  db: PgliteDatabase<typeof schema>,
  snapshot: RunoSnapshot,
  ownerId: string,
  timeZone: string,
): Promise<void> {
  const rows = rowsForSnapshot(snapshot, ownerId, timeZone);

  await db.transaction(async (tx) => {
    await tx.insert(schema.users).values(rows.user).onConflictDoNothing();

    // Child rows first; scope every delete to this owner, including join rows.
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, ownerId));
    await tx.delete(schema.handItems).where(eq(schema.handItems.userId, ownerId));
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
  });
}

/** Test-only deletion scoped to an explicitly supplied synthetic account. */
export async function deleteAccountFixture(
  db: PgliteDatabase<typeof schema>,
  ownerId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, ownerId));
    await tx.delete(schema.handItems).where(eq(schema.handItems.userId, ownerId));
    await tx.delete(schema.ledger).where(eq(schema.ledger.userId, ownerId));
    await tx.delete(schema.events).where(eq(schema.events.userId, ownerId));
    await tx.delete(schema.occurrences).where(eq(schema.occurrences.userId, ownerId));
    await tx.delete(schema.hands).where(eq(schema.hands.userId, ownerId));
    await tx.delete(schema.pendings).where(eq(schema.pendings.userId, ownerId));
    await tx.delete(schema.tasks).where(eq(schema.tasks.userId, ownerId));
    await tx.delete(schema.days).where(eq(schema.days.userId, ownerId));
    await tx.delete(schema.metadata).where(eq(schema.metadata.userId, ownerId));
    await tx.delete(schema.settings).where(eq(schema.settings.userId, ownerId));
    await tx.delete(schema.users).where(eq(schema.users.id, ownerId));
  });
}

