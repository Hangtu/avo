import { Dexie, type Table } from "dexie";
import type {
  Day, Hand, LedgerEntry, Metadata, Occurrence, Pending, RunoEvent, Session, Settings, Task,
} from "@/lib/domain/types";

import { databaseNameForSpace, LEGACY_DATABASE_NAME, type LocalSpace } from "./local-space";

export const DATABASE_NAME = LEGACY_DATABASE_NAME;
export const DATABASE_VERSION = 4;

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

/** Explicit opt-in, no global active account, automatic import or owner seeds. */
export function openDatabaseForSpace(space: LocalSpace): Promise<RunoDatabase> {
  return openDatabase(databaseNameForSpace(space));
}

export async function openDatabase(name = DATABASE_NAME): Promise<RunoDatabase> {
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
