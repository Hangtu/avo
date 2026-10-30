"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openDatabase } from "@/lib/db/database";
import {
  closeDay,
  completeSessionWithCredit,
  expireSession,
  markOccurrenceNotApplicable,
  pauseSession,
  resumeSession,
  retrySession,
} from "@/lib/db/repository";
import { dateFromOccurrenceId } from "@/lib/domain/occurrence";
import { toLocalDate } from "@/lib/domain/time";
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
  onFinished: (offerBreak?: boolean, message?: string) => void;
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
  const [today, setToday] = useState<string | null>(null);
  const busyRef = useRef(false);
  const isShort = current.variant === "short";
  const sessionDate = dateFromOccurrenceId(current.occurrenceId);
  const isTodaySession = today === null || sessionDate === today;
  const segmentRemainingSec = current.status === "running"
    ? remainingMs / 1000
    : current.remainingSecAtStart;
  const elapsedTotal = Math.min(
    current.durationSec,
    Math.max(0, current.elapsedSec + current.remainingSecAtStart - segmentRemainingSec),
  );
  const progress = current.durationSec > 0
    ? Math.round(Math.min(1, elapsedTotal / current.durationSec) * 100)
    : 0;
  const displayTitle = isShort
    ? current.taskSnapshot.shortStep?.title ?? current.taskSnapshot.title
    : current.taskSnapshot.title;

  useWakeLock(current.status === "running");

  useEffect(() => {
    function updateToday() {
      setToday(toLocalDate(Date.now()));
    }
    updateToday();
    const interval = window.setInterval(updateToday, 60_000);
    return () => window.clearInterval(interval);
  }, []);

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
      setToday(toLocalDate(Date.now()));
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
        const result = await completeSessionWithCredit(db, current.id, Date.now());
        onFinished(
          !isShort,
          result.creditedRc > 0 ? `Ganaste ${result.creditedRc} RC` : "Sin RC nuevo.",
        );
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
        onFinished(false);
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

  async function pauseNow(reason?: "baby") {
    await runAction(async () => {
      const db = await openDatabase();
      try {
        const paused = await pauseSession(db, current.id, Date.now(), reason);
        setCurrent(paused);
      } finally {
        db.close();
      }
    });
  }

  async function resumeNow() {
    await runAction(async () => {
      const db = await openDatabase();
      try {
        const resumed = await resumeSession(db, current.id, Date.now());
        setCurrent(resumed);
      } finally {
        db.close();
      }
    });
  }

  async function endDayNow() {
    await runAction(async () => {
      const db = await openDatabase();
      try {
        await closeDay(db, sessionDate, Date.now());
        onFinished(false);
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
    <section className="border-y border-line py-8 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {current.status === "running"
          ? isShort ? "Primer paso" : "En curso"
          : current.status === "awaiting_confirmation"
            ? isShort ? "Paso cumplido" : "Tiempo cumplido"
            : current.status === "paused"
              ? isShort ? "Paso pausado" : "Pausada"
              : "Sesión cerrada"}
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
        {displayTitle}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Recompensa: +{current.rewardTargetRc} RC
      </p>
      {!isTodaySession ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          Sesión de un día anterior; conserva su tarea original.
        </p>
      ) : null}

      {current.status === "running" ? (
        <>
          <p
            role="timer"
            aria-label="Tiempo restante"
            className="mt-8 text-center text-7xl font-semibold tracking-tight tabular-nums sm:text-8xl"
          >
            {formatRemaining(remainingMs)}
          </p>
          <p className="mt-4 text-center text-sm text-muted">
            Termina a las {formatEndTime(current.startedAt, current.remainingSecAtStart)}
          </p>
          <Vigia progress={progress} isShort={isShort} />
          <p className="mt-6 text-center text-sm leading-6 text-muted">
            El reloj sigue aunque cambies de pantalla. Al volver, retomas donde ibas.
            No se inicia otra tarea hasta resolver esta.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void complete()}
              disabled={busy}
              className="min-h-12 rounded-none bg-foreground px-7 text-base font-semibold text-background disabled:opacity-60"
            >
              {busy ? "Guardando…" : isShort ? "Terminé el paso" : "Terminé"}
            </button>
            <button
              type="button"
              onClick={() => void pauseNow()}
              disabled={busy}
              className="min-h-12 rounded-none border border-control px-6 text-sm font-semibold disabled:opacity-60"
            >
              Pausar
            </button>
            <button
              type="button"
              onClick={() => void pauseNow("baby")}
              disabled={busy}
              className="min-h-12 rounded-none border border-control px-6 text-sm font-semibold disabled:opacity-60"
            >
              El bebé
            </button>
          </div>
        </>
      ) : null}

      {current.status === "awaiting_confirmation" ? (
        <div className="mt-6 space-y-4">
          <p className="text-base leading-7 text-muted">
            {isShort
              ? "Se acabó el tiempo del paso. La tarea sigue pendiente."
              : "Se acabó el tiempo de esta tarea. No se inicia otra hasta confirmar."}
          </p>
          <Vigia progress={progress} isShort={isShort} />
          {!showNoOptions ? (
            <>
              <p className="text-lg font-semibold">
                {isShort ? "¿Completaste el paso?" : "¿La terminaste?"}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void complete()}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? "Guardando…" : isShort ? "Sí, lo hice" : "Sí, terminé"}
                </button>
                <button
                  type="button"
                  onClick={askNo}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
                >
                  {isShort ? "No lo hice" : "No terminé"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">
                {isShort ? "¿Qué pasó con el paso?" : "¿Qué pasó con la tarea?"}
              </p>
              <p className="text-sm leading-6 text-muted">
                Puedes reintentar cinco minutos o marcarla como no aplica.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void retry()}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? "Guardando…" : "Reintentar 5 min"}
                </button>
                <button
                  type="button"
                  onClick={() => void notApplicable()}
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
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
        <div className="mt-6 space-y-4">
          <p className="text-base leading-7 text-muted">
            El tiempo está congelado en{" "}
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {formatRemaining(current.remainingSecAtStart * 1000)}
            </span>.
          </p>
          <Vigia progress={progress} isShort={isShort} />
          <p className="text-sm leading-6 text-muted">
            Al continuar, retomas exactamente ahí. La pausa no cuenta como fallo.
            No se inicia otra tarea hasta resolver esta.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void resumeNow()}
              disabled={busy}
              className="min-h-12 flex-1 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Continuar"}
            </button>
            <button
              type="button"
              onClick={() => void notApplicable()}
              disabled={busy}
              className="min-h-12 flex-1 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
            >
              No aplica
            </button>
          </div>
        </div>
      ) : null}

      {current.status === "running" ||
      current.status === "paused" ||
      current.status === "awaiting_confirmation" ? (
        <button
          type="button"
          onClick={() => void endDayNow()}
          disabled={busy}
          className="mt-6 min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline disabled:opacity-60"
        >
          {isTodaySession ? "Terminar por hoy" : "Cerrar sesión anterior"}
        </button>
      ) : null}

      {actionError ? (
        <p className="mt-5 border-l-2 border-accent pl-4 text-sm leading-6" role="alert">
          {actionError}
        </p>
      ) : null}

      {expiryError ? (
        <div className="mt-5 border-l-2 border-accent pl-4" role="alert">
          <p className="text-sm leading-6">{expiryError}</p>
          <button
            type="button"
            onClick={() => void expire()}
            className="mt-3 min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background"
          >
            Reintentar
          </button>
        </div>
      ) : null}
    </section>
  );
}


function Vigia({ progress, isShort }: { progress: number; isShort: boolean }) {
  return (
    <div className="mt-5">
      <div
        role="progressbar"
        aria-label={isShort ? "Avance del paso" : "Avance de la tarea"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${progress}% completado`}
        className="h-0.5 w-full bg-line"
      >
        <div
          className="vigia-fill h-full bg-foreground transition-[width] duration-200 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
