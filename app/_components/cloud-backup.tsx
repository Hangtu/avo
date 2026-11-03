"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useLocale, useTranslations } from "next-intl";

import { HelpTip } from "./help-tip";
import { openDatabase } from "@/lib/db/database";
import { exportLocalSnapshot } from "@/lib/db/backup";
import type { BackupCounts } from "@/lib/cloud/snapshot-types";

type Mode = "loading" | "unconfigured" | "login" | "connected" | "error";

interface StatusResponse {
  lastBackupAt?: number | null;
  counts?: BackupCounts | null;
}

type StatusResult =
  | { kind: "login" }
  | { kind: "unconfigured" }
  | { kind: "connected"; lastBackupAt: number | null; counts: BackupCounts | null };

async function requestStatus(): Promise<StatusResult> {
  const response = await fetch("/api/cloud/backup", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (response.status === 401) return { kind: "login" };
  if (response.status === 503) return { kind: "unconfigured" };
  const data = (await response.json().catch(() => null)) as StatusResponse | null;
  if (!response.ok) throw new Error("status");
  return {
    kind: "connected",
    lastBackupAt: typeof data?.lastBackupAt === "number" ? data.lastBackupAt : null,
    counts: data?.counts ?? null,
  };
}

export function CloudBackup() {
  const t = useTranslations("settings.cloud");
  const common = useTranslations("common");
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("loading");
  const [passcode, setPasscode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passcodeRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [counts, setCounts] = useState<BackupCounts | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const result = await requestStatus();
      setError(null);
      if (result.kind === "login") {
        setMode("login");
        return;
      }
      if (result.kind === "unconfigured") {
        setMode("unconfigured");
        return;
      }
      setLastBackupAt(result.lastBackupAt);
      setCounts(result.counts);
      setMode("connected");
    } catch {
      setMode("error");
      setError(t("networkError"));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await requestStatus();
        if (cancelled) return;
        setError(null);
        if (result.kind === "login") {
          setMode("login");
          return;
        }
        if (result.kind === "unconfigured") {
          setMode("unconfigured");
          return;
        }
        setLastBackupAt(result.lastBackupAt);
        setCounts(result.counts);
        setMode("connected");
      } catch {
        if (!cancelled) {
          setMode("error");
          setError(t("networkError"));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function connect() {
    if (busy) return;
    if (!passcode.trim()) {
      setFieldErrors({ passcode: t("passcodeRequired") });
      passcodeRef.current?.focus();
      return;
    }
    setFieldErrors({});
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/cloud/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ passcode }),
      });
      if (response.status === 503) {
        setMode("unconfigured");
        return;
      }
      if (response.status === 401) {
        setFieldErrors({ passcode: t("wrongPasscode") });
        passcodeRef.current?.focus();
        return;
      }
      if (!response.ok) throw new Error("connect");
      setPasscode("");
      setFieldErrors({});
      setNotice(null);
      await loadStatus();
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/cloud/auth", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("logout");
      setLastBackupAt(null);
      setCounts(null);
      setConfirming(false);
      setNotice(null);
      setMode("login");
    } catch {
      setError(t("logoutError"));
    } finally {
      setBusy(false);
    }
  }

  async function saveBackup() {
    if (busy) return;
    if (!confirming) {
      setConfirming(true);
      setConfirmingDelete(false);
      setNotice(null);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    let db: Awaited<ReturnType<typeof openDatabase>> | null = null;
    try {
      db = await openDatabase();
      const snapshot = await exportLocalSnapshot(db, Date.now());
      db.close();
      db = null;
      const response = await fetch("/api/cloud/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(snapshot),
      });
      if (response.status === 401) {
        setMode("login");
        return;
      }
      if (response.status === 503) {
        setMode("unconfigured");
        return;
      }
      const data = (await response.json().catch(() => null)) as
        ({ lastBackupAt?: number; counts?: BackupCounts } & { error?: string }) | null;
      if (!response.ok) throw new Error(data?.error ?? "backup");
      setLastBackupAt(typeof data?.lastBackupAt === "number" ? data.lastBackupAt : Date.now());
      setCounts(data?.counts ?? null);
      setConfirming(false);
      setNotice(t("saved"));
    } catch {
      setError(t("backupError"));
    } finally {
      db?.close();
      setBusy(false);
    }
  }

  async function deleteBackup() {
    if (busy) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setConfirming(false);
      setNotice(null);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/cloud/backup", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        setMode("login");
        setConfirmingDelete(false);
        return;
      }
      if (response.status === 503) {
        setMode("unconfigured");
        setConfirmingDelete(false);
        return;
      }
      if (!response.ok) throw new Error("delete");
      setLastBackupAt(null);
      setCounts(null);
      setConfirmingDelete(false);
      setMode("login");
      setNotice(t("deleted"));
    } catch {
      setError(t("deleteError"));
    } finally {
      setBusy(false);
    }
  }

  const formattedBackup = lastBackupAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastBackupAt))
    : null;

  return (
    <div className="mt-7 border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <HelpTip label={t("helpLabel")}>{t("help")}</HelpTip>
      </div>

      {mode === "loading" ? (
        <p className="mt-3 text-sm text-muted" role="status">{t("loading")}</p>
      ) : null}

      {mode === "unconfigured" ? (
        <div className="mt-3" role="alert">
          <p className="text-sm">{t("notConfigured")}</p>
          <p className="mt-1 text-xs text-muted">{t("notConfiguredHelp")}</p>
        </div>
      ) : null}

      {mode === "error" ? (
        <div className="mt-3" role="alert">
          <p className="text-sm">{error ?? t("networkError")}</p>
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="mt-2 min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            {common("retry")}
          </button>
        </div>
      ) : null}

      {mode === "login" ? (
        <div className="mt-3">
          <p className="text-sm text-muted">{t("notConnected")}</p>
          <Form
            noValidate
            errors={fieldErrors}
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void connect();
            }}
          >
            <Field.Root name="passcode" className="form-field min-w-0 flex-1">
              <Field.Label className="form-label">{t("passcodeLabel")}</Field.Label>
              <Field.Control
                ref={passcodeRef}
                type="password"
                autoComplete="current-password"
                value={passcode}
                onChange={(event) => {
                  setPasscode(event.target.value);
                  setError(null);
                  setFieldErrors((current) => {
                    if (!current.passcode) return current;
                    const next = { ...current };
                    delete next.passcode;
                    return next;
                  });
                }}
                disabled={busy}
                className="mt-1 min-h-11 w-full min-w-0 border border-control bg-background px-3 text-base disabled:opacity-60"
              />
              <Field.Error className="form-error" />
            </Field.Root>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 w-full whitespace-nowrap bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60 sm:w-auto"
            >
              {busy ? t("connecting") : t("connect")}
            </button>
          </Form>
        </div>
      ) : null}

      {mode === "connected" ? (
        <div className="mt-3">
          <p className="text-sm font-semibold">{t("connected")}</p>
          <p className="mt-2 text-sm text-muted">
            {formattedBackup ? t("lastBackup", { date: formattedBackup }) : t("never")}
          </p>
          {counts ? (
            <p className="mt-1 text-xs leading-5 text-muted">
              {t("counts", {
                tasks: counts.tasks,
                pendings: counts.pendings,
                events: counts.events,
                ledger: counts.ledger,
              })}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted">{t("backupHelp")}</p>

          {confirmingDelete ? (
            <div className="mt-3 border-l-2 border-accent pl-3" role="alert">
              <p className="text-sm leading-6">{t("deleteConfirm")}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void deleteBackup()}
                  disabled={busy}
                  className="min-h-11 bg-accent px-4 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? t("deleting") : t("deleteButton")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={busy}
                  className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : confirming ? (
            <div className="mt-3 border-l-2 border-accent pl-3" role="alert">
              <p className="text-sm leading-6">{t("confirm")}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void saveBackup()}
                  disabled={busy}
                  className="min-h-11 bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? t("saving") : t("confirmButton")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveBackup()}
                disabled={busy}
                className="min-h-11 bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
              >
                {t("backup")}
              </button>
              <button
                type="button"
                onClick={() => void deleteBackup()}
                disabled={busy}
                className="min-h-11 border border-accent px-4 text-sm font-semibold text-accent disabled:opacity-60"
              >
                {t("deleteBackup")}
              </button>
              <button
                type="button"
                onClick={() => void disconnect()}
                disabled={busy}
                className="min-h-11 text-sm font-semibold text-muted underline underline-offset-4 disabled:opacity-60"
              >
                {t("logout")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {notice ? <p className="mt-3 text-sm" role="status">{notice}</p> : null}
      {error && mode !== "error" ? <p className="mt-3 text-sm" role="alert">{error}</p> : null}
    </div>
  );
}
