import type {
  Day,
  Hand,
  LedgerEntry,
  Metadata,
  Occurrence,
  Pending,
  RunoEvent,
  Session,
  Settings,
  Task,
} from "@/lib/domain/types";

export const BACKUP_SCHEMA_VERSION = 3 as const;

export interface RunoSnapshot {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: number;
  tasks: Task[];
  pendings: Pending[];
  occurrences: Occurrence[];
  days: Day[];
  hands: Hand[];
  sessions: Session[];
  events: RunoEvent[];
  ledger: LedgerEntry[];
  settings: Settings;
  metadata: Metadata[];
}
