"use client";

import { useCallback, useEffect, useState } from "react";
import { openDatabase } from "@/lib/db/database";
import { expireSession } from "@/lib/db/repository";
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

export function SessionView({ session }: { session: Session }) {
  const [current, setCurrent] = useState(session);
  const [remainingMs, setRemainingMs] = useState(() =>
    current.status === "running"
      ? Math.max(0, current.startedAt + current.remainingSecAtStart * 1000 - Date.now())
      : 0,
  );
  const [error, setError] = useState<string | null>(null);

  useWakeLock(current.status === "running");

  const expire = useCallback(async () => {
    try {
      const db = await openDatabase();
      try {
        const expired = await expireSession(db, current.id, Date.now());
        setCurrent(expired);
        setError(null);
      } finally {
        db.close();
      }
    } catch (cause) {
      console.error("No se pudo cerrar el timer", cause);
      setError("No se pudo guardar el vencimiento. Vuelve a intentarlo.");
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
        </>
      ) : null}

      {current.status === "awaiting_confirmation" ? (
        <div className="mt-6 space-y-3 text-base leading-7 text-muted">
          <p>Se acabó el tiempo de esta tarea.</p>
          <p>La confirmación del resultado se conecta en el siguiente paso.</p>
        </div>
      ) : null}

      {current.status === "paused" ? (
        <div className="mt-6 space-y-3 text-base leading-7 text-muted">
          <p>El tiempo está congelado.</p>
          <p>Continuar se conecta en el siguiente paso de pausa.</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl border border-line bg-background p-4" role="alert">
          <p className="text-sm leading-6">{error}</p>
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
