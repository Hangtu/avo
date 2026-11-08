import { Dexie, type Table } from "dexie";
import type {
  Day,
  Hand,
  LedgerEntry,
  Metadata,
  Occurrence,
  Pending,
  Routine,
  RunoEvent,
  Session,
  Settings,
  Task,
} from "@/lib/domain/types";
import { newOperationId } from "@/lib/domain/id";

import {
  databaseNameForSpace,
  LEGACY_DATABASE_NAME,
  storageKeyForSpace,
  type LocalSpace,
  type SpaceStorageKey,
} from "./local-space";
import type { DurableRecord, OutboxItem } from "@/lib/sync/protocol";

export const DATABASE_NAME = LEGACY_DATABASE_NAME;
export const DATABASE_VERSION = 6;
const connections = new Set<RunoDatabase>();

/**
 * Guest and account data never share an IndexedDB database. Keeping the
 * original name as the guest scope preserves data from before E4.
 */
export function databaseNameForUser(userId: string | null | undefined): string {
  return databaseNameForSpace(userId ? { kind: "account", userId } : { kind: "guest" });
}

let activeDatabaseName = DATABASE_NAME;

export function currentDatabaseName(): string {
  return activeDatabaseName;
}

export function setActiveDatabaseName(name: string): void {
  if (!name.trim()) throw new Error("El nombre de la base local no es válido.");
  if (name !== activeDatabaseName) {
    for (const db of connections) if (db.name === activeDatabaseName) db.close();
  }
  activeDatabaseName = name;
}

export function setActiveUserDatabase(userId: string | null | undefined): void {
  setActiveDatabaseName(databaseNameForUser(userId));
}

export function resetActiveDatabaseName(): void {
  setActiveDatabaseName(DATABASE_NAME);
}

export function currentLocalSpace(): LocalSpace {
  if (activeDatabaseName.startsWith("runo-locked-")) throw new Error("El espacio local está cambiando.");
  return activeDatabaseName.startsWith("runo-user-")
    ? { kind: "account", userId: decodeURIComponent(activeDatabaseName.slice(10)) }
    : { kind: "guest" };
}
export function activeStorageKey(key: SpaceStorageKey): string {
  return storageKeyForSpace(currentLocalSpace(), key);
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
const STORES_V5 = {
  ...STORES_V3,
  outbox: "key, state",
  syncRecords: "key",
} as const;
const STORES_V6 = {
  ...STORES_V5,
  routines: "id, createdAt, updatedAt, archivedAt, *taskIds",
} as const;

/** No module-level connection: importing this file during SSR never opens storage. */
export class RunoDatabase extends Dexie {
  /** A local namespace, never server authorization. */
  readonly accountId: string | null;
  declare outbox: Table<OutboxItem, string>;
  declare syncRecords: Table<DurableRecord, string>;
  declare tasks: Table<Task, string>;
  declare occurrences: Table<Occurrence, string>;
  declare days: Table<Day, string>;
  declare hands: Table<Hand, string>;
  declare sessions: Table<Session, string>;
  declare events: Table<RunoEvent, string>;
  declare ledger: Table<LedgerEntry, string>;
  declare pendings: Table<Pending, string>;
  declare routines: Table<Routine, string>;
  declare settings: Table<Settings, string>;
  declare metadata: Table<Metadata, string>;

  constructor(name = DATABASE_NAME) {
    super(name, { autoOpen: false });
    this.accountId = name.startsWith("runo-user-") ? decodeURIComponent(name.slice(10)) : null;
    this.version(1).stores(STORES_V2);
    this.version(2)
      .stores(STORES_V2)
      .upgrade((tx) =>
        tx
          .table("days")
          .toCollection()
          .modify((day: { closedAt?: number | null }) => {
            if (day.closedAt === undefined) day.closedAt = null;
          }),
      );
    this.version(3).stores(STORES_V3);
    this.version(4)
      .stores(STORES_V3)
      .upgrade((tx) =>
        tx
          .table("tasks")
          .toCollection()
          .modify((task: { days?: unknown }) => {
            if (Array.isArray(task.days) && task.days.length === 0) {
              task.days = [0, 1, 2, 3, 4, 5, 6];
            }
          }),
      );
    this.version(5)
      .stores(STORES_V5)
      .upgrade(async (tx) => {
        if (!this.accountId) return; // Never adopt guest data during an upgrade.
        for (const [table, kind] of [
          ["tasks", "task"],
          ["pendings", "pending"],
          ["settings", "settings"],
        ] as const) {
          const values = await tx.table(table).toArray();
          for (const value of values) {
            await tx.table("outbox").put({
              key: `${kind}:${value.id}`,
              kind,
              id: value.id,
              value,
              operationId: newOperationId(),
              baseRevision: 0,
              state: "queued",
            });
          }
        }
      });
    this.version(DATABASE_VERSION).stores(STORES_V6);
  }

  override close(): void {
    connections.delete(this);
    super.close();
  }
}

/** Explicit space selection, independent of the compatibility active-name API. */
export interface OpenOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}
export class LocalDatabaseError extends Error {
  constructor(public code: "blocked" | "timeout") {
    super(
      code === "blocked"
        ? "Cierra otras pestañas de Avo y vuelve a intentar. No borres los datos del sitio."
        : "No pude abrir el almacenamiento local a tiempo.",
    );
  }
}
export function openDatabaseForSpace(space: LocalSpace, options?: OpenOptions): Promise<RunoDatabase> {
  return openDatabase(databaseNameForSpace(space), options);
}

export async function openDatabase(
  name = currentDatabaseName(),
  options: OpenOptions = {},
): Promise<RunoDatabase> {
  if (name.startsWith("runo-locked-")) throw new Error("El espacio local está cambiando.");
  if (typeof indexedDB === "undefined") {
    throw new Error("Este entorno no permite guardar datos locales con IndexedDB.");
  }
  options.signal?.throwIfAborted();
  const wasActive = name === currentDatabaseName();
  const db = new RunoDatabase(name);
  let ended = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const unavailable = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new LocalDatabaseError("timeout")), options.timeoutMs ?? 8000);
    abort = () => reject(new DOMException("Space selection cancelled", "AbortError"));
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    db.on("blocked", () => reject(new LocalDatabaseError("blocked")));
  });
  const opening = db.open();
  // Native IDB open requests cannot always be cancelled. Never leak a late connection.
  void opening.then(
    () => {
      if (ended) db.close();
    },
    () => {},
  );
  try {
    await Promise.race([opening, unavailable]);
    if (options.signal?.aborted || (wasActive && name !== currentDatabaseName()))
      throw new Error("El espacio cambió mientras se abría.");
    connections.add(db);
    return db;
  } catch (error) {
    ended = true;
    db.close();
    throw error;
  } finally {
    clearTimeout(timeout);
    if (abort) options.signal?.removeEventListener("abort", abort);
  }
}
