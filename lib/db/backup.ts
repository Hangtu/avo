import type { RunoDatabase } from "./database";
import { getSettings } from "./repository";
import { BACKUP_SCHEMA_VERSION, type RunoSnapshot } from "./snapshot-types";
import { validateSettings } from "@/lib/domain/validation";

/** Read a complete local snapshot; this does not upload or synchronize data. */
export async function exportLocalSnapshot(db: RunoDatabase, exportedAt: number): Promise<RunoSnapshot> {
  const [tasks, pendings, occurrences, days, hands, sessions, events, ledger, settings, metadata] =
    await Promise.all([
      db.tasks.toArray(),
      db.pendings.toArray(),
      db.occurrences.toArray(),
      db.days.toArray(),
      db.hands.toArray(),
      db.sessions.toArray(),
      db.events.toArray(),
      db.ledger.toArray(),
      getSettings(db, exportedAt),
      db.metadata.toArray(),
    ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    tasks,
    pendings,
    occurrences,
    days,
    hands,
    sessions,
    events,
    ledger,
    settings,
    metadata,
  };
}

/**
 * Legacy full local restore for migration fixtures; intentionally not a merge.
 * Never use for account sync: lib/sync/local.ts merges only durable entities
 * and preserves runtime, pending local edits and their outbox.
 */
export async function importLocalSnapshot(db: RunoDatabase, snapshot: RunoSnapshot): Promise<void> {
  if (!snapshot || snapshot.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error("La versión de la copia no es compatible.");
  }
  const settings = validateSettings(snapshot.settings);

  await db.transaction(
    "rw",
    [
      db.tasks,
      db.pendings,
      db.occurrences,
      db.days,
      db.hands,
      db.sessions,
      db.events,
      db.ledger,
      db.settings,
      db.metadata,
    ],
    async () => {
      await db.tasks.clear();
      await db.pendings.clear();
      await db.occurrences.clear();
      await db.days.clear();
      await db.hands.clear();
      await db.sessions.clear();
      await db.events.clear();
      await db.ledger.clear();
      await db.metadata.clear();
      await db.settings.clear();

      if (snapshot.tasks.length) await db.tasks.bulkAdd(snapshot.tasks);
      if (snapshot.pendings.length) await db.pendings.bulkAdd(snapshot.pendings);
      if (snapshot.occurrences.length) await db.occurrences.bulkAdd(snapshot.occurrences);
      if (snapshot.days.length) await db.days.bulkAdd(snapshot.days);
      if (snapshot.hands.length) await db.hands.bulkAdd(snapshot.hands);
      if (snapshot.sessions.length) await db.sessions.bulkAdd(snapshot.sessions);
      if (snapshot.events.length) await db.events.bulkAdd(snapshot.events);
      if (snapshot.ledger.length) await db.ledger.bulkAdd(snapshot.ledger);
      if (snapshot.metadata.length) await db.metadata.bulkAdd(snapshot.metadata);
      await db.settings.put(settings);
    },
  );
}
