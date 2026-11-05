"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { lockAccountAccess } from "@/lib/sync/access";
import { TaskDeckSkeleton } from "./task-deck-skeleton";

const subscribeToNothing = () => () => {};

/** Public app chrome only: private children still wait for workspace selection. */
export function WorkspaceFallback({
  failed,
  closing,
  retry,
}: {
  failed?: boolean;
  closing?: boolean;
  retry: () => void;
}) {
  const t = useTranslations("sync");
  const app = useTranslations();
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (failed || closing) return;
    const timeout = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(timeout);
  }, [failed, closing]);
  // Normal startup is silent; only waits that need a decision show recovery.
  const recover = !closing && (failed === true || slow);
  return (
    <main className="min-h-screen bg-background text-foreground" aria-busy={!recover && !closing}>
      <div
        className="runo-shell mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-10 sm:py-16"
        data-task-choices={(!recover && !closing) || undefined}
      >
        <header className="runo-header flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              <Image
                src="/icon-192.png"
                alt=""
                width={28}
                height={28}
                unoptimized
                className="size-18 shrink-0"
              />
              <span>Avo</span>
            </p>
            <h1 className="runo-tagline mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {app("header.tagline")}
            </h1>
          </div>
          <div className="runo-header-controls flex flex-wrap items-center justify-end gap-3 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                className="min-h-11 whitespace-nowrap border border-control px-3 text-sm font-semibold disabled:opacity-60"
                aria-label={app("nav.addPendingAria")}
              >
                {app("nav.addPending")}
              </button>
              <button
                type="button"
                disabled
                className="min-h-11 whitespace-nowrap border border-control px-3 text-sm font-semibold disabled:opacity-60"
              >
                {app("nav.quickTask")}
              </button>
            </div>
            <span aria-hidden="true" className="h-5 w-48 shrink-0" />
          </div>
        </header>
        <div className="runo-content flex flex-1 flex-col justify-center py-8">
          {hydrated && !closing && !recover ? <TaskDeckSkeleton /> : null}
          {hydrated && (closing || recover) ? (
            <div>
              <p className="text-sm leading-6" role={failed ? "alert" : "status"}>
                {t(closing ? "signingOut" : failed ? "openError" : "slowOpening")}
              </p>
              {recover ? (
                <>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted">{t("storageHelp")}</p>
                  <div className="mt-4 flex flex-wrap gap-x-5">
                    <button
                      type="button"
                      className="min-h-11 font-semibold underline underline-offset-4"
                      onClick={retry}
                    >
                      {t("retryOpen")}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 underline underline-offset-4"
                      onClick={() => lockAccountAccess()}
                    >
                      {t("useGuest")}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <noscript>
            <p className="text-sm leading-6 text-muted">{t("javascriptRequired")}</p>
            <nav className="mt-6 flex gap-5 text-sm">
              <Link href="/privacy" className="underline">
                {t("privacy")}
              </Link>
              <Link href="/data-deletion" className="underline">
                {t("deletion")}
              </Link>
            </nav>
          </noscript>
        </div>
        <div aria-hidden className="runo-dock-scrim" />
        <nav className="runo-dock" aria-label={app("common.mainNav")}>
          {(["today", "tasks", "pending", "settings"] as const).map((item) => (
            <button
              key={item}
              type="button"
              disabled
              aria-current={item === "today" ? "page" : undefined}
              aria-label={app(`nav.${item}`)}
            >
              {item === "today" ? <span aria-hidden className="runo-dock-active" /> : null}
              {item === "pending" ? (
                <>
                  <span className="dock-label-full">{app("nav.pending")}</span>
                  <span className="dock-label-short" aria-hidden>
                    {app("nav.pendingShort")}
                  </span>
                </>
              ) : (
                app(`nav.${item}`)
              )}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
