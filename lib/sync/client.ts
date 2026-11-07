import type { RunoDatabase } from "@/lib/db/database";
import { newOperationId } from "@/lib/domain/id";
import type { Routine, Task } from "@/lib/domain/types";
import { acknowledge, mergeRemote } from "./local";
import { retryAfterMs } from "./retry-after";
import {
  canonicalJSON,
  MAX_BATCH,
  MAX_BODY_BYTES,
  entityKey,
  mutationForWire,
  object,
  ProtocolError,
  validBootstrap,
  validMutation,
  validRecord,
  type Bootstrap,
  type Mutation,
  type MutationResult,
  type OutboxItem,
  type RemoteIssue,
} from "./protocol";

export class SyncHttpError extends Error {
  constructor(
    public status: number,
    public code = "request_failed",
    public retryDelayMs?: number,
  ) {
    super(`sync_http_${status}`);
  }
}
export interface SyncTransport {
  bootstrap(accountId: string, etag?: string): Promise<Bootstrap>;
  mutate(accountId: string, mutations: Mutation[]): Promise<MutationResult[]>;
}
async function request(
  accountId: string,
  signal: AbortSignal,
  body?: unknown,
  etag?: string,
  version: 1 | 2 = 2,
) {
  const response = await fetch("/api/account/data", {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: {
      "x-avo-account": accountId,
      "x-avo-sync-version": String(version),
      ...(body ? { "content-type": "application/json" } : {}),
      ...(etag ? { "if-none-match": etag } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok && response.status !== 304) {
    let code = "request_failed";
    try {
      const data = await response.json();
      if (typeof data.error === "string") code = data.error;
    } catch {}
    throw new SyncHttpError(
      response.status,
      code,
      response.status === 429 ? retryAfterMs(response.headers.get("retry-after")) : undefined,
    );
  }
  return response;
}
export function httpTransport(signal: AbortSignal): SyncTransport {
  return {
    bootstrap: async (accountId, etag) => {
      const response = await request(accountId, signal, undefined, etag, 2);
      if (response.status === 304)
        return { version: 2, accountId, records: [], notModified: true, ...(etag ? { etag } : {}) };
      return validBootstrap(
        {
          ...object(await response.json()),
          ...(response.headers.get("etag") ? { etag: response.headers.get("etag") } : {}),
        },
        accountId,
        2,
      );
    },
    mutate: async (accountId, mutations) => {
      const response = await request(accountId, signal, { version: 2, mutations }, undefined, 2);
      const raw = object(await response.json());
      if (
        raw.version !== 2 ||
        raw.accountId !== accountId ||
        !Array.isArray(raw.results) ||
        raw.results.length !== mutations.length
      )
        throw new ProtocolError("invalid_acknowledgement");
      const results = raw.results.map((input) => {
        const row = object(input);
        if (typeof row.operationId !== "string" || (row.status !== "applied" && row.status !== "conflict"))
          throw new ProtocolError("invalid_result");
        return {
          operationId: row.operationId,
          status: row.status,
          record: validRecord(row.record, 2),
        } as MutationResult;
      });
      if (new Set(results.map((row) => row.operationId)).size !== mutations.length)
        throw new ProtocolError("duplicate_result");
      return results;
    },
  };
}
async function rejectItem(db: RunoDatabase, sent: OutboxItem, code: string) {
  await db.transaction("rw", db.outbox, async () => {
    const current = await db.outbox.get(sent.key);
    if (current?.operationId === sent.operationId)
      await db.outbox.put({ ...current, state: "rejected", error: code });
  });
}
function permanent(error: unknown): string | null {
  if (error instanceof SyncHttpError && [400, 413, 422].includes(error.status)) return error.code;
  if (error instanceof ProtocolError && ["record_missing", "operation_reused"].includes(error.message))
    return error.message;
  return null;
}
const passes = new Map<string, Promise<unknown>>();
/** Per-space mutex in this document; server receipts/row locks cover other tabs/instances. */
export async function syncOnce(
  db: RunoDatabase,
  accountId: string,
  transport: SyncTransport,
  options: { pull?: boolean } = {},
): Promise<{ changed: boolean }> {
  if (db.accountId !== accountId) throw new ProtocolError("local_account_mismatch");
  const previous = passes.get(db.name) ?? Promise.resolve();
  const pass = previous
    .catch(() => {})
    .then(() => synchronize(db, accountId, transport, options.pull !== false));
  passes.set(db.name, pass);
  try {
    return await pass;
  } finally {
    if (passes.get(db.name) === pass) passes.delete(db.name);
  }
}
async function synchronize(
  db: RunoDatabase,
  accountId: string,
  transport: SyncTransport,
  pull: boolean,
): Promise<{ changed: boolean }> {
  let changed = false;
  if (pull) {
    const saved = (await db.metadata.get("account-bootstrap-v2"))?.value as { etag?: string } | undefined;
    const bootstrap = validBootstrap(await transport.bootstrap(accountId, saved?.etag), accountId, 2);
    if (!bootstrap.notModified) {
      changed = await mergeRemote(db, bootstrap.records);
      const issues: RemoteIssue[] = bootstrap.issues ?? [];
      const oldIssues = (await db.metadata.get("account-issues-v2"))?.value ?? [];
      if (canonicalJSON(oldIssues) !== canonicalJSON(issues))
        await db.metadata.put({ key: "account-issues-v2", value: JSON.parse(JSON.stringify(issues)) });
      if (!saved || saved.etag !== bootstrap.etag)
        await db.metadata.put({
          key: "account-bootstrap-v2",
          value: { ...(bootstrap.etag ? { etag: bootstrap.etag } : {}) },
        });
    } else if (!saved?.etag || bootstrap.etag !== saved.etag)
      throw new ProtocolError("unexpected_not_modified");
  }
  const allOutbox = await db.outbox.toArray();
  const priority = (item: OutboxItem) => {
    if (item.kind === "routine") {
      const routine = item.value as Routine;
      if (routine.archivedAt !== null && item.baseRevision > 0) return 0;
      return 2;
    }
    if (item.kind === "task") {
      const task = item.value as Task;
      if (task.archivedAt !== null && item.baseRevision > 0) return 3;
      return 1;
    }
    return item.kind === "pending" ? 4 : 5;
  };
  const candidates = allOutbox
    .filter((item) => item.state === "queued")
    .sort((a, b) => priority(a) - priority(b) || a.key.localeCompare(b.key))
    .slice(0, MAX_BATCH);
  const routineTaskKeys = [
    ...new Set(
      candidates.flatMap((item) =>
        item.kind === "routine" && (item.value as Routine).archivedAt === null
          ? (item.value as Routine).taskIds.map((taskId) => entityKey("task", taskId))
          : [],
      ),
    ),
  ];
  const [dependencyOutbox, dependencyRecords] =
    routineTaskKeys.length > 0
      ? await Promise.all([db.outbox.bulkGet(routineTaskKeys), db.syncRecords.bulkGet(routineTaskKeys)])
      : [[], []];
  const outboxByKey = new Map(dependencyOutbox.flatMap((item) => (item ? [[item.key, item] as const] : [])));
  const syncRecordKeys = new Set(dependencyRecords.flatMap((record) => (record ? [record.key] : [])));
  const items: OutboxItem[] = [];
  let bytes = 1024;
  for (const item of candidates) {
    try {
      validMutation(mutationForWire(item));
    } catch {
      await rejectItem(db, item, "invalid_local_record");
      continue;
    }
    if (item.kind === "routine" && (item.value as Routine).archivedAt === null) {
      const unsyncedMember = (item.value as Routine).taskIds.some((taskId) => {
        const key = entityKey("task", taskId);
        const taskOutbox = outboxByKey.get(key);
        if (taskOutbox)
          return taskOutbox.state !== "queued" || !items.some((candidate) => candidate.key === key);
        return !syncRecordKeys.has(key);
      });
      if (unsyncedMember) continue;
    }
    const size = new TextEncoder().encode(JSON.stringify(mutationForWire(item))).byteLength;
    if (size + 1024 > MAX_BODY_BYTES) {
      await rejectItem(db, item, "local_mutation_too_large");
      continue;
    }
    if (bytes + size > MAX_BODY_BYTES) break;
    items.push(item);
    bytes += size;
  }
  async function send(batch: OutboxItem[]): Promise<void> {
    if (!batch.length) return;
    let results: MutationResult[];
    try {
      results = await transport.mutate(accountId, batch.map(mutationForWire));
    } catch (error) {
      const code = permanent(error);
      if (!code) throw error;
      if (batch.length === 1) {
        await rejectItem(db, batch[0], code);
        return;
      }
      const middle = Math.floor(batch.length / 2);
      await send(batch.slice(0, middle));
      await send(batch.slice(middle));
      return;
    }
    if (results.length !== batch.length) throw new ProtocolError("incomplete_results");
    const byId = new Map(results.map((result) => [result.operationId, result]));
    if (byId.size !== batch.length) throw new ProtocolError("duplicate_results");
    for (const item of batch) {
      const result = byId.get(item.operationId);
      if (!result || result.record.kind !== item.kind || result.record.id !== item.id)
        throw new ProtocolError("result_mismatch");
      changed = (await acknowledge(db, item, result)) || changed;
    }
  }
  await send(items);
  return { changed };
}
/** No implicit re-creation or deletion. The person can retry or retain a local-only copy. */
export async function recoverRejected(db: RunoDatabase, key: string, action: "retry" | "local-only") {
  await db.transaction("rw", db.outbox, async () => {
    const item = await db.outbox.get(key);
    if (!item || !["rejected", "local-only"].includes(item.state)) return;
    await db.outbox.put({
      ...item,
      operationId: newOperationId(),
      state: action === "retry" ? "queued" : "local-only",
    });
  });
}
