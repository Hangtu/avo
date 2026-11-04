import { openDatabaseForSpace, type RunoDatabase } from "@/lib/db/database";
import { SPACE_STORAGE_KEYS } from "@/lib/db/local-space";
import { newOperationId, stableDigest } from "@/lib/domain/id";
import type { Pending, Settings, Task } from "@/lib/domain/types";
import { defaultSettings } from "@/lib/domain/validation";
import { allDurableTables, enqueue } from "./local";
import { ProtocolError, validTaskOrder } from "./protocol";

export interface GuestPreview {
  tasks: Task[];
  pendings: Pending[];
  settings: Settings;
}
async function preview(db: RunoDatabase): Promise<GuestPreview> {
  const result = await db.transaction("r", db.tasks, db.pendings, db.settings, async () => ({
    tasks: await db.tasks.orderBy("id").toArray(),
    pendings: await db.pendings.orderBy("id").toArray(),
    settings: (await db.settings.get("preferences")) ?? defaultSettings(0),
  }));
  try {
    const locale = localStorage.getItem(SPACE_STORAGE_KEYS.locale);
    if (locale === "es" || locale === "en") result.settings.locale = locale;
    const order = localStorage.getItem(SPACE_STORAGE_KEYS.taskOrder);
    if (order) result.settings.taskOrder = validTaskOrder(JSON.parse(order));
  } catch {
    /* Optional legacy browser preferences. */
  }
  return result;
}
export async function guestPreview(): Promise<GuestPreview> {
  const db = await openDatabaseForSpace({ kind: "guest" });
  try {
    return await preview(db);
  } finally {
    db.close();
  }
}
function importedId(source: string, kind: string, id: string): string {
  return `guest:${stableDigest(`${source}:${kind}:${id}`)}`;
}
/** Explicit consent only. Neither guest definitions nor existing account rows are removed/replaced. */
export async function importGuest(db: RunoDatabase, consented: GuestPreview): Promise<{ added: number }> {
  if (!db.accountId) throw new ProtocolError("account_required");
  const guest = await openDatabaseForSpace({ kind: "guest" });
  try {
    const current = await preview(guest);
    if (JSON.stringify(current) !== JSON.stringify(consented))
      throw new ProtocolError("guest_changed_review_again");
    const source = await guest.transaction("rw", guest.metadata, async () => {
      const stored = await guest.metadata.get("guest-source-v1");
      if (typeof stored?.value === "string") return stored.value;
      const id = newOperationId();
      await guest.metadata.put({ key: "guest-source-v1", value: id });
      return id;
    });
    const fingerprint = importedId(source, "preview", JSON.stringify(current));
    const taskIds = new Map(
      current.tasks.map((task) => [task.id, importedId(source, "task", task.id)] as const),
    );
    const pendingIds = new Map(
      current.pendings.map((pending) => [pending.id, importedId(source, "pending", pending.id)] as const),
    );
    return await db.transaction("rw", allDurableTables(db), async () => {
      let added = 0;
      // A recovery receipt and imported rows/outbox commit together. Guest remains untouched.
      const receiptKey = `guest-import-v1:${source}:${fingerprint}`;
      const receipt = await db.metadata.get(receiptKey);
      for (const original of current.tasks) {
        const id = taskIds.get(original.id)!;
        if (await db.tasks.get(id)) continue;
        const task = { ...original, id };
        await db.tasks.add(task);
        await enqueue(db, "task", task);
        added++;
      }
      for (const original of current.pendings) {
        const id = pendingIds.get(original.id)!;
        if (await db.pendings.get(id)) continue;
        const pending = { ...original, id };
        await db.pendings.add(pending);
        await enqueue(db, "pending", pending);
        added++;
      }
      if (
        !receipt &&
        !(await db.syncRecords.get("settings:preferences")) &&
        !(await db.outbox.get("settings:preferences"))
      ) {
        const taskOrder = Object.fromEntries(
          Object.entries(current.settings.taskOrder ?? {}).flatMap(([id, order]) =>
            taskIds.has(id) ? [[taskIds.get(id)!, order]] : [],
          ),
        );
        const settings = { ...current.settings, taskOrder, updatedAt: Date.now() };
        await db.settings.put(settings);
        await enqueue(db, "settings", settings);
      }
      if (!receipt)
        await db.metadata.add({
          key: receiptKey,
          value: JSON.parse(JSON.stringify({ at: Date.now(), source, original: current })),
        });
      return { added };
    });
  } finally {
    guest.close();
  }
}
