"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { liveQuery } from "dexie";
import { useTranslations } from "next-intl";
import { authClient, signOutAccount } from "@/lib/auth-client";
import { currentDatabaseName, databaseNameForUser, openDatabaseForSpace, setActiveDatabaseName } from "@/lib/db/database";
import { newLockedSpaceName } from "@/lib/domain/id";
import { ACCESS_CHANNEL, ACCESS_KEY, beginAccountSignIn, enterSpace, LOCK_EVENT, SIGNOUT_EVENT, lockAccountAccess, readAccess, receiveAccessLock, rememberAccess, suspendSpace } from "@/lib/sync/access";
import { mirrorPreferences } from "@/lib/sync/browser-preferences";
import { httpTransport, recoverRejected, SyncHttpError, syncOnce } from "@/lib/sync/client";
import { resolveConflict } from "@/lib/sync/local";
import { preferenceWriteState, retryPreferenceWrites, subscribePreferenceWrites } from "@/lib/sync/preference-writer";
import type { OutboxItem, RemoteIssue } from "@/lib/sync/protocol";
import { CURTAIN_MIN_VISIBLE_MS, LOADER_INK, LoaderBrand, LoadingCurtain } from "./loading-curtain";
import { I18nProvider } from "./i18n-provider";
import { AuthErrorNotice } from "./auth-error-notice";
import { WorkspaceContext, type AccountIdentity, type SyncState } from "./workspace-context";
export { useWorkspace } from "./workspace-context";

interface Selection { accountId: string | null; identity: AccountIdentity | null; verified: boolean; verification: number; probedSessionKey: string }

const subscribeToNothing = () => () => {};
/** False during SSR/no-JS, true after hydration: transient status is JS-only. */
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

/**
 * Pre-selection shell on the ink loader. With JS it is the same screen the
 * curtain starts from; without JS it is the public page (brand, tagline,
 * explanation and legal links).
 */
function WorkspaceFallback({ failed, closing, retry }: { failed?: boolean; closing?: boolean; retry: () => void }) {
  const t = useTranslations("sync");
  const app = useTranslations();
  const hydrated = useHydrated();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (failed || closing) return;
    const timeout = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(timeout);
  }, [failed, closing]);
  // Only escalate when the wait needs a decision; a normal load stays quiet.
  const recover = !closing && (failed === true || slow);
  return <main className="min-h-screen text-[#eaf7f6]" style={{ backgroundColor: LOADER_INK }}>
    <div className="runo-shell mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-10 sm:py-16">
      <LoaderBrand />
      <div className="flex flex-1 flex-col justify-center py-8">
        {hydrated ? <>
          <p className="text-sm leading-6 text-white/85" role={failed ? "alert" : "status"}>
            {t(closing ? "signingOut" : failed ? "openError" : slow ? "slowOpening" : "opening")}
          </p>
          {recover ? <>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/60">{t("storageHelp")}</p>
            <div className="mt-4 flex flex-wrap gap-x-5">
              <button type="button" className="min-h-11 font-semibold text-white underline underline-offset-4" onClick={retry}>{t("retryOpen")}</button>
              <button type="button" className="min-h-11 text-white/85 underline underline-offset-4" onClick={() => lockAccountAccess()}>{t("useGuest")}</button>
            </div>
          </> : null}
        </> : null}
        <noscript>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{app("header.tagline")}</h1>
          <p className="mt-4 text-sm leading-6 text-white/70">{t("javascriptRequired")}</p>
          <nav className="mt-6 flex gap-5 text-sm">
            <Link href="/privacy" className="text-white/80 underline">{t("privacy")}</Link>
            <Link href="/data-deletion" className="text-white/80 underline">{t("deletion")}</Link>
          </nav>
        </noscript>
      </div>
    </div>
  </main>;
}

export function AccountWorkspace({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const sessionKey = session?.user.id ?? "guest";
  const [selection, setSelection] = useState<Selection | null>(null);
  const selected = useRef<Selection | null>(null);
  const [probe, setProbe] = useState(0);
  const [failed, setFailed] = useState(false);
  const [signOutUntil, setSignOutUntil] = useState(0);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const generation = useRef(0);
  const forceProbe = useRef(false);
  const lockWork = useRef<Promise<unknown>>(Promise.resolve());
  const bootAt = useRef<number | null>(null);
  const revealed = useRef(false);
  const [curtain, setCurtain] = useState(false);

  // Set on mount (never during render); measures how long the loader was shown.
  useEffect(() => {
    if (bootAt.current === null) bootAt.current = Date.now();
  }, []);

  const recheck = useCallback(() => setProbe(value => value + 1), []);
  const retry = () => { forceProbe.current = true; recheck(); };
  const unlock = useCallback(() => { beginAccountSignIn(); forceProbe.current = true; setProbe(value => value + 1); }, []);

  useEffect(() => {
    function updateLockStatus() {
      const access = readAccess();
      setSignOutUntil(access.signOutUntil ?? 0);
      setSignOutFailed(Boolean(access.signOutFailed || (access.signOutUntil && access.signOutUntil <= Date.now())));
    }
    function hideAccount(name: string, revoke: boolean) {
      if (name === databaseNameForUser(null) || name.startsWith("runo-locked-")) return;
      selected.current = null; setSelection(null); setCurtain(false);
      setActiveDatabaseName(newLockedSpaceName());
      lockWork.current = suspendSpace(name, revoke).catch(() => {});
    }
    const onResult = () => { updateLockStatus(); recheck(); };
    const onLock = (event: Event) => {
      generation.current++;
      updateLockStatus();
      hideAccount((event as CustomEvent<string>).detail, true);
      void lockWork.current.finally(recheck);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACCESS_KEY) return;
      updateLockStatus();
      const access = readAccess();
      if (access.locked || (access.accountId && access.accountId !== selected.current?.accountId)) {
        generation.current++; hideAccount(currentDatabaseName(), access.locked);
      }
      void lockWork.current.finally(recheck);
    };
    const onReconnect = () => { if (selected.current && !selected.current.verified && !readAccess().locked) recheck(); };
    let channel: BroadcastChannel | undefined;
    try { channel = new BroadcastChannel(ACCESS_CHANNEL); channel.onmessage = event => receiveAccessLock(event.data); } catch {}
    window.addEventListener(LOCK_EVENT, onLock); window.addEventListener(SIGNOUT_EVENT, onResult); window.addEventListener("storage", onStorage);
    window.addEventListener("online", onReconnect); window.addEventListener("focus", onReconnect);
    return () => {
      channel?.close();
      window.removeEventListener(LOCK_EVENT, onLock); window.removeEventListener(SIGNOUT_EVENT, onResult); window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", onReconnect); window.removeEventListener("focus", onReconnect);
    };
  }, [recheck]);

  useEffect(() => {
    if (!isPending) return;
    const timeout = window.setTimeout(() => { if (!selected.current) setFailed(true); }, 8000);
    return () => window.clearTimeout(timeout);
  }, [isPending]);

  useEffect(() => {
    // Better Auth's initial null is not a guest decision. Do not bootstrap twice.
    if (isPending && !readAccess().locked && !forceProbe.current) return;
    forceProbe.current = false;
    const turn = ++generation.current;
    const controller = new AbortController();
    async function select() {
      setFailed(false);
      await lockWork.current;
      let accountId: string | null = null, identity: AccountIdentity | null = null, verified = false;
      const access = readAccess();
      setSignOutUntil(access.signOutUntil ?? 0);
      setSignOutFailed(Boolean(access.signOutFailed || (access.signOutUntil && access.signOutUntil <= Date.now())));
      if (!access.locked) {
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch("/api/account/me", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            if (typeof data.user?.id !== "string") throw new Error("Invalid session response");
            accountId = data.user.id; identity = data.user; verified = true;
          } else if (response.status !== 401) throw new Error("Session temporarily unavailable");
        } catch { /* Only the last unlocked, previously verified local account may resume offline. */ }
        finally { window.clearTimeout(timeout); }
        if (turn !== generation.current) return;
        if (!accountId && access.accountId && (sessionKey === "guest" || sessionKey === access.accountId)) {
          const cached = await openDatabaseForSpace({ kind: "account", userId: access.accountId });
          try { if ((await cached.metadata.get("account-access-v1"))?.value === true) accountId = access.accountId; }
          finally { cached.close(); }
        }
      }
      if (turn !== generation.current || controller.signal.aborted && verified) return;
      const target = databaseNameForUser(accountId), previous = currentDatabaseName();
      if (previous !== target) { selected.current = null; setSelection(null); }
      // Storage has its own deadline; the completed session-probe timeout is independent.
      const entering = enterSpace(target, () => turn === generation.current);
      lockWork.current = entering.catch(() => {});
      const db = await entering;
      try {
        if (turn !== generation.current) return;
        if (verified && accountId) {
          if ((await db.metadata.get("account-access-v1"))?.value !== true) await db.metadata.put({ key: "account-access-v1", value: true });
          if (turn !== generation.current || readAccess().locked) return;
          try { if (readAccess().accountId !== accountId || readAccess().locked) rememberAccess(accountId); } catch {}
        }
        if (turn !== generation.current) return;
        setActiveDatabaseName(target);
        await mirrorPreferences(db);
        if (turn !== generation.current) return;
        const next = { accountId, identity, verified, verification: turn, probedSessionKey: sessionKey };
        selected.current = next; setSelection(next);
        if (!revealed.current) {
          revealed.current = true;
          // A fast load does not need the reveal; a slow one gets the 600 ms curtain.
          const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
          const shownFor = bootAt.current === null ? 0 : Date.now() - bootAt.current;
          if (!reduceMotion && shownFor >= CURTAIN_MIN_VISIBLE_MS) setCurtain(true);
        }
      } finally { db.close(); }
    }
    void select().catch(() => { if (turn === generation.current) setFailed(true); });
    return () => { generation.current = turn + 1; controller.abort(); };
  }, [sessionKey, isPending, probe]);

  useEffect(() => {
    if (!signOutUntil) return;
    const timeout = window.setTimeout(() => { setSignOutUntil(0); setSignOutFailed(true); }, Math.max(0, signOutUntil - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [signOutUntil]);

  if (signOutUntil > 0) return <WorkspaceFallback closing retry={retry} />;
  // A known change of identity hides old data synchronously. Rechecking A keeps A mounted.
  if (failed || !selection || (session?.user.id && selection.accountId && session.user.id !== selection.accountId && session.user.id !== selection.probedSessionKey)) return <WorkspaceFallback failed={failed} retry={retry} />;
  return <>
    <SelectedWorkspace key={selection.accountId ?? "guest"} selection={selection} onRecheck={recheck} onUnlock={unlock} signOutFailed={signOutFailed}>{children}</SelectedWorkspace>
    {curtain ? <LoadingCurtain onDone={() => setCurtain(false)} /> : null}
  </>;
}

/** Rendered inside the space provider so it follows the chosen locale. */
function SignOutWarning() {
  const t = useTranslations("sync");
  return <div role="alert" className="mx-auto max-w-3xl px-5 pt-5 text-sm leading-6">
    <p>{t("signOutUnconfirmed")}</p>
    <button type="button" className="min-h-11 font-semibold underline" onClick={() => void signOutAccount().catch(() => {})}>{t("retrySignOut")}</button>
  </div>;
}

function SelectedWorkspace({ selection, onRecheck, onUnlock, signOutFailed, children }: { selection: Selection; onRecheck: () => void; onUnlock: () => void; signOutFailed: boolean; children: ReactNode }) {
  const { accountId } = selection;
  const name = databaseNameForUser(accountId);
  const [status, setStatus] = useState<SyncState>(accountId ? selection.verified ? "syncing" : "expired" : "guest");
  const [queued, setQueued] = useState(0);
  const [conflicts, setConflicts] = useState<OutboxItem[]>([]);
  const [rejected, setRejected] = useState<OutboxItem[]>([]);
  const [issues, setIssues] = useState<RemoteIssue[]>([]);
  const [preferences, setPreferences] = useState(() => preferenceWriteState(name));
  const [revision, setRevision] = useState(0);
  const wake = useRef<(pull?: boolean) => void>(() => {});
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const retry = useCallback(() => wake.current(true), []);
  useEffect(() => {
    const update = () => setPreferences(preferenceWriteState(name));
    update(); return subscribePreferenceWrites(name, update);
  }, [name]);

  useEffect(() => {
    if (!accountId) return;
    let stopped = false, running = false, again = false, pullNext = true;
    let connection: Awaited<ReturnType<typeof openDatabaseForSpace>> | null = null;
    let subscription: { unsubscribe(): void } | null = null;
    let controller: AbortController | null = null;
    let debounce: number | undefined;
    async function run() {
      if (stopped || !connection) return;
      if (!selection.verified) { setStatus("expired"); return; }
      if (running) { again = true; return; }
      running = true; again = false;
      const pull = pullNext; pullNext = false;
      setStatus("syncing");
      const current = new AbortController(); controller = current;
      const timeout = window.setTimeout(() => current.abort(), 15000);
      try {
        const result = await syncOnce(connection, accountId!, httpTransport(current.signal), { pull });
        if (!stopped) {
          if (result.changed) { await mirrorPreferences(connection); refresh(); }
          const problems = (await connection.metadata.get("account-issues-v1"))?.value as unknown as RemoteIssue[] | undefined;
          setIssues(problems ?? []); setStatus("saved");
        }
      } catch (error) {
        // A pull or an earlier half-batch may have committed locally before a later
        // request failed. Publish those rows too, without remounting the UI.
        if (!stopped) { await mirrorPreferences(connection).catch(() => {}); if (!stopped) refresh(); }
        if (!stopped) {
          if (error instanceof SyncHttpError && (error.status === 401 || error.status === 409)) { setStatus("expired"); if (error.status === 409) onRecheck(); }
          else setStatus(navigator.onLine ? "error" : "offline");
        }
        again = false;
      } finally {
        window.clearTimeout(timeout); running = false;
        if (again && !stopped) schedule();
      }
    }
    function schedule(pull = false) {
      if (stopped) return;
      pullNext ||= pull;
      if (running) { again = true; return; }
      window.clearTimeout(debounce); debounce = window.setTimeout(() => void run(), 250);
    }
    wake.current = schedule;
    void openDatabaseForSpace({ kind: "account", userId: accountId }).then(db => {
      if (stopped) { db.close(); return; }
      connection = db;
      subscription = liveQuery(() => db.outbox.toArray()).subscribe({
        next: items => {
          if (stopped) return;
          setQueued(items.filter(item => item.state === "queued").length);
          setConflicts(items.filter(item => item.state === "conflict"));
          setRejected(items.filter(item => item.state === "rejected" || item.state === "local-only"));
          if (items.some(item => item.state === "queued")) schedule();
        }, error: () => { if (!stopped) setStatus("error"); },
      });
      schedule(true);
    }).catch(() => { if (!stopped) setStatus("error"); });
    const pull = () => schedule(true);
    const onVisible = () => { if (document.visibilityState === "visible") pull(); };
    window.addEventListener("online", pull); window.addEventListener("focus", pull); document.addEventListener("visibilitychange", onVisible);
    // Poll changes conditionally; local queue wakes push without downloading the whole account.
    const interval = window.setInterval(pull, 60_000);
    return () => {
      stopped = true; controller?.abort(); subscription?.unsubscribe(); connection?.close();
      window.clearTimeout(debounce); window.clearInterval(interval); wake.current = () => {};
      window.removeEventListener("online", pull); window.removeEventListener("focus", pull); document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accountId, selection.verified, selection.verification, onRecheck, refresh]);

  const resolve = useCallback(async (key: string, choice: "local" | "remote") => {
    if (!accountId) return;
    const db = await openDatabaseForSpace({ kind: "account", userId: accountId });
    try { await resolveConflict(db, key, choice); await mirrorPreferences(db); refresh(); retry(); } finally { db.close(); }
  }, [accountId, refresh, retry]);
  const recover = useCallback(async (key: string, choice: "retry" | "local-only") => {
    if (!accountId) return;
    const db = await openDatabaseForSpace({ kind: "account", userId: accountId });
    try { await recoverRejected(db, key, choice); retry(); } finally { db.close(); }
  }, [accountId, retry]);
  const retryPreferences = useCallback(() => { void retryPreferenceWrites(name).catch(() => {}); }, [name]);
  return <WorkspaceContext value={{ available: true, accountId, identity: selection.identity, status: accountId && !selection.verified ? "expired" : status, revision, queued, conflicts, rejected, issues, preferences, retry, refresh, unlock: onUnlock, retryPreferences, recover, resolve }}>
    <I18nProvider revision={revision}>
      <AuthErrorNotice />
      {signOutFailed ? <SignOutWarning /> : null}
      {children}
    </I18nProvider>
  </WorkspaceContext>;
}
