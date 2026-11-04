"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { GUEST_SPACE, LEGACY_DATABASE_NAME, removeSpaceStorage } from "@/lib/db/local-space";

type DeleteError = "unavailable" | "blocked" | "failed";

function deleteLocalDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("unavailable" satisfies DeleteError));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
    } catch {
      reject(new Error("failed" satisfies DeleteError));
      return;
    }

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("failed" satisfies DeleteError));
    request.onblocked = () => reject(new Error("blocked" satisfies DeleteError));
  });
}

export function LocalDataDeletion() {
  const t = useTranslations("dataDeletion");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<DeleteError | null>(null);

  async function deleteData() {
    if (busy || done) return;
    setBusy(true);
    setError(null);
    try {
      await deleteLocalDatabase();
      removeSpaceStorage(GUEST_SPACE, {
        local: window.localStorage,
        session: window.sessionStorage,
      });
      setDone(true);
      setConfirming(false);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "failed";
      setError(code === "unavailable" || code === "blocked" ? code : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="local-data-delete-title"
      className="mt-8 rounded-2xl border border-line p-5 sm:p-6"
    >
      <h2 id="local-data-delete-title" className="text-xl font-semibold">
        {t("localTitle")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t("localCopy")}</p>

      {done ? (
        <p className="mt-4 text-sm font-semibold" role="status">
          {t("done")}
        </p>
      ) : confirming ? (
        <div className="mt-4 border-l-2 border-accent pl-4" role="alert">
          <p className="text-sm leading-6">{t("confirmCopy")}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void deleteData()}
              disabled={busy}
              className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-background disabled:opacity-60"
            >
              {busy ? t("deleting") : t("confirmButton")}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={busy}
              className="min-h-11 px-4 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setConfirming(true);
            setError(null);
          }}
          className="mt-4 min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background"
        >
          {t("startButton")}
        </button>
      )}

      {error ? (
        <p className="mt-3 text-sm" role="alert">
          {t(
            error === "unavailable"
              ? "unavailableError"
              : error === "blocked"
                ? "blockedError"
                : "failedError",
          )}
        </p>
      ) : null}
    </section>
  );
}
