"use client";

import { useEffect, useState } from "react";

const BREAK_MS = 10 * 60 * 1000;

type Phase = "offer" | "running" | "done";

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function BreakCard({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("offer");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(BREAK_MS);

  useEffect(() => {
    if (phase !== "running" || endsAt === null) return;
    let fired = false;

    function update() {
      const next = Math.max(0, (endsAt as number) - Date.now());
      setRemainingMs(next);
      if (next === 0 && !fired) {
        fired = true;
        setPhase("done");
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
  }, [phase, endsAt]);

  function start() {
    const now = Date.now();
    setEndsAt(now + BREAK_MS);
    setRemainingMs(BREAK_MS);
    setPhase("running");
  }

  return (
    <section
      aria-label="Descanso"
      className="mb-5 border-y border-line py-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Descanso
      </p>

      {phase === "offer" ? (
        <>
          <h2 className="mt-2 text-xl font-semibold">¿Quieres 10 min de descanso?</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Es gratis y no bloquea la siguiente tarea. Puedes empezar otra cuando quieras.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={start}
              className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background"
            >
              Empezar descanso
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-none border border-control px-5 text-sm font-semibold"
            >
              Ahora no
            </button>
          </div>
        </>
      ) : null}

      {phase === "running" ? (
        <>
          <p
            role="timer"
            aria-label="Tiempo de descanso restante"
            className="mt-3 break-words text-[clamp(2.25rem,18vw,3rem)] font-semibold tabular-nums text-foreground"
          >
            {formatRemaining(remainingMs)}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Puedes empezar la siguiente tarea cuando quieras; el descanso termina solo.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 min-h-11 rounded-none border border-control px-5 text-sm font-semibold"
          >
            Saltar descanso
          </button>
        </>
      ) : null}

      {phase === "done" ? (
        <>
          <h2 className="mt-2 text-xl font-semibold">Descanso terminado.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Cuando quieras, sigue con lo tuyo.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background"
          >
            Seguir
          </button>
        </>
      ) : null}
    </section>
  );
}
