import { currentDatabaseName, openDatabase } from "@/lib/db/database";
import { updateSettings, type SettingsPatch } from "@/lib/db/repository";
import { mirrorPreferences } from "./browser-preferences";
import type { Settings } from "@/lib/domain/types";

type Field = keyof SettingsPatch;
export interface PreferenceWriteState {
  pending: number;
  failed: number;
}
interface Entry {
  tail: Promise<unknown>;
  fields: Map<Field, { version: number; value: unknown; failed: boolean }>;
  version: number;
  listeners: Set<() => void>;
  state: PreferenceWriteState;
}
const spaces = new Map<string, Entry>();
function entry(name: string): Entry {
  let item = spaces.get(name);
  if (!item) {
    item = {
      tail: Promise.resolve(),
      fields: new Map(),
      version: 0,
      listeners: new Set(),
      state: { pending: 0, failed: 0 },
    };
    spaces.set(name, item);
  }
  return item;
}
function notify(item: Entry) {
  const failed = [...item.fields.values()].filter((field) => field.failed).length;
  item.state = { pending: item.fields.size - failed, failed };
  for (const listener of item.listeners) listener();
}
export function preferenceWriteState(name: string): PreferenceWriteState {
  return entry(name).state;
}
export function subscribePreferenceWrites(name: string, listener: () => void): () => void {
  const item = entry(name);
  item.listeners.add(listener);
  return () => {
    item.listeners.delete(listener);
  };
}
/** Serial, scoped and retryable. Failed values stay in memory; never claim them durable. */
export function writePreferences(name: string, patch: SettingsPatch): Promise<Settings> {
  const item = entry(name),
    version = ++item.version;
  const fields = Object.keys(patch) as Field[];
  for (const field of fields) item.fields.set(field, { version, value: patch[field], failed: false });
  notify(item);
  async function perform(): Promise<Settings> {
    if (name !== currentDatabaseName()) throw new Error("preference_space_changed");
    const db = await openDatabase(name);
    try {
      // Re-check after the bounded open: a switch during it must not write here.
      if (name !== currentDatabaseName()) throw new Error("preference_space_changed");
      const result = await updateSettings(db, patch);
      await mirrorPreferences(db);
      return result;
    } finally {
      db.close();
    }
  }
  const write = item.tail.then(perform);

  item.tail = write.catch(() => {});
  return write.then(
    (settings) => {
      for (const field of fields) if (item.fields.get(field)?.version === version) item.fields.delete(field);
      notify(item);
      return settings;
    },
    (error) => {
      for (const field of fields) {
        const current = item.fields.get(field);
        if (current?.version === version) current.failed = true;
      }
      notify(item);
      throw error;
    },
  );
}
export function retryPreferenceWrites(name: string): Promise<Settings> {
  const fields = [...entry(name).fields].filter(([, field]) => field.failed);
  return writePreferences(
    name,
    Object.fromEntries(fields.map(([key, field]) => [key, field.value])) as SettingsPatch,
  );
}
