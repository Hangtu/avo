"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  ensureDay,
  ensureOccurrence,
  listTasks,
  startSession,
} from "@/lib/db/repository";
import { seedDatabase } from "@/lib/db/seed";
import { currentFranja } from "@/lib/domain/franja";
import { toLocalDate, weekdayOf } from "@/lib/domain/time";
import type { Session } from "@/lib/domain/types";
import { SessionView } from "./session-view";

interface FranjaTask {
  id: string;
  title: string;
  durationMin: number;
  category: string;
  shortStepMin?: number;
}

type View =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "session"; dateLabel: string; session: Session }
  | {
      kind: "ready";
      dateLabel: string;
      tasks: FranjaTask[];
      pendingToday: number;
      remainingEligible: number;
      unscheduled: number;
    }
  | { kind: "empty"; dateLabel: string; pendingToday: number; unscheduled: number };

function formatDate(now: number): string {
  const formatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(now));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function RunoHome() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [pendingTask, setPendingTask] = useState<FranjaTask | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let db: RunoDatabase | null = null;

    async function load() {
      try {
        db = await openDatabase();
        const now = Date.now();
        const date = toLocalDate(now);
        const dateLabel = formatDate(now);

        await seedDatabase(db, now);
        await ensureDay(db, date, now);

        const tasks = await listTasks(db);
        const weekday = weekdayOf(date);
        for (const task of tasks) {
          if (!task.days.includes(weekday)) continue;
          try {
            await ensureOccurrence(db, task.id, date, now);
          } catch {
            // A task can be archived or edited between listing and materializing.
          }
        }

        const active = await db.sessions
          .filter(
            (session) =>
              session.status === "running" ||
              session.status === "paused" ||
              session.status === "awaiting_confirmation",
          )
          .first();

        if (cancelled) return;

        if (active) {
          setView({ kind: "session", dateLabel, session: active });
          return;
        }

        const occurrences = await db.occurrences.where("date").equals(date).toArray();
        const franja = currentFranja({
          tasks,
          occurrences,
          now,
          seed: date,
        });
        const unscheduled = tasks.filter((task) => task.days.length === 0).length;

        if (cancelled) return;

        if (franja.candidates.length) {
          setView({
            kind: "ready",
            dateLabel,
            tasks: franja.candidates.map(({ task }) => ({
              id: task.id,
              title: task.title,
              durationMin: task.durationMin,
              category: task.category,
              shortStepMin: task.shortStep?.durationMin,
            })),
            pendingToday: franja.pendingToday,
            remainingEligible: franja.remainingEligible,
            unscheduled,
          });
        } else {
          setView({
            kind: "empty",
            dateLabel,
            pendingToday: franja.pendingToday,
            unscheduled,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("No se pudo preparar Runo", error);
        setView({
          kind: "error",
          message: "No se pudo abrir el almacenamiento local de este navegador.",
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
      db?.close();
    };
  }, [refreshKey]);

  const finishSession = useCallback(() => {
    setNotice("Listo.");
    setView({ kind: "loading" });
    setPendingTask(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const beginSession = useCallback(async (task: FranjaTask) => {
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const session = await startSession(db, {
          sessionId: newSessionId(),
          taskId: task.id,
          date: toLocalDate(now),
          variant: "full",
          now,
        });
        setView({ kind: "session", dateLabel: formatDate(now), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo iniciar la tarea", error);
      setNotice(
        error instanceof Error ? error.message : "No se pudo iniciar la tarea.",
      );
    } finally {
      setPendingTask(null);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Runo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tu día, por franjas.
            </h1>
          </div>
          {view.kind !== "loading" && view.kind !== "error" ? (
            <p className="pb-1 text-sm text-muted">{view.dateLabel}</p>
          ) : null}
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          {notice ? (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-6"
            >
              {notice}
            </p>
          ) : null}

          {pendingTask ? (
            <Countdown
              task={pendingTask}
              onDone={beginSession}
              onCancel={() => setPendingTask(null)}
            />
          ) : (
            <>
              {view.kind === "loading" ? <LoadingState /> : null}
              {view.kind === "error" ? <ErrorState message={view.message} /> : null}
              {view.kind === "session" ? (
                <SessionView
                  key={view.session.id}
                  session={view.session}
                  onFinished={finishSession}
                />
              ) : null}
              {view.kind === "ready" ? (
                <Franja view={view} onStart={setPendingTask} />
              ) : null}
              {view.kind === "empty" ? <EmptyState view={view} /> : null}
            </>
          )}
        </div>

        <footer className="border-t border-line pt-5 text-sm leading-6 text-muted">
          Una cosa a la vez. Eliges el orden dentro de la franja.
        </footer>
      </div>
    </main>
  );
}

function Countdown({
  task,
  onDone,
  onCancel,
}: {
  task: FranjaTask;
  onDone: (task: FranjaTask) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [count, setCount] = useState(3);
  const fired = useRef(false);

  useEffect(() => {
    if (count === 0) {
      if (!fired.current) {
        fired.current = true;
        void onDone(task);
      }
      return;
    }
    const timeout = window.setTimeout(() => setCount((value) => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [count, onDone, task]);

  return (
    <section
      className="rounded-2xl border border-line bg-surface p-6 text-center shadow-sm sm:p-8"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Empezando
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight">{task.title}</h2>
      <p className="mt-6 font-mono text-8xl font-semibold tabular-nums text-accent">
        {count === 0 ? "…" : count}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted">
        {task.durationMin} min. La cuenta se puede cancelar.
      </p>
      {count > 0 ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 min-h-11 rounded-full border border-line px-6 text-sm font-semibold"
        >
          Cancelar
        </button>
      ) : null}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" role="status">
      <p className="text-sm text-muted">Preparando tu día…</p>
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6" role="alert">
      <h2 className="text-xl font-semibold">No pude abrir tus datos</h2>
      <p className="mt-2 text-base leading-7 text-muted">{message}</p>
      <p className="mt-3 text-sm leading-6 text-muted">
        Revisa que el navegador permita IndexedDB y vuelve a cargar la página.
      </p>
    </section>
  );
}

function Franja({
  view,
  onStart,
}: {
  view: Extract<View, { kind: "ready" }>;
  onStart: (task: FranjaTask) => void;
}) {
  const countLabel = view.tasks.length === 1 ? "1 tarea" : `${view.tasks.length} tareas`;
  return (
    <section aria-labelledby="franja-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Franja actual
          </p>
          <h2 id="franja-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Empieza por donde quieras.
          </h2>
        </div>
        <p className="text-sm text-muted">{countLabel} ahora</p>
      </div>

      <ol className="mt-6 space-y-3">
        {view.tasks.map((task, index) => (
          <li
            key={task.id}
            className="flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold text-accent">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-7">{task.title}</h3>
              <p className="mt-1 text-sm text-muted">
                {task.durationMin} min · {task.category}
                {task.shortStepMin ? ` · paso corto ${task.shortStepMin} min` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStart(task)}
              className="min-h-11 w-full rounded-full bg-accent px-5 text-sm font-semibold text-white sm:w-auto"
            >
              Empezar
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-sm leading-6 text-muted">
        {view.pendingToday} {view.pendingToday === 1 ? "pendiente" : "pendientes"} hoy
        {view.remainingEligible > 0
          ? ` · ${view.remainingEligible} más después de esta franja`
          : ""}
        .
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">
        La siguiente franja se abre cuando resuelvas esta.
      </p>
      {view.pendingToday > view.tasks.length ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          Las demás no están disponibles en este momento o ya pasó su horario.
        </p>
      ) : null}
      {view.unscheduled > 0 ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          {view.unscheduled} {view.unscheduled === 1 ? "tarea sin programar" : "tareas sin programar"}.
        </p>
      ) : null}
    </section>
  );
}

function EmptyState({ view }: { view: Extract<View, { kind: "empty" }> }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Franja actual
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        No hay tareas elegibles ahora.
      </h2>
      <p className="mt-2 text-base leading-7 text-muted">
        Puedes volver más tarde o revisar tu programación.
      </p>
      {view.unscheduled > 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          Tienes {view.unscheduled} {view.unscheduled === 1 ? "tarea" : "tareas"} sin programar.
        </p>
      ) : null}
    </section>
  );
}
