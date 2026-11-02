import { Dexie, type Table } from "dexie";
import type {
  Day, Hand, LedgerEntry, Metadata, Occurrence, Pending, RunoEvent, Session, Settings, Task,
} from "@/lib/domain/types";

export const DATABASE_NAME = "runo";
export const DATABASE_VERSION = 4;

/**
 * Guest and account data never share an IndexedDB database. Keeping the
 * original name as the guest scope preserves data from before E4.
 */
export function databaseNameForUser(userId: string | null | undefined): string {
  return userId ? `runo-user-${encodeURIComponent(userId)}` : DATABASE_NAME;
}

let activeDatabaseName = DATABASE_NAME;

export function currentDatabaseName(): string {
  return activeDatabaseName;
}

export function setActiveDatabaseName(name: string): void {
  if (!name.trim()) throw new Error("El nombre de la base local no es válido.");
  activeDatabaseName = name;
}

export function setActiveUserDatabase(userId: string | null | undefined): void {
  setActiveDatabaseName(databaseNameForUser(userId));
}

export function resetActiveDatabaseName(): void {
  activeDatabaseName = DATABASE_NAME;
}

const STORES_V2 = {
  tasks: "id, archivedAt, *days",
  occurrences: "id, &[taskId+date], taskId, date, status",
  days: "date",
  hands: "id, date, &[date+ordinal], status",
  sessions: "id, occurrenceId, status, &runningSlot, updatedAt",
  events: "id, actionId, &[actionId+type], occurrenceId, sessionId, at, type",
  ledger: "id, &sourceKey, occurrenceId, at",
  settings: "id",
  metadata: "key",
} as const;

const STORES_V3 = {
  ...STORES_V2,
  sessions: "id, occurrenceId, status, &runningSlot, updatedAt, pendingId",
  pendings: "id, createdAt, completedAt, deletedAt",
} as const;

/** No module-level connection: importing this file during SSR never opens storage. */
export class RunoDatabase extends Dexie {
  declare tasks: Table<Task, string>;
  declare occurrences: Table<Occurrence, string>;
  declare days: Table<Day, string>;
  declare hands: Table<Hand, string>;
  declare sessions: Table<Session, string>;
  declare events: Table<RunoEvent, string>;
  declare ledger: Table<LedgerEntry, string>;
  declare pendings: Table<Pending, string>;
  declare settings: Table<Settings, string>;
  declare metadata: Table<Metadata, string>;

  constructor(name = DATABASE_NAME) {
    super(name, { autoOpen: false });
    this.version(1).stores(STORES_V2);
    this.version(2).stores(STORES_V2).upgrade((tx) =>
      tx.table("days").toCollection().modify((day: { closedAt?: number | null }) => {
        if (day.closedAt === undefined) day.closedAt = null;
      }),
    );
    this.version(3).stores(STORES_V3);
    this.version(DATABASE_VERSION).stores(STORES_V3).upgrade((tx) =>
      tx.table("tasks").toCollection().modify((task: { days?: unknown }) => {
        if (Array.isArray(task.days) && task.days.length === 0) {
          task.days = [0, 1, 2, 3, 4, 5, 6];
        }
      }),
    );
  }
}

export async function openDatabase(name = currentDatabaseName()): Promise<RunoDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("Este entorno no permite guardar datos locales con IndexedDB.");
  }
  const db = new RunoDatabase(name);
  try {
    await db.open();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
