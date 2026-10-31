import type { RunoDatabase } from "./database";
import { getSettings } from "./repository";
import { BACKUP_SCHEMA_VERSION, type RunoSnapshot } from "@/lib/cloud/snapshot-types";

/** Read the complete local DB for the explicit, one-way cloud backup. */
export async function exportLocalSnapshot(
  db: RunoDatabase,
  exportedAt: number,
): Promise<RunoSnapshot> {
  const [
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
  ] = await Promise.all([
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
