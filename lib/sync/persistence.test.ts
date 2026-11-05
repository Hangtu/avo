import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { openDatabaseForSpace, type RunoDatabase } from "@/lib/db/database";
import {
  completePendingDirect,
  completeSession,
  createPending,
  createTask,
  getSettings,
  listPendings,
  saveSettings,
  startPendingSession,
  startSession,
  updateTask,
  updateSettings,
} from "@/lib/db/repository";
import { seedDatabase } from "@/lib/db/seed";
import * as schema from "@/lib/db/schema";
import { MONDAY, NOW, taskInput } from "@/tests/fixtures";
import { setupTestDatabase } from "@/tests/database";
import { acknowledge, resolveConflict } from "./local";
import { recoverRejected, SyncHttpError, syncOnce, type SyncTransport } from "./client";
import { mutateAccountData, readAccountData } from "./server-repository";
import { mutationForWire, canonicalJSON, validMutation, type Mutation } from "./protocol";
import type { Pending, Settings, Task } from "@/lib/domain/types";

vi.mock("server-only", () => ({}));
const guestDb = setupTestDatabase();
const connections: RunoDatabase[] = [];
const pg = new PGlite();
const remote = drizzle(pg, { schema });
const pendingValue = (id = "p1", title = "Buro"): Pending => ({
  id,
  title,
  durationMin: 25,
  createdAt: NOW,
  updatedAt: NOW,
  completedAt: null,
  deletedAt: null,
});
const op = (value: Pending, baseRevision = 0): Mutation => ({
  operationId: crypto.randomUUID(),
  kind: "pending",
  id: value.id,
  baseRevision,
  value,
});
const transport: SyncTransport = {
  bootstrap: (accountId) => readAccountData(remote, accountId),
  mutate: (accountId, items) => mutateAccountData(remote, accountId, items.map(validMutation)),
};
beforeAll(async () => {
  for (const name of [
    "0000_yellow_zodiak.sql",
    "0001_zippy_sentinel.sql",
    "0002_dry_lethal_legion.sql",
    "0003_account_spaces.sql",
  ]) {
    await pg.exec(readFileSync(new URL(`../../drizzle/${name}`, import.meta.url), "utf8"));
  }
});
afterEach(async () => {
  vi.restoreAllMocks();
  const unique = new Map(connections.map((db) => [db.name, db]));
  for (const db of connections) db.close();
  for (const db of unique.values()) {
    if (!db.name.startsWith("runo-user-runo-test-")) throw new Error("Unsafe test cleanup");
    await db.delete();
  }
  connections.length = 0;
});
afterAll(() => pg.close());
async function identity() {
  const id = `runo-test-${crypto.randomUUID()}`;
  await remote
    .insert(schema.authUsers)
    .values({ id, name: "Synthetic", email: `${id}@example.test`, emailVerified: true });
  return id;
}
async function local(accountId = `runo-test-${crypto.randomUUID()}`) {
  const db = await openDatabaseForSpace({ kind: "account", userId: accountId });
  connections.push(db);
  return db;
}

describe("durable local queue — no real browser or network", () => {
  it("keeps guests offline without a queue and accounts empty without a personal seed", async () => {
    const guest = await guestDb();
    await createPending(guest, "p1", { title: "Guest", durationMin: 25 }, NOW);
    expect(await guest.outbox.count()).toBe(0);
    const account = await local();
    await seedDatabase(account, NOW);
    expect(await account.tasks.count()).toBe(0);
    expect(await account.outbox.count()).toBe(0);
    expect(await account.pendings.count()).toBe(0);
  });
  it("rolls back a pending if the outbox write fails", async () => {
    const db = await local();
    vi.spyOn(db.outbox, "put").mockRejectedValueOnce(new Error("synthetic quota failure"));
    await expect(createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW)).rejects.toThrow("quota");
    expect(await db.pendings.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
  it("retains the queue across close/reopen and coalesces creation and completion", async () => {
    const db = await local();
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    await completePendingDirect(db, "p1", NOW + 1);
    db.close();
    const reopened = await local(db.accountId!);
    expect(await reopened.outbox.count()).toBe(1);
    expect((await reopened.outbox.get("pending:p1"))?.value).toMatchObject({ completedAt: NOW + 1 });
  });
  it("does not clear a newer local edit on an in-flight acknowledgement", async () => {
    const db = await local();
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    const sent = (await db.outbox.get("pending:p1"))!;
    await completePendingDirect(db, "p1", NOW + 1);
    await acknowledge(db, sent, {
      operationId: sent.operationId,
      status: "applied",
      record: {
        key: sent.key,
        kind: "pending",
        id: "p1",
        revision: 1,
        value: sent.value,
      },
    });
    expect((await db.outbox.get(sent.key))?.baseRevision).toBe(1);
    expect((await db.outbox.get(sent.key))?.value).toMatchObject({ completedAt: NOW + 1 });
    expect((await db.pendings.get("p1"))?.completedAt).toBe(NOW + 1);
  });
  it("rejects a different account before invoking the transport", async () => {
    const db = await local();
    const bootstrap = vi.fn();
    await expect(syncOnce(db, "other-account", { ...transport, bootstrap })).rejects.toThrow(
      "local_account_mismatch",
    );
    expect(bootstrap).not.toHaveBeenCalled();
  });
  it("keeps offline writes after a failed request", async () => {
    const db = await local();
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    await expect(
      syncOnce(db, db.accountId!, {
        ...transport,
        bootstrap: async () => {
          throw new Error("offline");
        },
      }),
    ).rejects.toThrow("offline");
    expect(await db.outbox.count()).toBe(1);
    expect(await listPendings(db)).toHaveLength(1);
  });
});

describe("selective account persistence — real SQL in local PGlite", () => {
  it("recovers a created pending after discarding all local account storage", async () => {
    const id = await identity();
    const db = await local(id);
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    await syncOnce(db, id, transport);
    expect(await db.outbox.count()).toBe(0);
    db.close();
    await db.delete();
    const empty = await local(id);
    expect(await empty.pendings.count()).toBe(0);
    await syncOnce(empty, id, transport);
    expect(await listPendings(empty)).toEqual([pendingValue()]);
    expect(await empty.sessions.count()).toBe(0);
    expect(await empty.events.count()).toBe(0);
  });
  it("isolates A and B with identical entity IDs and never adopts legacy owner data", async () => {
    const a = await identity(),
      b = await identity();
    await remote.insert(schema.users).values({ id: "owner" }).onConflictDoNothing();
    await remote
      .insert(schema.pendings)
      .values({ userId: "owner", id: "legacy", title: "Private legacy", durationMin: 25 })
      .onConflictDoNothing();
    await mutateAccountData(remote, a, [op(pendingValue("same", "A only"))]);
    await mutateAccountData(remote, b, [op(pendingValue("same", "B only"))]);
    const recordsA = (await readAccountData(remote, a)).records;
    const recordsB = (await readAccountData(remote, b)).records;
    expect(recordsA.map((row) => (row.value as Pending).title)).toEqual(["A only"]);
    expect(recordsB.map((row) => (row.value as Pending).title)).toEqual(["B only"]);
    const guest = await guestDb();
    expect(await guest.pendings.count()).toBe(0);
    expect((await pg.query("SELECT title FROM runo_pendings WHERE user_id = 'owner'")).rows).toEqual([
      { title: "Private legacy" },
    ]);
  });
  it("binds old same-internal-ID auth rows without claiming another domain user", async () => {
    const id = await identity();
    await remote.insert(schema.users).values({ id });
    await readAccountData(remote, id);
    const result = await pg.query<{ auth_user_id: string }>(
      "SELECT auth_user_id FROM runo_users WHERE id = $1",
      [id],
    );
    expect(result.rows[0].auth_user_id).toBe(id);
  });
  it("refuses to expose the legacy owner even if a bad pre-existing link is present", async () => {
    const id = await identity();
    await remote.insert(schema.users).values({ id: "owner" }).onConflictDoNothing();
    await pg.query("UPDATE runo_users SET auth_user_id = $1 WHERE id = 'owner'", [id]);
    try {
      await expect(readAccountData(remote, id)).rejects.toThrow("legacy_owner_protected");
    } finally {
      await pg.exec("UPDATE runo_users SET auth_user_id = NULL WHERE id = 'owner'");
    }
  });
  it("deduplicates a lost response by operation receipt and rejects reused payloads", async () => {
    const id = await identity(),
      mutation = op(pendingValue());
    const first = await mutateAccountData(remote, id, [mutation]);
    const retry = await mutateAccountData(remote, id, [mutation]);
    expect(retry).toEqual(first);
    expect(first[0].record.revision).toBe(1);
    await expect(
      mutateAccountData(remote, id, [{ ...mutation, value: pendingValue("p1", "Changed payload") }]),
    ).rejects.toThrow("operation_reused");
    expect((await readAccountData(remote, id)).records).toHaveLength(1);
  });
  it("restores task definitions and portable preferences without recurring results", async () => {
    const id = await identity(),
      db = await local(id);
    await createTask(db, "routine", taskInput({ fixedTime: "08:00" }), NOW);
    await saveSettings(db, {
      ...(await getSettings(db, NOW)),
      theme: "dark",
      locale: "en",
      taskOrder: { routine: 0 },
    });
    await syncOnce(db, id, transport);
    const records = (await readAccountData(remote, id)).records;
    expect(records.map((row) => row.kind).sort()).toEqual(["settings", "task"]);
    const emptyId = db.accountId!;
    db.close();
    await db.delete();
    const fresh = await local(emptyId);
    await syncOnce(fresh, id, transport);
    expect(await fresh.tasks.get("routine")).toMatchObject({
      title: "Lavar ropa",
      fixedTime: "08:00",
      shortStep: { durationMin: 1 },
    });
    expect(await fresh.settings.get("preferences")).toMatchObject({
      theme: "dark",
      locale: "en",
      taskOrder: { routine: 0 },
    });
    for (const table of [
      schema.sessions,
      schema.events,
      schema.ledger,
      schema.occurrences,
      schema.days,
      schema.hands,
    ]) {
      expect(await remote.select().from(table)).toHaveLength(0);
    }
  });
  it("uploads a pending's completion once, preserving history and never reopening it", async () => {
    const id = await identity(),
      db = await local(id);
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    await syncOnce(db, id, transport);
    await startPendingSession(db, { pendingId: "p1", sessionId: "timer", now: NOW + 1 });
    expect(await db.outbox.count()).toBe(0);
    await completeSession(db, "timer", NOW + 2);
    expect(await db.outbox.count()).toBe(1);
    await syncOnce(db, id, transport);
    await completeSession(db, "timer", NOW + 3);
    expect(await db.outbox.count()).toBe(0);
    const [record] = (await readAccountData(remote, id)).records;
    const staleReopen = await mutateAccountData(remote, id, [
      op(pendingValue("p1", "Stale renamed title"), record.revision),
    ]);
    expect(staleReopen[0].record.value).toMatchObject({ title: "Buro", completedAt: NOW + 2 });
    expect((await readAccountData(remote, id)).records).toHaveLength(1);
    db.close();
    await db.delete();
    const fresh = await local(id);
    await syncOnce(fresh, id, transport);
    expect(await listPendings(fresh)).toHaveLength(0);
    expect(await listPendings(fresh, true)).toHaveLength(1);
    expect((await fresh.pendings.get("p1"))?.title).toBe("Buro");
    expect(await remote.select().from(schema.sessions)).toHaveLength(0);
  });
  it("does not enqueue or remotely write recurring timer transitions/results", async () => {
    const id = await identity(),
      db = await local(id);
    await createTask(db, "routine", taskInput(), NOW);
    await syncOnce(db, id, transport);
    await startSession(db, {
      sessionId: "routine-session",
      taskId: "routine",
      date: MONDAY,
      variant: "full",
      now: NOW + 1,
    });
    await completeSession(db, "routine-session", NOW + 2);
    expect(await db.outbox.count()).toBe(0);
    const mutate = vi.fn(transport.mutate);
    await syncOnce(db, id, { ...transport, mutate });
    expect(mutate).not.toHaveBeenCalled();
    expect((await readAccountData(remote, id)).records.map((row) => row.kind)).toEqual(["task"]);
  });
  it("preserves both conflicting versions until a person chooses, then retries at the new revision", async () => {
    const id = await identity(),
      db = await local(id);
    await createTask(db, "routine", taskInput(), NOW);
    await syncOnce(db, id, transport);
    const original = (await readAccountData(remote, id)).records[0];
    await mutateAccountData(remote, id, [
      {
        operationId: crypto.randomUUID(),
        kind: "task",
        id: "routine",
        baseRevision: 1,
        value: { ...(original.value as Task), title: "Another device", updatedAt: NOW + 1 },
      },
    ]);
    await updateTask(db, "routine", taskInput({ title: "My local edit" }), NOW + 2, "edit-local");
    await syncOnce(db, id, transport);
    const conflict = (await db.outbox.get("task:routine"))!;
    expect(conflict.state).toBe("conflict");
    expect((conflict.remote?.value as Task).title).toBe("Another device");
    expect((await db.tasks.get("routine"))?.title).toBe("My local edit");
    await resolveConflict(db, conflict.key, "local");
    expect((await db.outbox.get(conflict.key))?.baseRevision).toBe(2);
    await syncOnce(db, id, transport);
    expect(await db.outbox.count()).toBe(0);
    expect(((await readAccountData(remote, id)).records[0].value as Task).title).toBe("My local edit");
  });
  it("rolls back the entire server batch if a later operation cannot be applied", async () => {
    const id = await identity();
    await expect(
      mutateAccountData(remote, id, [op(pendingValue()), op(pendingValue("missing"), 5)]),
    ).rejects.toThrow("record_missing");
    expect((await readAccountData(remote, id)).records).toHaveLength(0);
  });
  it("atomically patches overlapping preferences without losing either field", async () => {
    const db = await local();
    await Promise.all([
      updateSettings(db, { locale: "en" }, NOW),
      updateSettings(db, { theme: "dark" }, NOW + 1),
    ]);
    expect(await getSettings(db, NOW)).toMatchObject({ locale: "en", theme: "dark" });
    expect((await db.outbox.get("settings:preferences"))?.value).toMatchObject({
      locale: "en",
      theme: "dark",
    });
    vi.spyOn(db.outbox, "put").mockRejectedValueOnce(new Error("quota"));
    await expect(updateSettings(db, { locale: "es" }, NOW + 2)).rejects.toThrow("quota");
    expect((await getSettings(db, NOW)).locale).toBe("en");
  });
  it("merges disjoint preference fields across devices without blocking settings", async () => {
    const id = await identity(),
      db = await local(id);
    await updateSettings(db, { locale: "es", theme: "auto" }, NOW);
    await syncOnce(db, id, transport);
    const record = (await readAccountData(remote, id)).records[0];
    await mutateAccountData(remote, id, [
      {
        operationId: crypto.randomUUID(),
        kind: "settings",
        id: "preferences",
        baseRevision: record.revision,
        value: { ...record.value, locale: "en", updatedAt: NOW + 1 } as Settings,
      },
    ]);
    await updateSettings(db, { theme: "dark" }, NOW + 2);
    await syncOnce(db, id, transport);
    expect(await getSettings(db, NOW)).toMatchObject({ locale: "en", theme: "dark" });
    expect(await db.outbox.count()).toBe(0);
    expect((await readAccountData(remote, id)).records[0].value).toMatchObject({
      locale: "en",
      theme: "dark",
    });
  });
  it("still asks about concurrent changes to the same preference field", async () => {
    const id = await identity(),
      db = await local(id);
    await updateSettings(db, { theme: "auto" }, NOW);
    await syncOnce(db, id, transport);
    const record = (await readAccountData(remote, id)).records[0];
    await mutateAccountData(remote, id, [
      {
        operationId: crypto.randomUUID(),
        kind: "settings",
        id: "preferences",
        baseRevision: 1,
        value: { ...record.value, theme: "light", updatedAt: NOW + 1 } as Settings,
      },
    ]);
    await updateSettings(db, { theme: "dark" }, NOW + 2);
    await syncOnce(db, id, transport);
    expect((await db.outbox.get("settings:preferences"))?.state).toBe("conflict");
    expect((await getSettings(db, NOW)).theme).toBe("dark");
  });
  it("isolates a missing row, sends healthy changes, and never automatically recreates it", async () => {
    const id = await identity(),
      db = await local(id);
    await createPending(db, "p2", { title: "Removed on server", durationMin: 25 }, NOW);
    await syncOnce(db, id, transport);
    await completePendingDirect(db, "p2", NOW + 1);
    await createPending(db, "p1", { title: "Healthy", durationMin: 25 }, NOW + 2);
    await pg.query("DELETE FROM runo_pendings WHERE user_id = $1 AND id = 'p2'", [`account:${id}`]);
    await syncOnce(db, id, transport);
    expect(await db.outbox.get("pending:p2")).toMatchObject({
      state: "rejected",
      error: "record_missing",
      baseRevision: 1,
    });
    expect((await db.pendings.get("p2"))?.completedAt).toBe(NOW + 1);
    expect((await readAccountData(remote, id)).records.map((row) => row.id)).toEqual(["p1"]);
    const mutate = vi.fn(transport.mutate);
    await syncOnce(db, id, { ...transport, mutate });
    expect(mutate).not.toHaveBeenCalled();
    await recoverRejected(db, "pending:p2", "local-only");
    expect((await db.outbox.get("pending:p2"))?.state).toBe("local-only");
    await recoverRejected(db, "pending:p2", "retry");
    await syncOnce(db, id, transport);
    expect(await db.outbox.get("pending:p2")).toMatchObject({ state: "rejected", baseRevision: 1 });
    expect((await readAccountData(remote, id)).records.map((row) => row.id)).toEqual(["p1"]);
  });
  it("keeps throttled writes queued with their original idempotency key", async () => {
    const db = await local();
    await createPending(db, "throttled", { title: "Retained", durationMin: 25 }, NOW);
    const queued = await db.outbox.get("pending:throttled");
    await expect(
      syncOnce(
        db,
        db.accountId!,
        {
          ...transport,
          mutate: async () => {
            throw new SyncHttpError(429, "rate_limited");
          },
        },
        { pull: false },
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(await db.outbox.get("pending:throttled")).toEqual(queued);
    expect(await db.pendings.get("throttled")).toMatchObject({ title: "Retained", completedAt: null });
  });
  it("bisects an HTTP rejection and does not quarantine a newer edit for an old failure", async () => {
    const db = await local();
    await createPending(db, "bad", { title: "Retained", durationMin: 25 }, NOW);
    await createPending(db, "good", { title: "Healthy", durationMin: 25 }, NOW);
    const mutate = vi.fn(async (_id: string, batch: Mutation[]) => {
      if (batch.some((item) => item.id === "bad")) throw new SyncHttpError(400, "invalid_request");
      return batch.map((item) => ({
        operationId: item.operationId,
        status: "applied" as const,
        record: {
          key: `${item.kind}:${item.id}`,
          kind: item.kind,
          id: item.id,
          revision: 1,
          value: item.value,
        },
      }));
    });
    await syncOnce(db, db.accountId!, { ...transport, mutate }, { pull: false });
    expect(await db.outbox.get("pending:good")).toBeUndefined();
    expect((await db.outbox.get("pending:bad"))?.state).toBe("rejected");
    await recoverRejected(db, "pending:bad", "retry");
    await syncOnce(
      db,
      db.accountId!,
      {
        ...transport,
        mutate: async () => {
          await completePendingDirect(db, "bad", NOW + 1);
          throw new SyncHttpError(400, "invalid_request");
        },
      },
      { pull: false },
    );
    expect(await db.outbox.get("pending:bad")).toMatchObject({
      state: "queued",
      value: { completedAt: NOW + 1 },
    });
  });
  it("quarantines an invalid local payload without blocking healthy queued items", async () => {
    const id = await identity(),
      db = await local(id);
    await createPending(db, "good", { title: "Healthy", durationMin: 25 }, NOW);
    const sent = (await db.outbox.get("pending:good"))!;
    await db.outbox.put({
      ...sent,
      id: "bad",
      key: "pending:bad",
      operationId: crypto.randomUUID(),
      value: pendingValue("bad", "x".repeat(600000)),
    });
    await syncOnce(db, id, transport);
    expect((await db.outbox.get("pending:bad"))?.state).toBe("rejected");
    expect(await db.outbox.get("pending:good")).toBeUndefined();
  });
  it("reports invalid server rows without losing local copies or blocking valid rows", async () => {
    const id = await identity(),
      db = await local(id);
    await createTask(db, "routine", taskInput(), NOW);
    await syncOnce(db, id, transport);
    await pg.query("UPDATE runo_tasks SET days = '{}' WHERE user_id = $1", [`account:${id}`]);
    await mutateAccountData(remote, id, [op(pendingValue("healthy"))]);
    await syncOnce(db, id, transport);
    expect((await db.tasks.get("routine"))?.days).toEqual([1]);
    expect(await db.pendings.get("healthy")).toBeDefined();
    expect((await readAccountData(remote, id)).issues).toEqual([
      { key: "task:routine", kind: "task", id: "routine", code: "invalid_record" },
    ]);
    expect((await db.metadata.get("account-issues-v1"))?.value).toHaveLength(1);
    expect(
      (
        await pg.query<{ days: number[] }>("SELECT days FROM runo_tasks WHERE user_id = $1", [
          `account:${id}`,
        ])
      ).rows[0].days,
    ).toEqual([]);
  });
  it("uses a canonical receipt hash even when validated object/nested keys change order", async () => {
    const id = await identity(),
      db = await local(id);
    await updateSettings(db, { locale: "en", taskOrder: { b: 1, a: 0 } }, NOW);
    const original = validMutation(mutationForWire((await db.outbox.get("settings:preferences"))!));
    const first = await mutateAccountData(remote, id, [original]);
    const reversed = Object.fromEntries(Object.entries(original.value).reverse());
    reversed.taskOrder = { a: 0, b: 1 };
    expect(await mutateAccountData(remote, id, [validMutation({ ...original, value: reversed })])).toEqual(
      first,
    );
  });
  it("does not fetch a full snapshot for a push-only pass", async () => {
    const id = await identity(),
      db = await local(id),
      bootstrap = vi.fn(transport.bootstrap);
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    await syncOnce(db, id, { ...transport, bootstrap }, { pull: false });
    expect(bootstrap).not.toHaveBeenCalled();
    expect(await db.outbox.count()).toBe(0);
  });
  it("only persists bootstrap metadata once and sends its ETag on subsequent pulls", async () => {
    const db = await local(),
      etag = '"synthetic-account-version"';
    const bootstrap = vi.fn(async (accountId: string, previous?: string) => ({
      version: 1 as const,
      accountId,
      records: [],
      etag,
      ...(previous ? { notModified: true } : {}),
    }));
    await syncOnce(db, db.accountId!, { ...transport, bootstrap });
    const put = vi.spyOn(db.metadata, "put");
    await syncOnce(db, db.accountId!, { ...transport, bootstrap });
    expect(bootstrap.mock.calls[1]).toEqual([db.accountId, etag]);
    expect(put).not.toHaveBeenCalled();
  });
  it("serializes overlapping sync passes in the same space", async () => {
    const id = await identity(),
      db = await local(id);
    let active = 0,
      maximum = 0;
    const bootstrap = async (accountId: string) => {
      active++;
      maximum = Math.max(active, maximum);
      await new Promise((resolve) => setTimeout(resolve, 10));
      try {
        return await transport.bootstrap(accountId);
      } finally {
        active--;
      }
    };
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    await Promise.all([
      syncOnce(db, id, { ...transport, bootstrap }),
      syncOnce(db, id, { ...transport, bootstrap }),
    ]);
    expect(maximum).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });
  it("uses the confirmed title/date when both conflicting versions are complete", async () => {
    const db = await local();
    await createPending(db, "p1", { title: "Local", durationMin: 25 }, NOW);
    await completePendingDirect(db, "p1", NOW + 2);
    const item = (await db.outbox.get("pending:p1"))!;
    const record = {
      key: item.key,
      kind: "pending" as const,
      id: "p1",
      revision: 1,
      value: { ...pendingValue("p1", "Confirmed"), completedAt: NOW + 1 },
    };
    await db.syncRecords.put(record);
    await db.outbox.put({ ...item, state: "conflict", remote: record });
    await resolveConflict(db, item.key, "remote");
    expect(await db.pendings.get("p1")).toMatchObject({ title: "Confirmed", completedAt: NOW + 1 });
    expect(await db.outbox.count()).toBe(0);
  });
  it("returns records in a canonical order so the ETag stays stable", async () => {
    const id = await identity();
    for (const key of ["z", "a", "m"]) await mutateAccountData(remote, id, [op(pendingValue(key))]);
    const first = await readAccountData(remote, id);
    const second = await readAccountData(remote, id);
    expect(first.records.map((row) => row.id)).toEqual(["a", "m", "z"]);
    expect(canonicalJSON(first)).toBe(canonicalJSON(second));
  });
  it("returns conditional snapshots without loading wide rows and invalidates only durable changes", async () => {
    const id = await identity();
    const mutation = op(pendingValue("conditional"));
    await mutateAccountData(remote, id, [mutation]);
    const first = await readAccountData(remote, id);
    const query = vi.spyOn(pg, "query");
    const unchanged = await readAccountData(remote, id, first.etag);
    expect(unchanged).toMatchObject({ records: [], notModified: true, etag: first.etag });
    const statements = query.mock.calls.map(([statement]) => String(statement));
    expect(statements.some((statement) => /"title"|"duration_min"|"task_order"/.test(statement))).toBe(false);
    query.mockRestore();
    await mutateAccountData(remote, id, [mutation]); // replay only: no invalidation
    expect((await readAccountData(remote, id)).etag).toBe(first.etag);
    const update = op(pendingValue("conditional", "Changed"), 1);
    await mutateAccountData(remote, id, [update]);
    const changed = await readAccountData(remote, id, first.etag);
    expect(changed.notModified).toBeUndefined();
    expect(changed.etag).not.toBe(first.etag);
    expect(changed.records[0]?.value).toMatchObject({ title: "Changed" });
    // An older application writer knows revisions, not a new metadata token.
    const [owner] = await remote.select().from(schema.users).where(eq(schema.users.authUserId, id));
    await remote
      .update(schema.pendings)
      .set({ title: "Legacy writer", revision: sql`${schema.pendings.revision} + 1` })
      .where(and(eq(schema.pendings.userId, owner.id), eq(schema.pendings.id, "conditional")));
    const legacy = await readAccountData(remote, id, changed.etag);
    expect(legacy.notModified).toBeUndefined();
    expect(legacy.records[0]?.value).toMatchObject({ title: "Legacy writer" });
    expect((await readAccountData(remote, await identity(), first.etag)).notModified).toBeUndefined();
  });
  it("leaves a queued completion intact if a response is interrupted after the server commit", async () => {
    const id = await identity(),
      db = await local(id);
    await createPending(db, "p1", { title: "Buro", durationMin: 25 }, NOW);
    const sent = (await db.outbox.get("pending:p1"))!;
    await mutateAccountData(remote, id, [validMutation(mutationForWire(sent))]);
    expect(await db.outbox.count()).toBe(1);
    await syncOnce(db, id, transport);
    expect(await db.outbox.count()).toBe(0);
    expect((await readAccountData(remote, id)).records).toHaveLength(1);
  });
});
