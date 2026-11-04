/** Pure local namespacing. A space selector is NOT proof of authentication. */
export type LocalSpace = { readonly kind: "guest" } | { readonly kind: "account"; readonly userId: string };

export const GUEST_SPACE: LocalSpace = { kind: "guest" };
export const LEGACY_DATABASE_NAME = "runo";

// Keep the exact existing keys for guests. Only these Runo-owned keys may be
// removed by scoped storage cleanup; never Storage.clear() or prefix guessing.
export const SPACE_STORAGE_KEYS = {
  locale: "runo:locale",
  theme: "runo-theme-mode",
  taskOrder: "runo:task-editor-order:v1",
  taskDraft: "runo:task-editor-draft:v1",
  closedSections: "runo:task-editor-closed-sections:v1",
} as const;
export type SpaceStorageKey = (typeof SPACE_STORAGE_KEYS)[keyof typeof SPACE_STORAGE_KEYS];

function encodedAccountId(userId: string): string {
  if (typeof userId !== "string" || !userId || userId.trim() !== userId || userId.length > 256) {
    throw new Error("El espacio local necesita un ID de cuenta válido.");
  }
  // Encode separators and percent signs injectively; never use provider/email.
  return encodeURIComponent(userId);
}

export function databaseNameForSpace(space: LocalSpace): string {
  // Preserve main's existing account DB names; never rename cached account data.
  return space.kind === "guest" ? LEGACY_DATABASE_NAME : `runo-user-${encodedAccountId(space.userId)}`;
}

/** Shared with the pre-paint script so both build the same key. Keep the exact shape. */
export const ACCOUNT_STORAGE_PREFIX = "runo:account:v1:";
export const ACCOUNT_STORAGE_INFIX = ":storage:";

export function accountStorageKey(userId: string, key: string): string {
  return `${ACCOUNT_STORAGE_PREFIX}${encodedAccountId(userId)}${ACCOUNT_STORAGE_INFIX}${key}`;
}

export function storageKeyForSpace(space: LocalSpace, key: SpaceStorageKey): string {
  return space.kind === "guest" ? key : accountStorageKey(space.userId, key);
}

export type SpaceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readSpaceStorage(
  storage: SpaceStorage,
  space: LocalSpace,
  key: SpaceStorageKey,
): string | null {
  return storage.getItem(storageKeyForSpace(space, key));
}

export function writeSpaceStorage(
  storage: SpaceStorage,
  space: LocalSpace,
  key: SpaceStorageKey,
  value: string,
): void {
  storage.setItem(storageKeyForSpace(space, key), value);
}

/** Low-level cleanup only; caller must confirm scope, close the DB and stop work. */
export function removeSpaceStorage(
  space: LocalSpace,
  stores: { local: SpaceStorage; session: SpaceStorage },
): void {
  for (const key of Object.values(SPACE_STORAGE_KEYS)) {
    const scopedKey = storageKeyForSpace(space, key);
    stores.local.removeItem(scopedKey);
    stores.session.removeItem(scopedKey);
  }
}
