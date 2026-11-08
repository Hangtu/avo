import "server-only";

import { createHash } from "node:crypto";
import { accountStage } from "@/lib/observability/account-diagnostics";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import { boundedTransaction } from "@/lib/db/transaction";
import { snapshotEtag } from "./server-version";
import type { JsonValue, Pending, Routine, Settings, Task } from "@/lib/domain/types";
import {
  canonicalJSON,
  entityKey,
  preserveCompletion,
  ProtocolError,
  sameValue,
  validId,
  validRecord,
  validValue,
  type Bootstrap,
  type DurableKind,
  type DurableRecord,
  type Mutation,
  type MutationResult,
  type RemoteIssue,
} from "./protocol";

export type AccountDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;
class AccountInitializationRace extends Error {
  readonly code = "40001";
}
const ms = (value: Date | null) => value?.getTime() ?? null;
const date = (value: number | null) => (value === null ? null : new Date(value));

function taskRecord(row: schema.TaskRow): DurableRecord {
  const value = validValue("task", row.id, {
    id: row.id,
    title: row.title,
    category: row.category,
    durationMin: row.durationMin,
    priority: row.priority,
    days: row.days,
    createdAt: ms(row.createdAt),
    updatedAt: ms(row.updatedAt),
    archivedAt: ms(row.archivedAt),
    ...(row.windowStart && row.windowEnd
      ? { window: { start: row.windowStart.slice(0, 5), end: row.windowEnd.slice(0, 5) } }
      : {}),
    ...(row.fixedTime ? { fixedTime: row.fixedTime.slice(0, 5) } : {}),
    ...(row.shortStepTitle && row.shortStepDurationMin
      ? { shortStep: { title: row.shortStepTitle, durationMin: row.shortStepDurationMin } }
      : {}),
  });
  return { key: entityKey("task", row.id), kind: "task", id: row.id, revision: row.revision, value };
}
function routineRecord(row: schema.RoutineRow): DurableRecord {
  const value = validValue("routine", row.id, {
    id: row.id,
    title: row.title,
    taskIds: row.taskIds,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    archivedAt: ms(row.archivedAt),
  });
  return { key: entityKey("routine", row.id), kind: "routine", id: row.id, revision: row.revision, value };
}
function pendingRecord(row: schema.PendingRow): DurableRecord {
  return {
    key: entityKey("pending", row.id),
    kind: "pending",
    id: row.id,
    revision: row.revision,
    value: {
      id: row.id,
      title: row.title,
      durationMin: row.durationMin,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      completedAt: ms(row.completedAt),
      deletedAt: ms(row.deletedAt),
    },
  };
}
function settingsRecord(row: schema.SettingsRow): DurableRecord {
  return {
    key: entityKey("settings", "preferences"),
    kind: "settings",
    id: "preferences",
    revision: row.revision,
    value: {
      id: "preferences",
      audioEnabled: row.audioEnabled,
      sound: row.sound,
      maxTone: row.maxTone as Settings["maxTone"],
      theme: row.theme,
      showWallet: row.showWallet,
      locale: row.locale,
      taskOrder: row.taskOrder,
      updatedAt: row.updatedAt.getTime(),
    },
  };
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
  const [identity] = await tx
    .select({ id: schema.authUsers.id })
    .from(schema.authUsers)
    .where(eq(schema.authUsers.id, authId))
    .for("update");
  if (!identity) throw new ProtocolError("identity_missing");
  const linked = await linkedOwner(tx, authId);
  if (linked) return linked;
  // Compatibility with the old auth hook's same internal ID, not the legacy owner.
  const [existing] = await tx
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, authId), isNull(schema.users.authUserId)));
  if (existing) {
    await tx
      .update(schema.users)
      .set({ authUserId: authId })
      .where(and(eq(schema.users.id, authId), isNull(schema.users.authUserId)));
    return existing.id;
  }
  const id = `account:${authId}`;
  const [created] = await tx
    .insert(schema.users)
    .values({ id, authUserId: authId, timeZone: "America/Mexico_City" })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });
  if (!created) throw new AccountInitializationRace("Account owner initialized concurrently");
  return id;
}
async function readRecord(
  tx: AccountDatabase,
  ownerId: string,
  kind: DurableKind,
  id: string,
): Promise<DurableRecord | null> {
  if (kind === "task") {
    const [row] = await tx
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, ownerId), eq(schema.tasks.id, id)));
    return row ? taskRecord(row) : null;
  }
  if (kind === "pending") {
    const [row] = await tx
      .select()
      .from(schema.pendings)
      .where(and(eq(schema.pendings.userId, ownerId), eq(schema.pendings.id, id)));
    return row ? pendingRecord(row) : null;
  }
  if (kind === "routine") {
    const [row] = await tx
      .select()
      .from(schema.routines)
      .where(and(eq(schema.routines.userId, ownerId), eq(schema.routines.id, id)));
    return row ? routineRecord(row) : null;
  }
  const [row] = await tx.select().from(schema.settings).where(eq(schema.settings.userId, ownerId));
  return row ? settingsRecord(row) : null;
}
async function validateRoutineTaskOwnership(
  tx: AccountDatabase,
  ownerId: string,
  taskIds: readonly string[],
): Promise<void> {
  const tasks = await tx
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.userId, ownerId), inArray(schema.tasks.id, [...taskIds])));
  if (tasks.length !== taskIds.length) throw new ProtocolError("routine_task_missing");
}

async function validateRoutineMembers(
  tx: AccountDatabase,
  ownerId: string,
  taskIds: readonly string[],
  excludeRoutineId?: string,
): Promise<void> {
  const members = await tx
    .select({ id: schema.tasks.id, days: schema.tasks.days, archivedAt: schema.tasks.archivedAt })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.userId, ownerId), inArray(schema.tasks.id, [...taskIds])));
  if (members.length !== taskIds.length || members.some((task) => task.archivedAt !== null)) {
    throw new ProtocolError("routine_task_missing");
  }
  const [first] = members;
  const firstDays = first?.days.toSorted((a, b) => a - b) ?? [];
  if (
    members.some((task) => JSON.stringify(task.days.toSorted((a, b) => a - b)) !== JSON.stringify(firstDays))
  ) {
    throw new ProtocolError("routine_days_mismatch");
  }

  const routines = await tx
    .select({ id: schema.routines.id, taskIds: schema.routines.taskIds })
    .from(schema.routines)
    .where(and(eq(schema.routines.userId, ownerId), isNull(schema.routines.archivedAt)));
  if (
    routines.some(
      (routine) =>
        routine.id !== excludeRoutineId && routine.taskIds.some((taskId) => taskIds.includes(taskId)),
    )
  ) {
    throw new ProtocolError("routine_task_grouped");
  }
}

async function validateRoutineTaskUpdate(tx: AccountDatabase, ownerId: string, task: Task): Promise<void> {
  const routines = await tx
    .select({ id: schema.routines.id, taskIds: schema.routines.taskIds })
    .from(schema.routines)
    .where(and(eq(schema.routines.userId, ownerId), isNull(schema.routines.archivedAt)));
  const memberships = routines.filter((routine) => routine.taskIds.includes(task.id));
  if (memberships.length === 0) return;
  if (task.archivedAt !== null) throw new ProtocolError("routine_task_must_be_removed");

  for (const routine of memberships) {
    const peerIds = routine.taskIds.filter((taskId) => taskId !== task.id);
    const peers = await tx
      .select({ id: schema.tasks.id, days: schema.tasks.days })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, ownerId), inArray(schema.tasks.id, peerIds)));
    if (
      peers.length !== peerIds.length ||
      peers.some((peer) => JSON.stringify(peer.days.toSorted((a, b) => a - b)) !== JSON.stringify(task.days))
    ) {
      throw new ProtocolError("routine_days_mismatch");
    }
  }
}

async function writeRecord(
  tx: AccountDatabase,
  ownerId: string,
  mutation: Mutation,
  previous: DurableRecord | null,
): Promise<DurableRecord> {
  const revision = (previous?.revision ?? 0) + 1;
  const value = previous ? preserveCompletion(mutation.value, previous.value, mutation.kind) : mutation.value;
  if (mutation.kind === "task") {
    const task = value as Task;
    await validateRoutineTaskUpdate(tx, ownerId, task);
    const row = {
      userId: ownerId,
      id: mutation.id,
      title: task.title,
      category: task.category,
      durationMin: task.durationMin,
      priority: task.priority,
      days: task.days,
      windowStart: task.window?.start ?? null,
      windowEnd: task.window?.end ?? null,
      fixedTime: task.fixedTime ?? null,
      shortStepTitle: task.shortStep?.title ?? null,
      shortStepDurationMin: task.shortStep?.durationMin ?? null,
      archivedAt: date(task.archivedAt),
      createdAt: date((previous?.value as Task | undefined)?.createdAt ?? task.createdAt)!,
      updatedAt: date(task.updatedAt)!,
      revision,
    };
    await tx
      .insert(schema.tasks)
      .values(row)
      .onConflictDoUpdate({ target: [schema.tasks.userId, schema.tasks.id], set: row });
  } else if (mutation.kind === "routine") {
    const routine = value as Routine;
    if (routine.archivedAt === null) await validateRoutineMembers(tx, ownerId, routine.taskIds, mutation.id);
    else await validateRoutineTaskOwnership(tx, ownerId, routine.taskIds);
    const row = {
      userId: ownerId,
      id: mutation.id,
      title: routine.title,
      taskIds: routine.taskIds,
      archivedAt: date(routine.archivedAt),
      createdAt: date((previous?.value as Routine | undefined)?.createdAt ?? routine.createdAt)!,
      updatedAt: date(routine.updatedAt)!,
      revision,
    };
    await tx
      .insert(schema.routines)
      .values(row)
      .onConflictDoUpdate({ target: [schema.routines.userId, schema.routines.id], set: row });
  } else if (mutation.kind === "pending") {
    const pending = value as Pending;
    const row = {
      userId: ownerId,
      id: mutation.id,
      title: pending.title,
      durationMin: pending.durationMin,
      completedAt: date(pending.completedAt),
      deletedAt: date(pending.deletedAt),
      createdAt: date((previous?.value as Pending | undefined)?.createdAt ?? pending.createdAt)!,
      updatedAt: date(pending.updatedAt)!,
      revision,
    };
    await tx
      .insert(schema.pendings)
      .values(row)
      .onConflictDoUpdate({ target: [schema.pendings.userId, schema.pendings.id], set: row });
  } else {
    const settings = value as Settings;
    const row = {
      userId: ownerId,
      audioEnabled: settings.audioEnabled,
      sound: settings.sound,
      maxTone: settings.maxTone,
      theme: settings.theme,
      showWallet: settings.showWallet,
      locale: settings.locale ?? "es",
      taskOrder: settings.taskOrder ?? {},
      updatedAt: date(settings.updatedAt)!,
      revision,
    };
    await tx
      .insert(schema.settings)
      .values(row)
      .onConflictDoUpdate({ target: schema.settings.userId, set: row });
  }
  return (await readRecord(tx, ownerId, mutation.kind, mutation.id))!;
}

export async function readAccountData(
  db: AccountDatabase,
  authId: string,
  ifNoneMatch?: string,
  protocolVersion: 1 | 2 = 1,
): Promise<Bootstrap & { etag: string }> {
  return boundedTransaction({
    database: db,
    isolationLevel: "repeatable read",
    retries: 2,
    work: async (tx) => {
      const ownerId = await accountStage("account.owner", () => domainOwner(tx, authId, false));
      const etag = await accountStage("account.snapshot_version", () =>
        snapshotEtag(tx, ownerId, protocolVersion),
      );
      if (ifNoneMatch === etag)
        return { version: protocolVersion, accountId: authId, records: [], etag, notModified: true };
      // One MVCC snapshot across every select; the token and payload cannot mix
      // pre/post-batch states. Conditional hits never fetch these wide rows.
      const tasks = await accountStage("account.tasks", async () =>
        tx
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.userId, ownerId))
          .orderBy(asc(schema.tasks.id))
          .limit(10_001),
      );
      const pendings = await accountStage("account.pendings", async () =>
        tx
          .select()
          .from(schema.pendings)
          .where(eq(schema.pendings.userId, ownerId))
          .orderBy(asc(schema.pendings.id))
          .limit(10_001),
      );
      const routines =
        protocolVersion === 2
          ? await accountStage("account.routines", async () =>
              tx
                .select()
                .from(schema.routines)
                .where(eq(schema.routines.userId, ownerId))
                .orderBy(asc(schema.routines.id))
                .limit(10_001),
            )
          : [];
      if (tasks.length > 10_000 || pendings.length > 10_000 || routines.length > 10_000)
        throw new ProtocolError("snapshot_too_large");
      const settings = await accountStage("account.preferences", async () =>
        tx.select().from(schema.settings).where(eq(schema.settings.userId, ownerId)),
      );
      const taskById = new Map(tasks.map((task) => [task.id, task]));
      const activeMembership = new Set<string>();
      const validRoutines: schema.RoutineRow[] = [];
      const invalidRoutines: schema.RoutineRow[] = [];
      for (const routine of routines) {
        const members = Array.isArray(routine.taskIds)
          ? routine.taskIds.map((taskId) => taskById.get(taskId))
          : [];
        let valid =
          Array.isArray(routine.taskIds) &&
          members.length === routine.taskIds.length &&
          members.every((task) => task !== undefined);
        if (valid && routine.archivedAt === null) {
          const activeMembers = members.filter((task): task is (typeof tasks)[number] => task !== undefined);
          const first = activeMembers[0];
          valid =
            activeMembers.length === routine.taskIds.length &&
            activeMembers.every((task) => task.archivedAt === null) &&
            first !== undefined &&
            activeMembers.every(
              (task) =>
                JSON.stringify(task.days.toSorted((a, b) => a - b)) ===
                JSON.stringify(first.days.toSorted((a, b) => a - b)),
            ) &&
            !routine.taskIds.some((taskId) => activeMembership.has(taskId));
          if (valid) for (const taskId of routine.taskIds) activeMembership.add(taskId);
        }
        (valid ? validRoutines : invalidRoutines).push(routine);
      }
      const records: DurableRecord[] = [],
        issues: RemoteIssue[] = [];
      const collect = <T>(rows: T[], kind: DurableKind, convert: (row: T) => DurableRecord) => {
        for (const row of rows) {
          let id = kind === "settings" ? "preferences" : (row as { id: string }).id;
          try {
            validId(id);
          } catch {
            id = `invalid:${createHash("sha256").update(String(id)).digest("hex")}`;
          }
          try {
            records.push(validRecord(convert(row), protocolVersion));
          } catch {
            // Keep the server row and any local copy. Report quarantine, never silently omit it.
            issues.push({ key: entityKey(kind, id), kind, id, code: "invalid_record" });
          }
        }
      };
      collect(tasks, "task", taskRecord);
      collect(pendings, "pending", pendingRecord);
      collect(validRoutines, "routine", routineRecord);
      collect(settings, "settings", settingsRecord);
      for (const routine of invalidRoutines) {
        let id = routine.id;
        try {
          validId(id);
        } catch {
          id = `invalid:${createHash("sha256").update(String(id)).digest("hex")}`;
        }
        issues.push({ key: entityKey("routine", id), kind: "routine", id, code: "invalid_record" });
      }
      return {
        version: protocolVersion,
        accountId: authId,
        records,
        etag,
        ...(issues.length ? { issues } : {}),
      };
    },
  });
}
export async function mutateAccountData(
  db: AccountDatabase,
  authId: string,
  mutations: Mutation[],
  protocolVersion: 1 | 2 = 1,
): Promise<MutationResult[]> {
  return boundedTransaction({
    database: db,
    retries: 2,
    work: async (tx) => {
      const ownerId = await domainOwner(tx, authId, true);
      if (protocolVersion === 1 && mutations.some((mutation) => mutation.kind === "routine")) {
        throw new ProtocolError("invalid_kind");
      }
      const results: MutationResult[] = [];
      for (const mutation of mutations) {
        const receiptKey = `sync:v${protocolVersion}:${mutation.operationId}`;
        const hash = createHash("sha256").update(canonicalJSON(mutation)).digest("hex");
        const [receipt] = await tx
          .select()
          .from(schema.metadata)
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
        const effective = previous
          ? preserveCompletion(mutation.value, previous.value, mutation.kind)
          : mutation.value;
        const unchanged = previous && sameValue(effective, previous.value);
        const record = unchanged ? previous : await writeRecord(tx, ownerId, mutation, previous);
        const result: MutationResult = { operationId: mutation.operationId, status: "applied", record };
        await tx.insert(schema.metadata).values({
          userId: ownerId,
          key: receiptKey,
          value: JSON.parse(JSON.stringify({ hash, result })) as JsonValue,
        });
        results.push(result);
      }
      return results;
    },
  });
}
