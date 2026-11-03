import type { Table } from "dexie";
import type { RunoDatabase } from "@/lib/db/database";
import { newOperationId } from "@/lib/domain/id";
import type { Pending, Settings, Task } from "@/lib/domain/types";
import { defaultSettings } from "@/lib/domain/validation";
import {
  entityKey, mergeSettings, preserveCompletion, sameValue, validValue,
  type DurableKind, type DurableRecord, type DurableValue, type MutationResult, type OutboxItem,
} from "./protocol";

export function syncTables(db: RunoDatabase): Table[] {
  return [db.outbox, db.syncRecords];
}
/** Caller includes syncTables in the SAME transaction as the local mutation. */
export async function enqueue(db: RunoDatabase, kind: DurableKind, value: DurableValue): Promise<void> {
  if (!db.accountId) return;
  const key = entityKey(kind, value.id);
  const previous = await db.outbox.get(key), remote = await db.syncRecords.get(key);
  const clean = validValue(kind, value.id, value);
  // Do not silently clear a known conflict when another local edit occurs.
  await db.outbox.put({ key, kind, id: value.id, value: clean,
    operationId: newOperationId(), baseRevision: previous?.baseRevision ?? remote?.revision ?? 0,
    state: previous?.state ?? "queued", ...(previous?.error ? { error: previous.error } : {}), ...(previous?.remote ? { remote: previous.remote } : {}),
  });
}
export async function writeValue(db: RunoDatabase, kind: DurableKind, value: DurableValue) {
  if (kind === "task") await db.tasks.put(value as Task);
  else if (kind === "pending") await db.pendings.put(value as Pending);
  else await db.settings.put(value as Settings);
}
export function allDurableTables(db: RunoDatabase): Table[] {
  return [db.tasks, db.pendings, db.settings, db.outbox, db.syncRecords, db.metadata];
}
/** Merge, never replace the DB: execution, guest data, and local edits survive. */
export async function mergeRemote(db: RunoDatabase, records: DurableRecord[]): Promise<boolean> {
  let changed = false;
  await db.transaction("rw", allDurableTables(db), async () => {
    for (const record of records) {
      const known = await db.syncRecords.get(record.key);
      if (known && known.revision > record.revision) continue;
      const item = await db.outbox.get(record.key);
      if (!known || known.revision !== record.revision || !sameValue(known.value, record.value)) await db.syncRecords.put(record);
      if (item) {
        if (item.state === "rejected" || item.state === "local-only") continue;
        if (record.kind === "settings" && item.baseRevision !== record.revision &&
          ((known && known.revision === item.baseRevision) || (!known && item.baseRevision === 0))) {
          const merged = mergeSettings(item.value as Settings, record.value as Settings, known?.value as Settings ?? defaultSettings(0));
          if (merged) {
            await writeValue(db, "settings", merged);
            await db.outbox.delete(item.key);
            if (!sameValue(merged, record.value)) await enqueue(db, "settings", merged);
            changed = true;
            continue;
          }
        }
        const value = preserveCompletion(item.value, record.value, record.kind);
        if (sameValue(value, record.value)) {
          await db.outbox.delete(item.key);
          await writeValue(db, record.kind, record.value);
          changed = true;
        } else if (item.baseRevision !== record.revision) {
          await db.outbox.put({ ...item, value, state: "conflict", remote: record });
          if (!sameValue(value, item.value)) {
            await writeValue(db, record.kind, value);
            changed = true;
          }
        }
        continue;
      }
      let value = record.value;
      if (record.kind === "pending") {
        const local = await db.pendings.get(record.id);
        if (local?.completedAt !== null && local?.completedAt !== undefined && (value as Pending).completedAt === null) {
          value = preserveCompletion(value, local, "pending");
          await enqueue(db, "pending", value);
        }
      }
      const table = record.kind === "task" ? db.tasks : record.kind === "pending" ? db.pendings : db.settings;
      const previous = await table.get(record.id);
      if (!previous || !sameValue(previous, value)) {
        await writeValue(db, record.kind, value);
        changed = true;
      }
    }
  });
  return changed;
}
/** An in-flight acknowledgement must not delete a newer coalesced edit. */
export async function acknowledge(db: RunoDatabase, sent: OutboxItem, result: MutationResult): Promise<boolean> {
  let changed = false;
  await db.transaction("rw", allDurableTables(db), async () => {
    const record = result.record;
    const known = await db.syncRecords.get(record.key);
    if (known && known.revision > record.revision) return;
    await db.syncRecords.put(record);
    const current = await db.outbox.get(sent.key);
    if (!current) return;
    if (result.status === "conflict") {
      await db.outbox.put({ ...current, state: "conflict", remote: record });
      return;
    }
    const value = preserveCompletion(current.value, record.value, record.kind);
    if (current.operationId === sent.operationId) {
      await db.outbox.delete(sent.key);
      await writeValue(db, record.kind, record.value);
      changed = !sameValue(current.value, record.value);
    } else {
      await db.outbox.put({ ...current, baseRevision: record.revision, value });
      if (!sameValue(value, current.value)) {
        await writeValue(db, record.kind, value);
        changed = true;
      }
    }
  });
  return changed;
}
export async function resolveConflict(db: RunoDatabase, key: string, choice: "local" | "remote") {
  await db.transaction("rw", allDurableTables(db), async () => {
    const item = await db.outbox.get(key);
    if (!item?.remote || item.state !== "conflict") return;
    const remote = item.remote;
    const value = choice === "local" ? preserveCompletion(item.value, remote.value, item.kind)
      : item.kind === "pending" && (remote.value as Pending).completedAt !== null ? remote.value
        : preserveCompletion(remote.value, item.value, item.kind);
    await db.outbox.delete(key);
    await writeValue(db, item.kind, value);
    if (!sameValue(value, remote.value)) await enqueue(db, item.kind, value);
  });
}
