import { currentDatabaseName, databaseNameForUser, openDatabase, setActiveDatabaseName } from "@/lib/db/database";
import { newLockedSpaceName } from "@/lib/domain/id";
import { pauseSession } from "@/lib/db/repository";
import { ACCESS_CHANNEL, ACCESS_KEY } from "./access-marker";

export { ACCESS_CHANNEL, ACCESS_KEY };
export const LOCK_EVENT = "avo:account-lock";
export const SIGNOUT_EVENT = "avo:signout-result";
export interface LocalAccess { accountId: string | null; locked: boolean; signOutUntil?: number; signOutFailed?: boolean }
let volatileAccess: LocalAccess | undefined;
function writeAccess(value: LocalAccess) {
  try { localStorage.setItem(ACCESS_KEY, JSON.stringify(value)); volatileAccess = undefined; }
  catch { volatileAccess = value; } // A privacy lock must survive denied browser storage in this document.
}
export function readAccess(): LocalAccess {
  if (volatileAccess) return volatileAccess;
  try {
    const value = JSON.parse(localStorage.getItem(ACCESS_KEY) ?? "null");
    if (value && typeof value.locked === "boolean" && (value.accountId === null || typeof value.accountId === "string")) {
      return { accountId: value.accountId, locked: value.locked,
        ...(typeof value.signOutUntil === "number" && Number.isSafeInteger(value.signOutUntil) ? { signOutUntil: value.signOutUntil } : {}),
        ...(typeof value.signOutFailed === "boolean" ? { signOutFailed: value.signOutFailed } : {}),
      };
    }
  } catch {}
  return { accountId: null, locked: false };
}
function broadcastLock(value: LocalAccess) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try { const channel = new BroadcastChannel(ACCESS_CHANNEL); channel.postMessage(value); channel.close(); } catch {}
}
/** Local cross-tab lock messages cannot authorize/open any account. */
export function receiveAccessLock(value: unknown) {
  if (!value || typeof value !== "object") return;
  const data = value as Partial<LocalAccess>;
  if (data.locked !== true || data.accountId !== null) return;
  const clean: LocalAccess = { accountId: null, locked: true,
    ...(typeof data.signOutUntil === "number" && Number.isSafeInteger(data.signOutUntil) && data.signOutUntil <= Date.now() + 15_000 ? { signOutUntil: data.signOutUntil } : {}),
    ...(typeof data.signOutFailed === "boolean" ? { signOutFailed: data.signOutFailed } : {}),
  };
  writeAccess(clean);
  window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: currentDatabaseName() }));
}
export function rememberAccess(accountId: string) {
  writeAccess({ accountId, locked: false });
}
/** Privacy lock is immediate, including when remote sign-out cannot reach the network. */
export function lockAccountAccess(waitForServer = false) {
  const previous = currentDatabaseName();
  const value: LocalAccess = { accountId: null, locked: true, ...(waitForServer ? { signOutUntil: Date.now() + 10_000 } : {}) };
  writeAccess(value); broadcastLock(value);
  if (previous !== databaseNameForUser(null)) setActiveDatabaseName(newLockedSpaceName());
  window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: previous }));
}
export function finishAccountSignOut(failed: boolean) {
  // Never let a late result replace a new account selection.
  if (!readAccess().locked) return;
  const value: LocalAccess = { accountId: null, locked: true, signOutFailed: failed };
  writeAccess(value); broadcastLock(value);
  window.dispatchEvent(new Event(SIGNOUT_EVENT));
}
export function beginAccountSignIn() {
  volatileAccess = undefined;
  try { localStorage.removeItem(ACCESS_KEY); } catch { volatileAccess = { accountId: null, locked: false }; }
}
/** Idempotent space entry. Rechecking/reloading the same space never pauses execution. */
export async function enterSpace(name: string, isCurrent: () => boolean = () => true) {
  const cancelled = () => { if (!isCurrent()) throw new DOMException("Space selection cancelled", "AbortError"); };
  cancelled();
  const previous = currentDatabaseName();
  if (previous !== name) {
    setActiveDatabaseName(newLockedSpaceName());
    await suspendSpace(previous);
  }
  cancelled();
  const db = await openDatabase(name);
  try { cancelled(); setActiveDatabaseName(name); return db; }
  catch (error) { db.close(); throw error; }
}

/** Pausing is local only. Switching never transfers a running timer to another space. */
export async function suspendSpace(name: string, revoke = false) {
  if (name.startsWith("runo-locked-")) return;
  const db = await openDatabase(name);
  try {
    const running = await db.sessions.where("status").equals("running").first();
    if (running) await pauseSession(db, running.id, Date.now());
    if (revoke && db.accountId) await db.metadata.put({ key: "account-access-v1", value: false });
  } finally { db.close(); }
}
