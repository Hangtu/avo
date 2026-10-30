"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openDatabase } from "@/lib/db/database";
import {
  completeSession,
  expireSession,
  markOccurrenceNotApplicable,
  retrySession,
} from "@/lib/db/repository";
import type { Session } from "@/lib/domain/types";
import { useWakeLock } from "./use-wake-lock";

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatEndTime(startedAt: number, remainingSec: number): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startedAt + remainingSec * 1000));
}

function newActionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `retry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SessionView({
  session,
  onFinished,
}: {
  session: Session;
  onFinished: () => void;
}) {
  const [current, setCurrent] = useState(session);
  const [remainingMs, setRemainingMs] = useState(() =>
    current.status === "running"
      ? Math.max(0, current.startedAt + current.remainingSecAtStart * 1000 - Date.now())
      : 0,
  );
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNoOptions, setShowNoOptions] = useState(false);
  const [retryId, setRetryId] = useState(() => newActionId());
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useWakeLock(current.status === "running");

  const expire = useCallback(async () => {
    try {
      const db = await openDatabase();
      try {
        const expired = await expireSession(db, current.id, Date.now());
        setCurrent(expired);
        setExpiryError(null);
      } finally {
        db.close();
      }
    } catch (cause) {
      console.error("No se pudo cerrar el timer", cause);
      setExpiryError("No se pudo guardar el vencimiento. Vuelve a intentarlo.");
    }
  }, [current.id]);

  useEffect(() => {
    if (current.status !== "running") return;
    const startedAt = current.startedAt;
    const remainingAtStart = current.remainingSecAtStart;
    let fired = false;

    function update() {
      const next = Math.max(0, startedAt + remainingAtStart * 1000 - Date.now());
      setRemainingMs(next);
      if (next === 0 && !fired) {
        fired = true;
        void expire();
      }
    }

    update();
    const interval = window.setInterval(update, 250);
    function onVisibilityChange() {
      if (document.visibilityState === "visible") update();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [current, expire]);

  const runAction = useCallback(async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      console.error("No se pudo guardar el resultado", cause);
      setActionError("No se pudo guardar el resultado. Inténtalo de nuevo.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  async function complete() {
    await runAction(async () => {
      const db = await openDatabase();
      try {
        await completeSession(db, current.id, Date.now());
        onFinished();
      } finally {
        db.close();
      }
    });
  }

  async function notApplicable() {
    await runAction(async () => {
      const db = await openDatabase();
      try {
        await markOccurrenceNotApplicable(db, current.id, Date.now());
        onFinished();
      } finally {
        db.close();
      }
    });
  }

  async function retry() {
    await runAction(async () => {
      const db = await openDatabase();
      try {
        const resumed = await retrySession(db, current.id, retryId, Date.now());
        setCurrent(resumed);
        setShowNoOptions(false);
      } finally {
        db.close();
      }
    });
  }

  function askNo() {
    setRetryId(newActionId());
    setShowNoOptions(true);
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {current.status === "running"
          ? "En curso"
          : current.status === "awaiting_confirmation"
            ? "Tiempo cumplido"
            : current.status === "paused"
              ? "Pausada"
              : "Sesión cerrada"}
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
        {current.taskSnapshot.title}
      </h2>

      {current.status === "running" ? (
        <>
          <p
            role="timer"
            aria-label="Tiempo restante"
            className="mt-8 text-center font-mono text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl"
          >
            {formatRemaining(remainingMs)}
          </p>
          <p className="mt-4 text-center text-sm text-muted">
            Termina a las {formatEndTime(current.startedAt, current.remainingSecAtStart)}
          </p>
          <p className="mt-6 text-center text-sm leading-6 text-muted">
            El reloj sigue aunque cambies de pantalla. Al volver, retomas donde ibas.
          </p>
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => void complete()}
              disabled={busy}
              className="min-h-12 rounded-full bg-accent px-7 text-base font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Terminé"}
            </button>
          </div>
        </>
      ) : null}

      {current.status === "awaiting_confirmation" ? (
        <div className="mt-6 space-y-4">
          <p className="text-base leading-7 text-muted">Se acabó el tiempo de esta tarea.</p>
          {!showNoOptions ? (
            <>
              <p className="text-lg font-semibold">¿La terminaste?</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void complete()}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-full bg-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Guardando…" : "Sí, terminé"}
                </button>
                <button
                  type="button"
                  onClick={askNo}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-full border border-line px-5 text-sm font-semibold disabled:opacity-60"
                >
                  No terminé
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">¿Qué pasó con la tarea?</p>
              <p className="text-sm leading-6 text-muted">
                Puedes reintentar cinco minutos o marcarla como no aplica.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void retry()}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-full bg-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Guardando…" : "Reintentar 5 min"}
                </button>
                <button
                  type="button"
                  onClick={() => void notApplicable()}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-full border border-line px-5 text-sm font-semibold disabled:opacity-60"
                >
                  No aplica
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowNoOptions(false)}
                disabled={busy}
                className="min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline disabled:opacity-60"
              >
                Volver
              </button>
            </>
          )}
        </div>
      ) : null}

      {current.status === "paused" ? (
        <div className="mt-6 space-y-3 text-base leading-7 text-muted">
          <p>El tiempo está congelado.</p>
          <p>Continuar se conecta en el siguiente paso de pausa.</p>
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-5 rounded-xl border border-line bg-background p-4 text-sm leading-6" role="alert">
          {actionError}
        </p>
      ) : null}

      {expiryError ? (
        <div className="mt-5 rounded-xl border border-line bg-background p-4" role="alert">
          <p className="text-sm leading-6">{expiryError}</p>
          <button
            type="button"
            onClick={() => void expire()}
            className="mt-3 min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : null}
    </section>
  );
}
