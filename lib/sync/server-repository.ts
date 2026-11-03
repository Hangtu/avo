import "server-only";

import { createHash } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import type { JsonValue, Pending, Settings, Task } from "@/lib/domain/types";
import {
  canonicalJSON, entityKey, preserveCompletion, ProtocolError, sameValue, validId, validRecord, validValue,
  type Bootstrap, type DurableKind, type DurableRecord, type Mutation, type MutationResult, type RemoteIssue,
} from "./protocol";

export type AccountDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;
const ms = (value: Date | null) => value?.getTime() ?? null;
const date = (value: number | null) => value === null ? null : new Date(value);

function taskRecord(row: schema.TaskRow): DurableRecord {
  const value = validValue("task", row.id, {
    id: row.id, title: row.title, category: row.category, durationMin: row.durationMin,
    priority: row.priority, days: row.days, createdAt: ms(row.createdAt), updatedAt: ms(row.updatedAt), archivedAt: ms(row.archivedAt),
    ...(row.windowStart && row.windowEnd ? { window: { start: row.windowStart.slice(0, 5), end: row.windowEnd.slice(0, 5) } } : {}),
    ...(row.fixedTime ? { fixedTime: row.fixedTime.slice(0, 5) } : {}),
    ...(row.shortStepTitle && row.shortStepDurationMin ? { shortStep: { title: row.shortStepTitle, durationMin: row.shortStepDurationMin } } : {}),
  });
  return { key: entityKey("task", row.id), kind: "task", id: row.id, revision: row.revision, value };
}
function pendingRecord(row: schema.PendingRow): DurableRecord {
  return { key: entityKey("pending", row.id), kind: "pending", id: row.id, revision: row.revision,
    value: { id: row.id, title: row.title, durationMin: row.durationMin, createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(), completedAt: ms(row.completedAt), deletedAt: ms(row.deletedAt) } };
}
function settingsRecord(row: schema.SettingsRow): DurableRecord {
  return { key: entityKey("settings", "preferences"), kind: "settings", id: "preferences", revision: row.revision,
    value: { id: "preferences", audioEnabled: row.audioEnabled, sound: row.sound, maxTone: row.maxTone as Settings["maxTone"],
      theme: row.theme, showWallet: row.showWallet, locale: row.locale, taskOrder: row.taskOrder, updatedAt: row.updatedAt.getTime() } };
}

/** authId is supplied ONLY by the session DAL, never a body/email/provider label. */
async function linkedOwner(tx: AccountDatabase, authId: string): Promise<string | null> {
  const [linked] = await tx.select().from(schema.users).where(eq(schema.users.authUserId, authId));
  if (!linked) return null;
  // Never adopt the fixed legacy owner, even if a bad link already exists.
  if (linked.id === "owner") throw new ProtocolError("legacy_owner_protected");
  return linked.id;
}
async function domainOwner(tx: AccountDatabase, authId: string, lock: boolean): Promise<string> {
  if (authId === "owner") throw new ProtocolError("identity_missing");
  if (!lock) {
    // Warm reads never bump revisions, so they must not wait behind a push.
    const found = await linkedOwner(tx, authId);
    if (found) return found;
  }
  // Serialize creation, linking, mutations and receipts per identity, also across instances.
  const [identity] = await tx.select({ id: schema.authUsers.id }).from(schema.authUsers)
    .where(eq(schema.authUsers.id, authId)).for("update");
  if (!identity) throw new ProtocolError("identity_missing");
  const linked = await linkedOwner(tx, authId);
  if (linked) return linked;
  // Compatibility with the old auth hook's same internal ID, not the legacy owner.
  const [existing] = await tx.select().from(schema.users).where(and(eq(schema.users.id, authId), isNull(schema.users.authUserId)));
  if (existing) {
    await tx.update(schema.users).set({ authUserId: authId }).where(and(eq(schema.users.id, authId), isNull(schema.users.authUserId)));
    return existing.id;
  }
  const id = `account:${authId}`;
  await tx.insert(schema.users).values({ id, authUserId: authId, timeZone: "America/Mexico_City" });
  return id;
}
async function readRecord(tx: AccountDatabase, ownerId: string, kind: DurableKind, id: string): Promise<DurableRecord | null> {
  if (kind === "task") {
    const [row] = await tx.select().from(schema.tasks).where(and(eq(schema.tasks.userId, ownerId), eq(schema.tasks.id, id)));
    return row ? taskRecord(row) : null;
  }
  if (kind === "pending") {
    const [row] = await tx.select().from(schema.pendings).where(and(eq(schema.pendings.userId, ownerId), eq(schema.pendings.id, id)));
    return row ? pendingRecord(row) : null;
  }
  const [row] = await tx.select().from(schema.settings).where(eq(schema.settings.userId, ownerId));
  return row ? settingsRecord(row) : null;
}
async function writeRecord(tx: AccountDatabase, ownerId: string, mutation: Mutation, previous: DurableRecord | null): Promise<DurableRecord> {
  const revision = (previous?.revision ?? 0) + 1;
  const value = previous ? preserveCompletion(mutation.value, previous.value, mutation.kind) : mutation.value;
  if (mutation.kind === "task") {
    const task = value as Task;
    const row = { userId: ownerId, id: mutation.id, title: task.title, category: task.category,
      durationMin: task.durationMin, priority: task.priority, days: task.days,
      windowStart: task.window?.start ?? null, windowEnd: task.window?.end ?? null, fixedTime: task.fixedTime ?? null,
      shortStepTitle: task.shortStep?.title ?? null, shortStepDurationMin: task.shortStep?.durationMin ?? null,
      archivedAt: date(task.archivedAt), createdAt: date((previous?.value as Task | undefined)?.createdAt ?? task.createdAt)!,
      updatedAt: date(task.updatedAt)!, revision };
    await tx.insert(schema.tasks).values(row).onConflictDoUpdate({ target: [schema.tasks.userId, schema.tasks.id], set: row });
  } else if (mutation.kind === "pending") {
    const pending = value as Pending;
    const row = { userId: ownerId, id: mutation.id, title: pending.title, durationMin: pending.durationMin,
      completedAt: date(pending.completedAt), deletedAt: date(pending.deletedAt),
      createdAt: date((previous?.value as Pending | undefined)?.createdAt ?? pending.createdAt)!, updatedAt: date(pending.updatedAt)!, revision };
    await tx.insert(schema.pendings).values(row).onConflictDoUpdate({ target: [schema.pendings.userId, schema.pendings.id], set: row });
  } else {
    const settings = value as Settings;
    const row = { userId: ownerId, audioEnabled: settings.audioEnabled, sound: settings.sound, maxTone: settings.maxTone,
      theme: settings.theme, showWallet: settings.showWallet, locale: settings.locale ?? "es", taskOrder: settings.taskOrder ?? {},
      updatedAt: date(settings.updatedAt)!, revision };
    await tx.insert(schema.settings).values(row).onConflictDoUpdate({ target: schema.settings.userId, set: row });
  }
  return (await readRecord(tx, ownerId, mutation.kind, mutation.id))!;
}

export async function readAccountData(db: AccountDatabase, authId: string): Promise<Bootstrap> {
  return db.transaction(async tx => {
    const ownerId = await domainOwner(tx, authId, false);
    // Ordered selects keep the canonical hash (and therefore the ETag) stable.
    const tasks = await tx.select().from(schema.tasks).where(eq(schema.tasks.userId, ownerId))
      .orderBy(asc(schema.tasks.id)).limit(10_001);
    const pendings = await tx.select().from(schema.pendings).where(eq(schema.pendings.userId, ownerId))
      .orderBy(asc(schema.pendings.id)).limit(10_001);
    if (tasks.length > 10_000 || pendings.length > 10_000) throw new ProtocolError("snapshot_too_large");
    const settings = await tx.select().from(schema.settings).where(eq(schema.settings.userId, ownerId));
    const records: DurableRecord[] = [], issues: RemoteIssue[] = [];
    const collect = <T,>(rows: T[], kind: DurableKind, convert: (row: T) => DurableRecord) => {
      for (const row of rows) {
        let id = kind === "settings" ? "preferences" : (row as { id: string }).id;
        try { validId(id); } catch { id = `invalid:${createHash("sha256").update(String(id)).digest("hex")}`; }
        try {
          records.push(validRecord(convert(row)));
        } catch {
          // Keep the server row and any local copy. Report quarantine, never silently omit it.
          issues.push({ key: entityKey(kind, id), kind, id, code: "invalid_record" });
        }
      }
    };
    collect(tasks, "task", taskRecord);
    collect(pendings, "pending", pendingRecord);
    collect(settings, "settings", settingsRecord);
    return { version: 1, accountId: authId, records, ...(issues.length ? { issues } : {}) };
  });
}
export async function mutateAccountData(db: AccountDatabase, authId: string, mutations: Mutation[]): Promise<MutationResult[]> {
  return db.transaction(async tx => {
    const ownerId = await domainOwner(tx, authId, true);
    const results: MutationResult[] = [];
    for (const mutation of mutations) {
      const receiptKey = `sync:v1:${mutation.operationId}`;
      const hash = createHash("sha256").update(canonicalJSON(mutation)).digest("hex");
      const [receipt] = await tx.select().from(schema.metadata)
        .where(and(eq(schema.metadata.userId, ownerId), eq(schema.metadata.key, receiptKey)));
      if (receipt) {
        const saved = receipt.value as { hash: string; result: unknown };
        if (saved.hash !== hash) throw new ProtocolError("operation_reused");
        results.push(saved.result as MutationResult);
        continue;
      }
      const previous = await readRecord(tx, ownerId, mutation.kind, mutation.id);
      if (previous && mutation.baseRevision !== previous.revision) {
        results.push({ operationId: mutation.operationId, status: "conflict", record: previous });
        continue;
      }
      if (!previous && mutation.baseRevision !== 0) throw new ProtocolError("record_missing");
      const effective = previous ? preserveCompletion(mutation.value, previous.value, mutation.kind) : mutation.value;
      const record = previous && sameValue(effective, previous.value) ? previous : await writeRecord(tx, ownerId, mutation, previous);
      const result: MutationResult = { operationId: mutation.operationId, status: "applied", record };
      await tx.insert(schema.metadata).values({ userId: ownerId, key: receiptKey,
        value: JSON.parse(JSON.stringify({ hash, result })) as JsonValue });
      results.push(result);
    }
    return results;
  });
}
