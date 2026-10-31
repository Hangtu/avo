"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  closeDay,
  ensureDay,
  ensureFranja,
  ensureOccurrence,
  getSettings,
  listTasks,
  markOccurrenceAlreadyDoneDirect,
  markOccurrenceNotApplicableDirect,
  recordOffered,
  startPendingSession,
  startQuickSession,
  startSession,
  swapFranjaTask,
} from "@/lib/db/repository";
import { seedDatabase } from "@/lib/db/seed";
import { toLocalDate, weekdayOf } from "@/lib/domain/time";
import type { Occurrence, Pending, Session, Task } from "@/lib/domain/types";
import { BreakCard } from "./break-card";
import { HelpTip } from "./help-tip";
import { PendingView } from "./pending-view";
import { QuickTaskForm } from "./quick-task-form";
import { SessionView } from "./session-view";
import { AnchorView } from "./anchor-view";
import { useAnchorWatcher } from "./use-anchor-watcher";
import { TaskEditor } from "./task-editor";
import { useVoicePreference } from "./use-voice-preference";
import { WalletView } from "./wallet-view";
import { SettingsView } from "./settings-view";
import { useThemePreference } from "./use-theme-preference";

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
  remainingRc: number;
}

type View =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "session"; dateLabel: string; session: Session }
  | { kind: "anchor"; dateLabel: string; task: Task; occurrence: Occurrence }
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
    handId: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showBreak, setShowBreak] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [quickFormOpen, setQuickFormOpen] = useState(false);
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);
  const [pendingComposerFocus, setPendingComposerFocus] = useState(0);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showWalletLink, setShowWalletLink] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [anchorBusy, setAnchorBusy] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const quickBusyRef = useRef(false);
  const pendingBusyRef = useRef(false);
  const voice = useVoicePreference();
  const theme = useThemePreference();
  const swapBusy = useRef(false);
  const correctBusy = useRef(false);

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
        const preferences = await getSettings(db, now);
        if (!cancelled) setShowWalletLink(preferences.showWallet);
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
            tasks: franja.tasks.map(({ task, occurrenceId, shortStepCompleted, remainingMin, remainingRc }) => ({
              id: task.id,
              occurrenceId,
              title: task.title,
              durationMin: task.durationMin,
              category: task.category,
              shortStepTitle: task.shortStep?.title,
              shortStepMin: task.shortStep?.durationMin,
              shortStepDone: shortStepCompleted,
              remainingMin,
              remainingRc,
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
          message: "No pude leer lo que tienes guardado.",
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

  const finishSession = useCallback((offerBreak = false, message?: string) => {
    const fromPending = view.kind === "session" && view.session.pendingId !== undefined;
    setQuickFormOpen(false);
    setShowBreak(offerBreak);
    if (fromPending) {
      setShowPending(true);
      setPendingMessage(message ?? (offerBreak ? "Hecho." : "Listo."));
    } else {
      setShowPending(false);
    }
    refreshView(message ?? (offerBreak ? "Hecho." : "Listo."));
  }, [refreshView, view]);

  const openAnchor = useCallback((task: Task, occurrence: Occurrence) => {
    setShowBreak(false);
    setShowPending(false);
    setQuickFormOpen(false);
    setNotice(null);
    setView({
      kind: "anchor",
      dateLabel: formatDate(Date.now()),
      task,
      occurrence,
    });
  }, []);

  const beginAnchor = useCallback(async (task: Task, occurrence: Occurrence) => {
    if (anchorBusy) return;
    setAnchorBusy(true);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const session = await startSession(db, {
          sessionId: newSessionId(),
          taskId: task.id,
          date: occurrence.date,
          variant: "full",
          now,
          anchor: true,
        });
        setView({ kind: "session", dateLabel: formatDate(now), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo iniciar el ancla", error);
      setNotice(error instanceof Error ? error.message : "No pude empezar la hora fija.");
    } finally {
      setAnchorBusy(false);
    }
  }, [anchorBusy]);

  const leaveAnchor = useCallback(() => {
    refreshView(null);
  }, [refreshView]);

  const notApplicableAnchor = useCallback(async (occurrence: Occurrence) => {
    if (anchorBusy) return;
    setAnchorBusy(true);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        await markOccurrenceNotApplicableDirect(db, occurrence.id, Date.now());
      } finally {
        db.close();
      }
      refreshView(null);
    } catch (error) {
      console.error("No se pudo marcar el ancla", error);
      setNotice(error instanceof Error ? error.message : "No pude marcarla.");
    } finally {
      setAnchorBusy(false);
    }
  }, [anchorBusy, refreshView]);

  const anchorWatcherEnabled =
    !showEditor &&
    !showWallet &&
    !showSettings &&
    !showPending &&
    pendingStart === null &&
    correctingId === null &&
    (view.kind === "ready" || view.kind === "empty" || view.kind === "session");

  useAnchorWatcher({ enabled: anchorWatcherEnabled, onAnchor: openAnchor });

  const openEditor = useCallback(() => {
    setShowBreak(false);
    setShowPending(false);
    setQuickFormOpen(false);
    setShowWallet(false);
    setShowSettings(false);
    setEditorTaskId(null);
    setShowEditor(true);
  }, []);

  const openEditorForTask = useCallback((taskId: string) => {
    setShowBreak(false);
    setShowPending(false);
    setQuickFormOpen(false);
    setShowWallet(false);
    setShowSettings(false);
    setEditorTaskId(taskId);
    setShowEditor(true);
  }, []);

  const openWallet = useCallback(() => {
    setShowBreak(false);
    setShowEditor(false);
    setShowSettings(false);
    setShowPending(false);
    setQuickFormOpen(false);
    setEditorTaskId(null);
    setShowWallet(true);
  }, []);

  const openSettings = useCallback(() => {
    setShowBreak(false);
    setShowEditor(false);
    setShowWallet(false);
    setShowPending(false);
    setQuickFormOpen(false);
    setShowSettings(true);
  }, []);

  const openPendings = useCallback((focusComposer = false) => {
    setShowBreak(false);
    setShowEditor(false);
    setShowWallet(false);
    setShowSettings(false);
    setQuickFormOpen(false);
    setEditorTaskId(null);
    setNotice(null);
    setPendingMessage(null);
    setShowPending(true);
    if (focusComposer) setPendingComposerFocus((value) => value + 1);
  }, []);

  const closeSecondary = useCallback(() => {
    setShowEditor(false);
    setShowWallet(false);
    setShowSettings(false);
    setShowPending(false);
    setQuickFormOpen(false);
    setEditorTaskId(null);
    setNotice(null);
    setPendingMessage(null);
    setView({ kind: "loading" });
    setRefreshKey((key) => key + 1);
  }, []);

  const endDay = useCallback(async () => {
    setShowBreak(false);
    setQuickFormOpen(false);
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
      setNotice("No pude cerrar el día. Inténtalo de nuevo.");
    }
  }, [refreshView]);

  const correctTask = useCallback(async (
    task: FranjaTask,
    kind: "already_done" | "not_applicable",
  ) => {
    if (correctBusy.current) return;
    correctBusy.current = true;
    setCorrectingId(task.occurrenceId);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        if (kind === "already_done") {
          await markOccurrenceAlreadyDoneDirect(db, task.occurrenceId, now, "franja");
        } else {
          await markOccurrenceNotApplicableDirect(db, task.occurrenceId, now, "franja");
        }
      } finally {
        db.close();
      }
      refreshView(kind === "already_done" ? "Ya estaba hecho." : "Hoy no.");
    } catch (error) {
      console.error("No se pudo corregir la tarea", error);
      setNotice(error instanceof Error ? error.message : "No pude corregirla.");
    } finally {
      correctBusy.current = false;
      setCorrectingId(null);
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
          refreshView("Listo, la cambié.");
        } else if (result.reason === "no_alternative") {
          setNotice("No hay otra tarea para ahora.");
        } else if (result.reason === "no_swaps") {
          setNotice("Ya cambiaste 3 veces hoy.");
        } else if (result.reason === "active_session") {
          setNotice("Primero termina lo que ya empezaste.");
        } else {
          setNotice("No pude cambiarla.");
        }
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo cambiar la tarea", error);
      setNotice("No pude cambiarla. Inténtalo de nuevo.");
    } finally {
      swapBusy.current = false;
      setSwapping(false);
    }
  }, [refreshView, view]);

  const offerTask = useCallback(async (handId: string, task: FranjaTask) => {
    try {
      const db = await openDatabase();
      try {
        await recordOffered(db, {
          handId,
          taskId: task.id,
          occurrenceId: task.occurrenceId,
          now: Date.now(),
        });
      } finally {
        db.close();
      }
    } catch (error) {
      // Instrumentation must never block the card the user is trying to start.
      console.error("No se pudo registrar la carta mostrada", error);
    }
  }, []);

  const beginQuickSession = useCallback(async (title: string, durationMin: number) => {
    if (quickBusyRef.current) return;
    quickBusyRef.current = true;
    setQuickBusy(true);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const session = await startQuickSession(db, {
          sessionId: newSessionId(),
          taskId: `quick:${newSessionId()}`,
          title,
          durationMin,
          now,
        });
        setShowBreak(false);
        setShowPending(false);
        setQuickFormOpen(false);
        setView({ kind: "session", dateLabel: formatDate(now), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo iniciar la sesión rápida", error);
      setNotice(
        error instanceof Error ? error.message : "No pude empezar la tarea rápida.",
      );
    } finally {
      quickBusyRef.current = false;
      setQuickBusy(false);
    }
  }, []);

  const beginPendingSession = useCallback(async (pending: Pending) => {
    if (pendingBusyRef.current) return;
    pendingBusyRef.current = true;
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const session = await startPendingSession(db, {
          sessionId: newSessionId(),
          pendingId: pending.id,
          now,
        });
        setShowBreak(false);
        setShowPending(false);
        setQuickFormOpen(false);
        setView({ kind: "session", dateLabel: formatDate(now), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo empezar el pendiente", error);
      throw error instanceof Error ? error : new Error("No pude empezar el pendiente.");
    } finally {
      pendingBusyRef.current = false;
    }
  }, []);

  const beginSession = useCallback(async (
    task: FranjaTask,
    variant: "full" | "short",
    handId: string,
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
          handId,
        });
        setQuickFormOpen(false);
        setView({ kind: "session", dateLabel: formatDate(now), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo iniciar la tarea", error);
      setNotice(
        error instanceof Error ? error.message : "No pude empezar la tarea.",
      );
    } finally {
      setPendingStart(null);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="runo-shell mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-10 sm:py-16">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Runo
              <span aria-hidden className="ml-2 inline-block h-2 w-2 bg-accent align-middle" />
            </p>
            <h1 className={`mt-2 text-4xl font-semibold tracking-tight sm:text-5xl ${showEditor || showSettings || showWallet || showPending ? "hidden" : ""}`}>
              Recuerda lo que importa.
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 pb-1">
            {!showEditor && !showWallet && !showSettings && !showPending && view.kind !== "session" && view.kind !== "anchor" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPendings(true)}
                  disabled={pendingStart !== null}
                  className="min-h-11 whitespace-nowrap border border-control px-3 text-sm font-semibold disabled:opacity-60"
                  aria-label="Agregar un pendiente"
                >
                  ＋ Pendiente
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFormOpen((value) => !value)}
                  disabled={quickBusy || pendingStart !== null}
                  aria-expanded={quickFormOpen}
                  aria-controls="quick-task-panel"
                  className="min-h-11 whitespace-nowrap border border-control px-3 text-sm font-semibold disabled:opacity-60"
                >
                  Tarea rápida ⏱️
                </button>
              </div>
            ) : null}
            {view.kind !== "loading" && view.kind !== "error" ? (
              <p className="text-sm text-muted">{view.dateLabel}</p>
            ) : null}
            <div className="hidden items-center justify-end gap-3 sm:flex">
              {showEditor || showWallet || showSettings || showPending ? (
                <button
                  type="button"
                  onClick={closeSecondary}
                  className="min-h-11 text-sm font-semibold underline underline-offset-4"
                >
                  Volver a hoy
                </button>
              ) : (
                <>
                  {showWalletLink ? (
                    <button
                      type="button"
                      onClick={openWallet}
                      disabled={pendingStart !== null}
                      className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                    >
                      Monedero
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={openEditor}
                    disabled={pendingStart !== null}
                    className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                  >
                    Tareas
                  </button>
                  <button
                    type="button"
                    onClick={() => openPendings(false)}
                    disabled={pendingStart !== null}
                    className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                  >
                    Pendientes
                  </button>
                  <button
                    type="button"
                    onClick={openSettings}
                    disabled={pendingStart !== null}
                    className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                  >
                    Ajustes
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          {showPending ? (
            <PendingView
              focusComposer={pendingComposerFocus}
              message={pendingMessage}
              onStart={beginPendingSession}
            />
          ) : null}
          {showEditor ? <TaskEditor initialTaskId={editorTaskId} /> : null}
          {showSettings ? (
            <SettingsView
              tone={voice.tone ?? 0}
              voiceReady={voice.ready}
              onTone={voice.setTone}
              onWalletVisibilityChange={setShowWalletLink}
              onOpenWallet={openWallet}
              theme={theme.mode}
              themeReady={theme.ready}
              themeBusy={theme.busy}
              themeError={theme.error}
              onThemeChange={(next) => void theme.setTheme(next)}
            />
          ) : null}
          {showWallet ? <WalletView /> : null}
          {!showEditor && !showWallet && !showSettings && !showPending && quickFormOpen ? (
            <section
              id="quick-task-panel"
              aria-labelledby="quick-task-title"
              className="mb-6 border-y border-line py-5"
            >
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Tarea rápida
                </p>
                <HelpTip label="Para qué sirve la tarea rápida">
                  Esto es solo para ahora. No se guarda en tus tareas. Cuando termines, vuelves aquí.
                </HelpTip>
              </div>
              <h2 id="quick-task-title" className="mt-2 text-xl font-semibold tracking-tight">
                Algo para ahora
              </h2>
              <QuickTaskForm
                busy={quickBusy}
                autoFocus
                onStart={beginQuickSession}
                onCancel={() => setQuickFormOpen(false)}
              />
            </section>
          ) : null}
          {!showEditor && !showWallet && !showSettings && !showPending && notice ? (
            <p
              role="alert"
              className="mb-4 border-l-2 border-line pl-4 text-sm leading-6"
            >
              {notice}
            </p>
          ) : null}

          {!showEditor && !showWallet && !showSettings && !showPending && pendingStart ? (
            <Countdown
              task={pendingStart.task}
              variant={pendingStart.variant}
              handId={pendingStart.handId}
              onDone={beginSession}
              onCancel={() => setPendingStart(null)}
            />
          ) : null}
          {!showEditor && !showWallet && !showSettings && !showPending && !pendingStart ? (
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
                  tone={voice.tone ?? 0}
                />
              ) : null}
              {view.kind === "anchor" ? (
                <AnchorView
                  task={view.task}
                  busy={anchorBusy}
                  onStart={() => void beginAnchor(view.task, view.occurrence)}
                  onLeave={leaveAnchor}
                  onNotApplicable={() => void notApplicableAnchor(view.occurrence)}
                />
              ) : null}
              {view.kind === "ready" ? (
                <Franja
                  view={view}
                  onStart={(task, variant) => {
                    setQuickFormOpen(false);
                    setPendingStart({ task, variant, handId: view.handId });
                  }}
                  onOffer={offerTask}
                  onSwap={swapTask}
                  onAlreadyDone={(task) => void correctTask(task, "already_done")}
                  onNotApplicable={(task) => void correctTask(task, "not_applicable")}
                  onEdit={(task) => openEditorForTask(task.id)}
                  swapping={swapping}
                  correctingId={correctingId}
                />
              ) : null}
              {view.kind === "empty" ? (
                <EmptyState onEndDay={endDay} />
              ) : null}
              {view.kind === "closed" ? <DayClosed view={view} /> : null}
            </>
          ) : null}
        </div>

        <div aria-hidden className="runo-dock-scrim" />
        <nav className="runo-dock" aria-label="Navegación principal">
          <button
            type="button"
            onClick={() => {
              if (showEditor || showWallet || showSettings || showPending) closeSecondary();
            }}
            disabled={pendingStart !== null}
            aria-current={!showEditor && !showWallet && !showSettings && !showPending ? "page" : undefined}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={openEditor}
            disabled={pendingStart !== null}
            aria-current={showEditor ? "page" : undefined}
          >
            Tareas
          </button>
          <button
            type="button"
            onClick={() => openPendings(false)}
            disabled={pendingStart !== null}
            aria-current={showPending ? "page" : undefined}
            aria-label="Pendientes"
          >
            <span className="dock-label-full">Pendientes</span>
            <span className="dock-label-short" aria-hidden>Pend.</span>
          </button>
          <button
            type="button"
            onClick={openSettings}
            disabled={pendingStart !== null}
            aria-current={showSettings ? "page" : undefined}
          >
            Ajustes
          </button>
          {showWalletLink ? (
            <button
              type="button"
              onClick={openWallet}
              disabled={pendingStart !== null}
              aria-current={showWallet ? "page" : undefined}
            >
              Monedero
            </button>
          ) : null}
        </nav>
      </div>
    </main>
  );
}

function Countdown({
  task,
  variant,
  handId,
  onDone,
  onCancel,
}: {
  task: FranjaTask;
  variant: "full" | "short";
  handId: string;
  onDone: (task: FranjaTask, variant: "full" | "short", handId: string) => void | Promise<void>;
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
        void onDone(task, variant, handId);
      }
      return;
    }
    const timeout = window.setTimeout(() => setCount((value) => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [count, handId, onDone, task, variant]);

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
        {duration} min. Puedes cancelar.
      </p>
      {count > 0 ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 min-h-11 rounded-none border border-control px-6 text-sm font-semibold"
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
      <div className="h-24 animate-pulse rounded-none bg-surface motion-reduce:animate-none motion-reduce:opacity-60" />
      <div className="h-24 animate-pulse rounded-none bg-surface motion-reduce:animate-none motion-reduce:opacity-60" />
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
        Revisa que esta app pueda guardar datos. Si sigue, ábrela de nuevo.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 text-sm font-semibold underline underline-offset-4"
      >
        Intentar de nuevo
      </button>
    </section>
  );
}

function Franja({
  view,
  onStart,
  onOffer,
  onSwap,
  onAlreadyDone,
  onNotApplicable,
  onEdit,
  swapping,
  correctingId,
}: {
  view: Extract<View, { kind: "ready" }>;
  onStart: (task: FranjaTask, variant: "full" | "short") => void;
  onOffer: (handId: string, task: FranjaTask) => void | Promise<void>;
  onSwap: (task: FranjaTask) => void | Promise<void>;
  onAlreadyDone: (task: FranjaTask) => void;
  onNotApplicable: (task: FranjaTask) => void;
  onEdit: (task: FranjaTask) => void;
  swapping: boolean;
  correctingId: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const tasks = view.tasks;
  const task = tasks[index % Math.max(tasks.length, 1)];
  const busy = swapping || correctingId !== null;

  useEffect(() => {
    if (!task) return;
    void onOffer(view.handId, task);
  }, [onOffer, task, view.handId]);

  if (!task) return null;

  const remaining = task.remainingMin;
  const primaryLabel = task.shortStepDone
    ? `Continuar ${remaining} min`
    : "Empezar";

  return (
    <section className="first-experience" aria-labelledby="first-title">
      <p className="first-eyebrow">Ahora</p>
      <h2 id="first-title" className="first-title">{task.title}</h2>
      <p className="first-duration">{remaining} min</p>

      <div className="first-actions">
        <button
          type="button"
          className="bg-foreground px-6 text-base font-semibold text-background disabled:opacity-60"
          disabled={busy}
          onClick={() => onStart(task, "full")}
        >
          {primaryLabel} ▶️
        </button>
        {tasks.length > 1 ? (
          <button
            type="button"
            className="first-secondary"
            disabled={busy}
            onClick={() => {
              setIndex((value) => value + 1);
              setMenuOpen(false);
            }}
          >
            Ver otra
          </button>
        ) : null}
        <button
          type="button"
          className="first-more"
          disabled={busy}
          aria-label="Más opciones"
          aria-expanded={menuOpen}
          aria-controls="first-more-menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          ⋯
        </button>
      </div>

      {menuOpen ? (
        <div id="first-more-menu" className="first-menu">
          {task.shortStepMin && !task.shortStepDone ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStart(task, "short")}
            >
              Solo tengo {task.shortStepMin} min ⏱️
            </button>
          ) : null}
          {view.canSwap ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSwap(task)}
            >
              Cambiar por otra tarea 🔄
            </button>
          ) : null}
          <button type="button" disabled={busy} onClick={() => onAlreadyDone(task)}>
            Ya está hecho ✅
          </button>
          <button type="button" disabled={busy} onClick={() => onNotApplicable(task)}>
            Hoy no ❌
          </button>
          <button type="button" disabled={busy} onClick={() => onEdit(task)}>
            Editar tarea ✏️
          </button>
        </div>
      ) : null}
    </section>
  );
}

function EmptyState({ onEndDay }: { onEndDay: () => void }) {
  return (
    <section className="border-t border-line pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Ahora
      </p>
      <div className="mt-3 flex items-start gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          No tienes nada que hacer ahora.
        </h2>
        <HelpTip label="Qué hacer ahora">
          Vuelve más tarde o mira tus tareas.
        </HelpTip>
      </div>
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
      aria-label={`Hoy terminado, ${view.dateLabel}`}
      className="border-y border-line py-8 sm:py-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Hoy
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Ya terminaste por hoy.
      </h2>
      <p className="mt-3 text-base leading-7 text-muted">
        Lo que hiciste queda guardado. Lo que no hiciste no te quita nada.
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">Mañana seguimos.</p>
    </section>
  );
}
