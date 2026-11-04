import { activeStorageKey, currentDatabaseName, type RunoDatabase } from "@/lib/db/database";
import { SPACE_STORAGE_KEYS } from "@/lib/db/local-space";

/** Browser mirrors only; durable values live in IndexedDB and the account outbox. */
export async function mirrorPreferences(db: RunoDatabase): Promise<void> {
  if (typeof window === "undefined") return;
  const settings = await db.settings.get("preferences");
  if (!settings || db.name !== currentDatabaseName()) return;
  try {
    if (settings.locale) localStorage.setItem(activeStorageKey(SPACE_STORAGE_KEYS.locale), settings.locale);
    if (settings.taskOrder)
      localStorage.setItem(
        activeStorageKey(SPACE_STORAGE_KEYS.taskOrder),
        JSON.stringify(settings.taskOrder),
      );
    localStorage.setItem(activeStorageKey(SPACE_STORAGE_KEYS.theme), settings.theme);
  } catch {
    /* Storage may be disabled; IndexedDB remains authoritative. */
  }
}
