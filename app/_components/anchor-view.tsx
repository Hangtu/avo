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
        A las {task.fixedTime}
      </p>
      <div className="mt-2 flex items-start gap-2">
        <h2 id="anchor-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {task.title}
        </h2>
        <HelpTip label="Por qué aparece esto">
          Es la hora de esta tarea. Tú decides si empiezas o la dejas para después.
          Solo aparece si tienes Runo abierto.
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
          Dejar para después
        </button>
        <button
          type="button"
          onClick={onNotApplicable}
          disabled={busy}
          className="min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline disabled:opacity-60"
        >
          Hoy no
        </button>
      </div>
    </section>
  );
}
