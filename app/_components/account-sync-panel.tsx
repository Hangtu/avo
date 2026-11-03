"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { openDatabaseForSpace } from "@/lib/db/database";
import { lockAccountAccess } from "@/lib/sync/access";
import { mirrorPreferences } from "@/lib/sync/browser-preferences";
import { guestPreview, importGuest, type GuestPreview } from "@/lib/sync/guest-import";
import { useWorkspace } from "./account-workspace";

export function PersistenceNotice() {
  const t = useTranslations("sync");
  const workspace = useWorkspace();
  if (!workspace.available) return null;
  const message = workspace.preferences.failed > 0 ? t("localSaveError") : workspace.preferences.pending > 0 ? t("localSaving")
    : workspace.rejected.length > 0 ? t("rejectedTitle") : workspace.issues.length > 0 ? t("remoteIssue") : workspace.conflicts.length > 0 ? t("conflictTitle") : workspace.queued > 0 && workspace.status !== "expired" && workspace.status !== "error" && workspace.status !== "offline"
    ? t("queued", { count: workspace.queued }) : t(workspace.status);
  return <div className="mt-3 text-sm leading-6 text-muted" role="status"><p>{message}</p>
    {workspace.preferences.failed > 0 ? <button type="button" className="min-h-11 underline" onClick={workspace.retryPreferences}>{t("retryLocal")}</button> : null}
  </div>;
}
export function AccountSyncPanel() {
  const t = useTranslations("sync");
  const workspace = useWorkspace();
  const [preview, setPreview] = useState<GuestPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!workspace.available) return null;

  async function review() {
    setBusy(true); setError(null); setMessage(null);
    try { setPreview(await guestPreview()); }
    catch { setError(t("importError")); }
    finally { setBusy(false); }
  }
  async function incorporate() {
    if (!preview || !workspace.accountId || busy) return;
    setBusy(true); setError(null);
    try {
      const db = await openDatabaseForSpace({ kind: "account", userId: workspace.accountId });
      try { await importGuest(db, preview); await mirrorPreferences(db); }
      finally { db.close(); }
      setPreview(null); setMessage(t("importDone")); workspace.refresh(); workspace.retry();
    } catch { setError(t("importError")); setPreview(null); }
    finally { setBusy(false); }
  }
  async function resolve(key: string, choice: "local" | "remote") {
    setBusy(true); setError(null);
    try { await workspace.resolve(key, choice); }
    catch { setError(t("conflictError")); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3">
    <PersistenceNotice />
    {workspace.accountId ? <>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <button type="button" className="min-h-11 text-sm font-semibold underline underline-offset-4" onClick={workspace.retry}>{t("retry")}</button>
        <button type="button" className="min-h-11 text-sm font-semibold underline underline-offset-4" disabled={busy} onClick={() => void review()}>{t("importOpen")}</button>
        <button type="button" className="min-h-11 text-sm text-muted underline underline-offset-4" onClick={() => lockAccountAccess()}>{t("useGuest")}</button>
      </div>
      {workspace.conflicts.map(item => <section key={item.key} className="border-l-2 border-accent pl-4 py-2" aria-label={t("conflictTitle")}>
        <h4 className="text-sm font-semibold">{t("conflictTitle")}</h4>
        <p className="mt-2 text-sm">{t("localVersion", { title: "title" in item.value ? item.value.title : t("preferences") })}</p>
        <p className="mt-1 text-sm">{t("remoteVersion", { title: item.remote && "title" in item.remote.value ? item.remote.value.title : t("preferences") })}</p>
        {item.kind === "pending" && ("completedAt" in item.value && item.value.completedAt !== null || item.remote && "completedAt" in item.remote.value && item.remote.value.completedAt !== null) ? <p className="mt-2 text-sm text-muted">{t("completionProtected")}</p> : null}
        <details className="mt-2 text-xs text-muted">
          <summary>{t("details")}</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify({ local: item.value, account: item.remote?.value }, null, 2)}</pre>
        </details>
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" disabled={busy} className="min-h-11 text-sm font-semibold underline" onClick={() => void resolve(item.key, "local")}>{t("keepLocal")}</button>
          <button type="button" disabled={busy} className="min-h-11 text-sm font-semibold underline" onClick={() => void resolve(item.key, "remote")}>{t("keepRemote")}</button>
        </div>
      </section>)}
      {workspace.rejected.map(item => <section key={item.key} className="border-l-2 border-accent py-2 pl-4" aria-label={t("rejectedTitle")}>
        <h4 className="text-sm font-semibold">{"title" in item.value ? item.value.title : t("preferences")}</h4>
        <p className="mt-2 text-sm">{t(item.state === "local-only" ? "localOnly" : "rejectedCopy")}</p>
        <details className="mt-2 text-xs text-muted"><summary>{t("details")}</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify({ reason: item.error, local: item.value }, null, 2)}</pre></details>
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" disabled={busy} className="min-h-11 text-sm underline" onClick={() => void workspace.recover(item.key, "retry").catch(() => setError(t("conflictError")))}>{t("retryItem")}</button>
          {item.state !== "local-only" ? <button type="button" disabled={busy} className="min-h-11 text-sm underline" onClick={() => void workspace.recover(item.key, "local-only").catch(() => setError(t("conflictError")))}>{t("keepLocalOnly")}</button> : null}
        </div>
      </section>)}
      {workspace.issues.length ? <section aria-label={t("remoteIssue")}><p className="text-sm">{t("remoteIssue")}</p><details className="mt-2 text-xs"><summary>{t("details")}</summary><ul>{workspace.issues.map(issue => <li key={issue.key}>{issue.key}</li>)}</ul></details></section> : null}
      {preview ? <section className="border border-line p-4" aria-label={t("importOpen")}>
        <p className="text-sm leading-6">{t("importSummary", { tasks: preview.tasks.length, pendings: preview.pendings.length })}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{t("importPreferences")}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={busy} className="min-h-11 bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60" onClick={() => void incorporate()}>{t("importConfirm")}</button>
          <button type="button" disabled={busy} className="min-h-11 px-2 text-sm underline" onClick={() => setPreview(null)}>{t("importCancel")}</button>
        </div>
      </section> : null}
    </> : null}
    {error ? <p role="alert" className="text-sm">{error}</p> : null}
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </div>;
}
