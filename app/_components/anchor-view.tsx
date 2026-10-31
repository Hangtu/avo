"use client";

import type { Task } from "@/lib/domain/types";
import { HelpTip } from "./help-tip";

export function AnchorView({
  task,
  busy,
  onStart,
  onLeave,
  onNotApplicable,
}: {
  task: Task;
  busy: boolean;
  onStart: () => void;
  onLeave: () => void;
  onNotApplicable: () => void;
}) {
  return (
    <section className="border-y border-line py-8 sm:py-10" aria-labelledby="anchor-title">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Hora fija · {task.fixedTime}
      </p>
      <div className="mt-2 flex items-start gap-2">
        <h2 id="anchor-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {task.title}
        </h2>
        <HelpTip label="Información sobre el ancla">
          Es la hora de esta tarea. No se inicia sola: tú decides si empiezas,
          la dejas pendiente o marcas que hoy no aplica. Solo aparece con la app
          abierta; no hay aviso con la app cerrada.
        </HelpTip>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        {task.durationMin} min
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="min-h-11 bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Empezar"}
        </button>
        <button
          type="button"
          onClick={onLeave}
          disabled={busy}
          className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
        >
          Dejar pendiente
        </button>
        <button
          type="button"
          onClick={onNotApplicable}
          disabled={busy}
          className="min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline disabled:opacity-60"
        >
          No aplica
        </button>
      </div>
    </section>
  );
}
