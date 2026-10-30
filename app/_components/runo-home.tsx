"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  closeDay,
  ensureDay,
  ensureFranja,
  ensureOccurrence,
  listTasks,
  startSession,
  swapFranjaTask,
} from "@/lib/db/repository";
import { seedDatabase } from "@/lib/db/seed";
import { toLocalDate, weekdayOf } from "@/lib/domain/time";
import type { Session } from "@/lib/domain/types";
import { BreakCard } from "./break-card";
import { SessionView } from "./session-view";
import { TaskEditor } from "./task-editor";

interface FranjaTask {
  id: string;
  occurrenceId: string;
  title: string;
  durationMin: number;
  category: string;
  shortStepTitle?: string;
  shortStepMin?: number;
  shortStepDone: boolean;
  remainingMin: number;
}

type View =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "session"; dateLabel: string; session: Session }
  | {
      kind: "ready";
      dateLabel: string;
      handId: string;
      ordinal: number;
      tasks: FranjaTask[];
      pendingToday: number;
      remainingEligible: number;
      swapsRemaining: number;
      canSwap: boolean;
      unscheduled: number;
    }
  | { kind: "empty"; dateLabel: string; pendingToday: number; unscheduled: number }
  | { kind: "closed"; dateLabel: string };

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
  const [pendingStart, setPendingStart] = useState<{
    task: FranjaTask;
    variant: "full" | "short";
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showBreak, setShowBreak] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const swapBusy = useRef(false);

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
        const day = await ensureDay(db, date, now);

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

        if ((day.closedAt ?? null) !== null) {
          setView({ kind: "closed", dateLabel });
          return;
        }

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

        const occurrences = await db.occurrences.where("date").equals(date).toArray();
        const franja = await ensureFranja(db, { date, now, seed: date, tasks, occurrences });
        const unscheduled = tasks.filter((task) => task.days.length === 0).length;

        if (cancelled) return;

        if (franja.hand && franja.tasks.length) {
          setView({
            kind: "ready",
            dateLabel,
            handId: franja.hand.id,
            ordinal: franja.hand.ordinal,
            tasks: franja.tasks.map(({ task, occurrenceId, shortStepCompleted, remainingMin }) => ({
              id: task.id,
              occurrenceId,
              title: task.title,
              durationMin: task.durationMin,
              category: task.category,
              shortStepTitle: task.shortStep?.title,
              shortStepMin: task.shortStep?.durationMin,
              shortStepDone: shortStepCompleted,
              remainingMin,
            })),
            pendingToday: franja.pendingToday,
            remainingEligible: franja.remainingEligible,
            swapsRemaining: franja.swapsRemaining,
            canSwap: franja.canSwap,
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

  const refreshView = useCallback((message: string | null) => {
    setNotice(message);
    setView({ kind: "loading" });
    setPendingStart(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const finishSession = useCallback((offerBreak = false) => {
    setShowBreak(offerBreak);
    refreshView(offerBreak ? "Hecho." : "Listo.");
  }, [refreshView]);

  const openEditor = useCallback(() => {
    setShowBreak(false);
    setShowEditor(true);
  }, []);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
    setNotice(null);
    setView({ kind: "loading" });
    setRefreshKey((key) => key + 1);
  }, []);

  const endDay = useCallback(async () => {
    setShowBreak(false);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        await closeDay(db, toLocalDate(Date.now()), Date.now());
      } finally {
        db.close();
      }
      refreshView(null);
    } catch (error) {
      console.error("No se pudo cerrar el día", error);
      setNotice("No se pudo cerrar el día. Inténtalo de nuevo.");
    }
  }, [refreshView]);

  const swapTask = useCallback(async (task: FranjaTask) => {
    if (swapBusy.current || view.kind !== "ready") return;
    swapBusy.current = true;
    setSwapping(true);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const date = toLocalDate(now);
        const tasks = await listTasks(db);
        const occurrences = await db.occurrences.where("date").equals(date).toArray();
        const result = await swapFranjaTask(db, {
          handId: view.handId,
          occurrenceId: task.occurrenceId,
          now,
          seed: date,
          tasks,
          occurrences,
        });
        if (result.swapped) {
          refreshView("Cambiada.");
        } else if (result.reason === "no_alternative") {
          setNotice("No hay otra tarea elegible ahora.");
        } else if (result.reason === "no_swaps") {
          setNotice("Ya usaste los 3 cambios de hoy.");
        } else if (result.reason === "active_session") {
          setNotice("No se puede cambiar mientras hay una sesión activa.");
        } else {
          setNotice("No se pudo cambiar la tarea.");
        }
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo cambiar la tarea", error);
      setNotice("No se pudo cambiar la tarea. Inténtalo de nuevo.");
    } finally {
      swapBusy.current = false;
      setSwapping(false);
    }
  }, [refreshView, view]);

  const beginSession = useCallback(async (
    task: FranjaTask,
    variant: "full" | "short",
  ) => {
    setShowBreak(false);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const session = await startSession(db, {
          sessionId: newSessionId(),
          taskId: task.id,
          date: toLocalDate(now),
          variant,
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
      setPendingStart(null);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-10 sm:py-16">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Runo
              <span aria-hidden className="ml-2 inline-block h-2 w-2 bg-accent align-middle" />
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Tu día, por franjas.
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 pb-1">
            {view.kind !== "loading" && view.kind !== "error" ? (
              <p className="text-sm text-muted">{view.dateLabel}</p>
            ) : null}
            <button
              type="button"
              onClick={showEditor ? closeEditor : openEditor}
              disabled={!showEditor && pendingStart !== null}
              className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
            >
              {showEditor ? "Volver a hoy" : "Tareas"}
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          {showEditor ? <TaskEditor /> : null}
          {!showEditor && notice ? (
            <p
              role="alert"
              className="mb-4 border-l-2 border-line pl-4 text-sm leading-6"
            >
              {notice}
            </p>
          ) : null}

          {!showEditor && pendingStart ? (
            <Countdown
              task={pendingStart.task}
              variant={pendingStart.variant}
              onDone={beginSession}
              onCancel={() => setPendingStart(null)}
            />
          ) : null}
          {!showEditor && !pendingStart ? (
            <>
              {view.kind === "loading" ? <LoadingState /> : null}
              {view.kind === "error" ? (
                <ErrorState message={view.message} onRetry={() => refreshView(null)} />
              ) : null}
              {showBreak && (view.kind === "ready" || view.kind === "empty") ? (
                <BreakCard onClose={() => setShowBreak(false)} />
              ) : null}
              {view.kind === "session" ? (
                <SessionView
                  key={view.session.id}
                  session={view.session}
                  onFinished={finishSession}
                />
              ) : null}
              {view.kind === "ready" ? (
                <Franja
                  view={view}
                  onStart={(task, variant) => setPendingStart({ task, variant })}
                  onSwap={swapTask}
                  onEndDay={endDay}
                  swapping={swapping}
                />
              ) : null}
              {view.kind === "empty" ? (
                <EmptyState onEndDay={endDay} />
              ) : null}
              {view.kind === "closed" ? <DayClosed view={view} /> : null}
            </>
          ) : null}
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
  variant,
  onDone,
  onCancel,
}: {
  task: FranjaTask;
  variant: "full" | "short";
  onDone: (task: FranjaTask, variant: "full" | "short") => void | Promise<void>;
  onCancel: () => void;
}) {
  const [count, setCount] = useState(3);
  const fired = useRef(false);
  const title = variant === "short" ? task.shortStepTitle ?? task.title : task.title;
  const duration = variant === "short" ? task.shortStepMin ?? task.durationMin : task.remainingMin;

  useEffect(() => {
    if (count === 0) {
      if (!fired.current) {
        fired.current = true;
        void onDone(task, variant);
      }
      return;
    }
    const timeout = window.setTimeout(() => setCount((value) => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [count, onDone, task, variant]);

  return (
    <section
      className="border-y border-line py-8 text-center sm:py-10"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {variant === "short" ? "Primer paso" : "Empezando"}
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight">{title}</h2>
      <p className="mt-6 text-8xl font-semibold tabular-nums text-foreground">
        {count === 0 ? "…" : count}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted">
        {duration} min. La cuenta se puede cancelar.
      </p>
      {count > 0 ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 min-h-11 rounded-none border border-line px-6 text-sm font-semibold"
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
      <div className="h-24 animate-pulse rounded-none bg-surface" />
      <div className="h-24 animate-pulse rounded-none bg-surface" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="border-y border-line py-6" role="alert">
      <h2 className="text-xl font-semibold">No pude abrir tus datos</h2>
      <p className="mt-2 text-base leading-7 text-muted">{message}</p>
      <p className="mt-3 text-sm leading-6 text-muted">
        Revisa que el navegador permita IndexedDB.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 text-sm font-semibold underline underline-offset-4"
      >
        Reintentar
      </button>
    </section>
  );
}

function Franja({
  view,
  onStart,
  onSwap,
  onEndDay,
  swapping,
}: {
  view: Extract<View, { kind: "ready" }>;
  onStart: (task: FranjaTask, variant: "full" | "short") => void;
  onSwap: (task: FranjaTask) => void | Promise<void>;
  onEndDay: () => void;
  swapping: boolean;
}) {
  const countLabel = view.tasks.length === 1 ? "1 tarea" : `${view.tasks.length} tareas`;
  return (
    <section aria-labelledby="franja-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Franja {view.ordinal}
          </p>
          <h2 id="franja-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Empieza por donde quieras.
          </h2>
        </div>
        <p className="text-sm text-muted">{countLabel} ahora</p>
      </div>

      <ol className="mt-4 border-t border-line">
        {view.tasks.map((task, index) => (
          <li
            key={task.id}
            className="flex flex-wrap items-start gap-4 border-b border-line py-5"
          >
            <span className="mt-1 w-6 shrink-0 text-xs font-semibold tabular-nums text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-7">{task.title}</h3>
              <p className="mt-1 text-sm text-muted">
                {task.remainingMin} min{task.shortStepDone ? " restantes" : ""} ·{" "}
                {task.category}
                {task.shortStepMin
                  ? task.shortStepDone
                    ? " · paso hecho"
                    : ` · paso: ${task.shortStepTitle ?? "primer paso"} (${task.shortStepMin} min)`
                  : ""}
              </p>
            </div>
            <div className="flex w-full gap-5 sm:w-auto">
              <button
                type="button"
                onClick={() => onStart(task, "full")}
                disabled={swapping}
                className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
              >
                {task.shortStepDone ? `Continuar ${task.remainingMin} min` : "Empezar"}
              </button>
              {task.shortStepMin && !task.shortStepDone ? (
                <button
                  type="button"
                  onClick={() => onStart(task, "short")}
                  disabled={swapping}
                  className="min-h-11 text-sm text-muted underline-offset-4 hover:underline disabled:opacity-60"
                >
                  Paso {task.shortStepMin} min
                </button>
              ) : null}
              {view.canSwap ? (
                <button
                  type="button"
                  onClick={() => void onSwap(task)}
                  disabled={swapping}
                  className="min-h-11 text-sm text-muted underline-offset-4 hover:underline disabled:opacity-60"
                >
                  Otra
                </button>
              ) : null}
            </div>
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
        {view.swapsRemaining > 0
          ? `${view.swapsRemaining} ${
              view.swapsRemaining === 1 ? "cambio" : "cambios"
            }${view.canSwap ? "" : " · sin otra tarea elegible"}.`
          : "Ya usaste los 3 cambios de hoy."}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Resuelve esta franja para abrir la siguiente.
      </p>
      <button
        type="button"
        onClick={onEndDay}
        className="mt-6 min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline"
      >
        Terminar por hoy
      </button>
    </section>
  );
}

function EmptyState({ onEndDay }: { onEndDay: () => void }) {
  return (
    <section className="border-t border-line pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Franja actual
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        No hay tareas elegibles ahora.
      </h2>
      <p className="mt-2 text-base leading-7 text-muted">
        Puedes volver más tarde o revisar tus tareas.
      </p>
      <button
        type="button"
        onClick={onEndDay}
        className="mt-6 min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline"
      >
        Terminar por hoy
      </button>
    </section>
  );
}

function DayClosed({ view }: { view: Extract<View, { kind: "closed" }> }) {
  return (
    <section
      aria-label={`Día cerrado, ${view.dateLabel}`}
      className="border-y border-line py-8 sm:py-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Día cerrado
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Terminaste por hoy.
      </h2>
      <p className="mt-3 text-base leading-7 text-muted">
        Lo hecho queda guardado. No se pagó lo pendiente.
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">Mañana seguimos.</p>
    </section>
  );
}
