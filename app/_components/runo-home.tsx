"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Menu } from "@base-ui/react/menu";
import { Toast } from "@base-ui/react/toast";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  closeDay,
  ensureDay,
  ensureFranja,
  ensureOccurrence,
  listPendings,
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
import { intlLocales } from "@/lib/i18n/config";
import { buildDayReview, type DayReview, type DayReviewItem } from "@/lib/domain/day-review";
import { toLocalDate, weekdayOf } from "@/lib/domain/time";
import { chooseVoicePhrase, type VoiceTone } from "@/lib/domain/voice";
import { voicePhrasesFromMessages } from "@/lib/i18n/voice";
import type { Occurrence, Pending, Session, Task } from "@/lib/domain/types";
import { BreakCard } from "./break-card";
import { ConfirmDialog } from "./confirm-dialog";
import { HelpTip } from "./help-tip";
import { MissedBadge } from "./missed-badge";
import { PendingView } from "./pending-view";
import { QuickTaskForm } from "./quick-task-form";
import { SessionView } from "./session-view";
import { AccountGreeting } from "./account-greeting";
import { AnchorView } from "./anchor-view";
import { useAnchorWatcher } from "./use-anchor-watcher";
import { TaskEditor } from "./task-editor";
import { useVoicePreference } from "./use-voice-preference";
import { WalletView } from "./wallet-view";
import { SettingsView } from "./settings-view";
import { RunoToaster } from "./runo-toaster";
import { useThemePreference } from "./use-theme-preference";
import { EndDayReview, type ReviewGroups, type ReviewTask } from "./end-day-review";
import type { FranjaTask } from "./franja-task";

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
    }
  | { kind: "empty"; dateLabel: string; pendingToday: number }
  | { kind: "closed"; dateLabel: string };

function formatDate(now: number, locale: string): string {
  const formatted = new Intl.DateTimeFormat(locale, {
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

function toReviewTask(item: DayReviewItem): ReviewTask {
  const { task, occurrence, block, missed, canStart } = item;
  return {
    task: {
      id: task.id,
      occurrenceId: occurrence.id,
      title: task.title,
      durationMin: task.durationMin,
      category: task.category,
      shortStepTitle: task.shortStep?.title,
      shortStepMin: task.shortStep?.durationMin,
      shortStepDone: occurrence.shortStepCompleted,
      remainingMin: Math.max(
        1,
        Math.ceil((task.durationMin * 60 - occurrence.timerElapsedSec) / 60),
      ),
      remainingRc: Math.max(0, task.durationMin - occurrence.creditedRc),
      block,
      isMissed: missed,
    },
    canStart,
  };
}

function toReviewGroups(review: DayReview): ReviewGroups {
  return {
    missed: review.missed.map(toReviewTask),
    later: review.later.map(toReviewTask),
  };
}

function withoutReviewOccurrence(groups: ReviewGroups, occurrenceId: string): ReviewGroups {
  return {
    missed: groups.missed.filter((item) => item.task.occurrenceId !== occurrenceId),
    later: groups.later.filter((item) => item.task.occurrenceId !== occurrenceId),
  };
}

export function RunoHome() {
  const t = useTranslations();
  const locale = useLocale();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [pendingStart, setPendingStart] = useState<{
    task: FranjaTask;
    variant: "full" | "short";
    handId: string | null;
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
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const pendingLabel = pendingCount === null || pendingCount <= 0
    ? null
    : pendingCount > 99 ? "99+" : String(pendingCount);
  const [refreshKey, setRefreshKey] = useState(0);
  const [anchorBusy, setAnchorBusy] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [endDayReview, setEndDayReview] = useState<ReviewGroups | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [endingDay, setEndingDay] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const quickBusyRef = useRef(false);
  const pendingBusyRef = useRef(false);
  const voice = useVoicePreference();
  const theme = useThemePreference();
  const reduceMotion = useReducedMotion();
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
        const dateLabel = formatDate(now, intlLocales[locale]);

        await seedDatabase(db, now);
        const day = await ensureDay(db, date, now);
        const pendings = await listPendings(db);
        if (!cancelled) setPendingCount(pendings.length);

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

        if (cancelled) return;

        if (franja.hand && franja.tasks.length) {
          setView({
            kind: "ready",
            dateLabel,
            handId: franja.hand.id,
            ordinal: franja.hand.ordinal,
            tasks: franja.tasks.map(({
              task, occurrenceId, shortStepCompleted, remainingMin, remainingRc, block, isMissed,
            }) => ({
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
              block,
              isMissed,
            })),
            pendingToday: franja.pendingToday,
            remainingEligible: franja.remainingEligible,
            swapsRemaining: franja.swapsRemaining,
            canSwap: franja.canSwap,
          });
        } else {
          setView({
            kind: "empty",
            dateLabel,
            pendingToday: franja.pendingToday,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("No se pudo preparar Runo", error);
        setView({
          kind: "error",
          message: t("home.errorMessage"),
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
      db?.close();
    };
  }, [refreshKey, locale, t]);

  const refreshView = useCallback((message: string | null) => {
    setNotice(message);
    setView({ kind: "loading" });
    setPendingStart(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const lastAutoRefresh = useRef(0);
  const autoRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoRefresh.current < 1000) return;
    lastAutoRefresh.current = now;
    refreshView(null);
  }, [refreshView]);

  const autoRefreshEnabled =
    !showEditor &&
    !showWallet &&
    !showSettings &&
    !showPending &&
    !quickFormOpen &&
    !showBreak &&
    pendingStart === null &&
    (view.kind === "ready" || view.kind === "empty");

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    let timer: number | undefined;

    const scheduleNextHour = () => {
      const now = Date.now();
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      timer = window.setTimeout(() => {
        autoRefresh();
        scheduleNextHour();
      }, Math.max(1000, next.getTime() - now + 250));
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") autoRefresh();
    };
    const refreshOnFocus = () => autoRefresh();

    scheduleNextHour();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [autoRefresh, autoRefreshEnabled]);

  const finishSession = useCallback((offerBreak = false, message?: string) => {
    const fromPending = view.kind === "session" && view.session.pendingId !== undefined;
    setQuickFormOpen(false);
    setShowBreak(offerBreak);
    if (fromPending) {
      setShowPending(true);
      setPendingMessage(message ?? (offerBreak ? t("common.done") : t("common.ready")));
    } else {
      setShowPending(false);
    }
    refreshView(message ?? (offerBreak ? t("common.done") : t("common.ready")));
  }, [refreshView, view, t]);

  const openAnchor = useCallback((task: Task, occurrence: Occurrence) => {
    setShowBreak(false);
    setShowPending(false);
    setQuickFormOpen(false);
    setNotice(null);
    setView({
      kind: "anchor",
      dateLabel: formatDate(Date.now(), intlLocales[locale]),
      task,
      occurrence,
    });
  }, [locale]);

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
        setView({ kind: "session", dateLabel: formatDate(now, intlLocales[locale]), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo iniciar el ancla", error);
      setNotice(t("errors.startAnchor"));
    } finally {
      setAnchorBusy(false);
    }
  }, [anchorBusy, locale, t]);

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
      setNotice(t("errors.markAnchor"));
    } finally {
      setAnchorBusy(false);
    }
  }, [anchorBusy, refreshView, t]);

  const anchorWatcherEnabled =
    !showEditor &&
    !showWallet &&
    !showSettings &&
    !showPending &&
    endDayReview === null &&
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
    setPendingComposerFocus((value) => focusComposer ? value + 1 : 0);
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
    if (endingDay || reviewBusyId !== null) return;
    setEndingDay(true);
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
      setEndDayReview(null);
      refreshView(null);
    } catch (error) {
      console.error("No se pudo cerrar el día", error);
      setEndDayReview(null);
      setNotice(t("errors.closeDay"));
    } finally {
      setEndingDay(false);
    }
  }, [endingDay, refreshView, reviewBusyId, t]);

  const openEndDayReview = useCallback(async () => {
    if (endingDay) return;
    setShowBreak(false);
    setQuickFormOpen(false);
    setNotice(null);
    try {
      const db = await openDatabase();
      let review: DayReview;
      try {
        const now = Date.now();
        const tasks = await listTasks(db);
        const occurrences = await db.occurrences
          .where("date").equals(toLocalDate(now)).toArray();
        review = buildDayReview({ tasks, occurrences, now });
      } finally {
        db.close();
      }
      if (review.missed.length === 0 && review.later.length === 0) {
        await endDay();
        return;
      }
      setEndDayReview(toReviewGroups(review));
    } catch (error) {
      console.error("No se pudo revisar el día", error);
      setNotice(t("errors.closeDay"));
    }
  }, [endDay, endingDay, t]);

  const correctReviewTask = useCallback(async (
    task: FranjaTask,
    kind: "already_done" | "not_applicable",
  ) => {
    if (reviewBusyId !== null) return;
    setReviewBusyId(task.occurrenceId);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        if (kind === "already_done") {
          await markOccurrenceAlreadyDoneDirect(db, task.occurrenceId, now, "review");
        } else {
          await markOccurrenceNotApplicableDirect(db, task.occurrenceId, now, "review");
        }
      } finally {
        db.close();
      }
      setEndDayReview((current) => current
        ? withoutReviewOccurrence(current, task.occurrenceId)
        : current);
      refreshView(null);
    } catch (error) {
      console.error("No se pudo corregir la tarea del cierre", error);
      setEndDayReview(null);
      setNotice(t("errors.correctTask"));
    } finally {
      setReviewBusyId(null);
    }
  }, [refreshView, reviewBusyId, t]);

  const startReviewTask = useCallback((task: FranjaTask) => {
    const handId = view.kind === "ready" &&
      view.tasks.some((item) => item.occurrenceId === task.occurrenceId)
      ? view.handId
      : null;
    setEndDayReview(null);
    setShowBreak(false);
    setQuickFormOpen(false);
    setPendingStart({ task, variant: "full", handId });
  }, [view]);

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
      refreshView(kind === "already_done" ? t("home.notices.alreadyDone") : t("home.notices.notToday"));
    } catch (error) {
      console.error("No se pudo corregir la tarea", error);
      setNotice(t("errors.correctTask"));
    } finally {
      correctBusy.current = false;
      setCorrectingId(null);
    }
  }, [refreshView, t]);

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
          refreshView(t("home.notices.swapped"));
        } else if (result.reason === "no_alternative") {
          setNotice(t("home.notices.noAlternative"));
        } else if (result.reason === "no_swaps") {
          setNotice(t("home.notices.noSwaps"));
        } else if (result.reason === "active_session") {
          setNotice(t("home.notices.active"));
        } else {
          setNotice(t("errors.swapTask"));
        }
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo cambiar la tarea", error);
      setNotice(t("errors.swapTask"));
    } finally {
      swapBusy.current = false;
      setSwapping(false);
    }
  }, [refreshView, view, t]);

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
        setView({ kind: "session", dateLabel: formatDate(now, intlLocales[locale]), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo iniciar la sesión rápida", error);
      setNotice(
        t("errors.startQuick"),
      );
    } finally {
      quickBusyRef.current = false;
      setQuickBusy(false);
    }
  }, [locale, t]);

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
        setView({ kind: "session", dateLabel: formatDate(now, intlLocales[locale]), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo empezar el pendiente", error);
      throw new Error(t("errors.startPending"));
    } finally {
      pendingBusyRef.current = false;
    }
  }, [locale, t]);

  const beginSession = useCallback(async (
    task: FranjaTask,
    variant: "full" | "short",
    handId: string | null,
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
          ...(handId ? { handId } : {}),
          allowMissed: task.isMissed,
        });
        setQuickFormOpen(false);
        setView({ kind: "session", dateLabel: formatDate(now, intlLocales[locale]), session });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo iniciar la tarea", error);
      setNotice(
        t("errors.startTask"),
      );
    } finally {
      setPendingStart(null);
    }
  }, [locale, t]);

  const screenKey = showPending
    ? "pending"
    : showEditor
      ? `editor:${editorTaskId ?? "list"}`
      : showWallet
        ? "wallet"
        : showSettings
          ? "settings"
          : pendingStart
            ? `countdown:${pendingStart.task.id}`
            : view.kind === "session"
              ? `session:${view.session.id}`
              : view.kind === "anchor"
                ? `anchor:${view.occurrence.id}`
                : view.kind;
  const showTodayGreeting =
    !showEditor &&
    !showWallet &&
    !showSettings &&
    !showPending &&
    pendingStart === null &&
    (view.kind === "ready" || view.kind === "empty" || view.kind === "closed");

  return (
    <MotionConfig reducedMotion="user">
    <Toast.Provider limit={2} timeout={4000}>
    <main className="min-h-screen bg-background text-foreground">
      <div
        className="runo-shell mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-10 sm:py-16"
        data-task-choices={
          (view.kind === "ready" && !showEditor && !showWallet && !showSettings && !showPending) || undefined
        }
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
              <span>Runo</span>
            </p>
            <h1 className={`runo-tagline mt-2 text-4xl font-semibold tracking-tight sm:text-5xl ${showEditor || showSettings || showWallet || showPending ? "hidden" : ""}`}>
              {t("header.tagline")}
            </h1>
          </div>
          <div className="runo-header-controls flex flex-wrap items-center justify-end gap-3 pb-1">
            {showTodayGreeting ? <AccountGreeting /> : null}
            {!showEditor && !showWallet && !showSettings && !showPending && view.kind !== "session" && view.kind !== "anchor" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPendings(true)}
                  disabled={pendingStart !== null}
                  className="min-h-11 whitespace-nowrap border border-control px-3 text-sm font-semibold disabled:opacity-60"
                  aria-label={t("nav.addPendingAria")}
                >
                  {t("nav.addPending")}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFormOpen((value) => !value)}
                  disabled={quickBusy || pendingStart !== null}
                  aria-expanded={quickFormOpen}
                  aria-controls="quick-task-panel"
                  className="min-h-11 whitespace-nowrap border border-control px-3 text-sm font-semibold disabled:opacity-60"
                >
                  {t("nav.quickTask")}
                </button>
              </div>
            ) : null}
            {view.kind !== "loading" && view.kind !== "error" ? (
              <p className="text-sm text-muted">{view.dateLabel}</p>
            ) : null}
          </div>
        </header>

        <div className="runo-content flex flex-1 flex-col justify-center py-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screenKey}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: "easeOut" }}
            >
          {showPending ? (
            <PendingView
              focusComposer={pendingComposerFocus}
              message={pendingMessage}
              onStart={beginPendingSession}
              onCountChange={setPendingCount}
            />
          ) : null}
          {showEditor ? <TaskEditor initialTaskId={editorTaskId} /> : null}
          {showSettings ? (
            <SettingsView
              tone={voice.tone ?? 0}
              voiceReady={voice.ready}
              onTone={voice.setTone}
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
                  {t("quick.eyebrow")}
                </p>
                <HelpTip label={t("quick.helpLabel")}>{t("quick.help")}</HelpTip>
              </div>
              <h2 id="quick-task-title" className="mt-2 text-xl font-semibold tracking-tight">
                {t("quick.title")}
              </h2>
              <QuickTaskForm
                busy={quickBusy}
                autoFocus
                onStart={beginQuickSession}
                onCancel={() => setQuickFormOpen(false)}
              />
            </section>
          ) : null}
          <AnimatePresence initial={false}>
            {!showEditor && !showWallet && !showSettings && !showPending && notice ? (
              <motion.p
                key={notice}
                role="alert"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.15 }}
                className="mb-4 border-l-2 border-line pl-4 text-sm leading-6"
              >
                {notice}
              </motion.p>
            ) : null}
          </AnimatePresence>

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
                  onEndDay={() => void openEndDayReview()}
                  swapping={swapping}
                  correctingId={correctingId}
                  tone={voice.tone ?? 0}
                />
              ) : null}
              {view.kind === "empty" ? (
                <EmptyState onEndDay={() => void openEndDayReview()} />
              ) : null}
              {view.kind === "closed" ? <DayClosed view={view} /> : null}
            </>
          ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div aria-hidden className="runo-dock-scrim" />
        <nav className="runo-dock" aria-label={t("common.mainNav")}>
          <button
            type="button"
            onClick={() => {
              if (showEditor || showWallet || showSettings || showPending) closeSecondary();
            }}
            disabled={pendingStart !== null}
            aria-current={!showEditor && !showWallet && !showSettings && !showPending ? "page" : undefined}
          >
            {!showEditor && !showWallet && !showSettings && !showPending ? <DockIndicator /> : null}
            {t("nav.today")}
          </button>
          <button
            type="button"
            onClick={openEditor}
            disabled={pendingStart !== null}
            aria-current={showEditor ? "page" : undefined}
          >
            {showEditor ? <DockIndicator /> : null}
            {t("nav.tasks")}
          </button>
          <button
            type="button"
            onClick={() => openPendings(false)}
            disabled={pendingStart !== null}
            aria-current={showPending ? "page" : undefined}
            aria-label={pendingCount === null || pendingCount === 0
              ? t("nav.pending")
              : t("nav.pendingNavAria", { count: pendingCount })}
          >
            {showPending ? <DockIndicator /> : null}
            <span className="dock-label-full">{t("nav.pending")}</span>
            <span className="dock-label-short" aria-hidden>{t("nav.pendingShort")}</span>
            <PendingBadge label={pendingLabel} />
          </button>
          <button
            type="button"
            onClick={openSettings}
            disabled={pendingStart !== null}
            aria-current={showSettings ? "page" : undefined}
          >
            {showSettings ? <DockIndicator /> : null}
            {t("nav.settings")}
          </button>
        </nav>
      </div>
    </main>
    {endDayReview ? (
      <EndDayReview
        open
        onOpenChange={(open) => {
          if (!open) setEndDayReview(null);
        }}
        review={endDayReview}
        tone={voice.tone ?? 0}
        busyId={reviewBusyId}
        ending={endingDay}
        onStart={startReviewTask}
        onAlreadyDone={(task) => void correctReviewTask(task, "already_done")}
        onNotApplicable={(task) => void correctReviewTask(task, "not_applicable")}
        onEndDay={() => void endDay()}
      />
    ) : null}
    <RunoToaster />
    </Toast.Provider>
    </MotionConfig>
  );
}

function DockIndicator() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className="runo-dock-active"
      layoutId={reduceMotion ? undefined : "runo-dock-active"}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.6 }}
    />
  );
}

/**
 * Count of open pending items. It pops when the number changes and stays hidden
 * at zero, so the dock never nags with an empty badge.
 */
function PendingBadge({ label }: { label: string | null }) {
  const reduceMotion = useReducedMotion() ?? false;
  return label ? (
    <motion.span
      key={label}
      aria-hidden
      className="dock-badge"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.45 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduceMotion
        ? { duration: 0.12 }
        : { type: "spring", stiffness: 560, damping: 24, mass: 0.45 }}
    >
      {label}
    </motion.span>
  ) : null;
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
  handId: string | null;
  onDone: (task: FranjaTask, variant: "full" | "short", handId: string | null) => void | Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("countdown");
  const common = useTranslations("common");
  const reduceMotion = useReducedMotion();
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
        {variant === "short" ? t("firstStep") : t("starting")}
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight">{title}</h2>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={count}
          className="mt-6 text-8xl font-semibold tabular-nums text-foreground"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.55 }}
        >
          {count === 0 ? "…" : count}
        </motion.p>
      </AnimatePresence>
      <p className="mt-4 text-sm leading-6 text-muted">
        {t("cancelHelp", { duration })}
      </p>
      {count > 0 ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 min-h-11 rounded-none border border-control px-6 text-sm font-semibold"
        >
          {common("cancel")}
        </button>
      ) : null}
    </section>
  );
}

function LoadingState() {
  const t = useTranslations("home");
  return (
    <div className="space-y-3" role="status">
      <p className="text-sm text-muted">{t("loading")}</p>
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
  const t = useTranslations("home");
  const common = useTranslations("common");
  return (
    <section className="border-y border-line py-6" role="alert">
      <h2 className="text-xl font-semibold">{t("errorTitle")}</h2>
      <p className="mt-2 text-base leading-7 text-muted">{message}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{t("errorHelp")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 text-sm font-semibold underline underline-offset-4"
      >
        {common("retry")}
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
  onEndDay,
  swapping,
  correctingId,
  tone,
}: {
  view: Extract<View, { kind: "ready" }>;
  onStart: (task: FranjaTask, variant: "full" | "short") => void;
  onOffer: (handId: string, task: FranjaTask) => void | Promise<void>;
  onSwap: (task: FranjaTask) => void | Promise<void>;
  onAlreadyDone: (task: FranjaTask) => void;
  onNotApplicable: (task: FranjaTask) => void;
  onEdit: (task: FranjaTask) => void;
  onEndDay: () => void;
  swapping: boolean;
  correctingId: string | null;
  tone: VoiceTone;
}) {
  const t = useTranslations("franja");
  const common = useTranslations("common");
  const blocks = useTranslations("common.blocks");
  const messages = useMessages();
  const voicePhrases = useMemo(() => voicePhrasesFromMessages(messages), [messages]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [peekOffset, setPeekOffset] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [correction, setCorrection] = useState<{
    kind: "already_done" | "not_applicable";
    task: FranjaTask;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const focusStart = useRef(false);
  const tasks = view.tasks;
  const primarySlot = tasks.length ? primaryIndex % tasks.length : 0;
  const primary = tasks[primarySlot];
  const alternativesCount = Math.max(0, tasks.length - 1);
  const normalizedPeekOffset = alternativesCount ? peekOffset % alternativesCount : 0;
  const secondaryIndex = tasks.length > 1
    ? (primarySlot + 1 + normalizedPeekOffset) % tasks.length
    : -1;
  const secondary = secondaryIndex >= 0 ? tasks[secondaryIndex] : undefined;
  const busy = swapping || correctingId !== null;
  const encouragement = correction?.kind === "not_applicable"
    ? chooseVoicePhrase(
        tone,
        "work",
        `${correction.task.occurrenceId}:not-today`,
        voicePhrases,
      )
    : null;

  useEffect(() => {
    if (!primary) return;
    void onOffer(view.handId, primary);
    if (secondary) void onOffer(view.handId, secondary);
  }, [onOffer, primary, secondary, view.handId]);

  useEffect(() => {
    if (!focusStart.current) return;
    focusStart.current = false;
    startButtonRef.current?.focus();
  }, [primary]);

  if (!primary) return null;

  const remaining = primary.remainingMin;
  const primaryLabel = primary.shortStepDone
    ? t("continue", { remaining })
    : t("start");

  function promoteSecondary() {
    if (!secondary || busy) return;
    focusStart.current = true;
    setPrimaryIndex(secondaryIndex);
    setPeekOffset(0);
    setMenuOpen(false);
  }

  return (
    <>
      <p className="first-prompt">{t("prompt")}</p>
      <div className="peek-layout">
      <AnimatePresence mode="popLayout">
        <motion.section
          key={primary.id}
          layout
          className="first-experience peek-front"
          aria-labelledby="first-title"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.7 }}
        >
        <p className="first-eyebrow">{t("eyebrow")}</p>
        <h2 id="first-title" className="first-title">{primary.title}</h2>
        <p id="first-duration" className="first-duration">
          {common("minutes", { count: remaining })}
          {primary.isMissed ? (
            <>
              <span className="first-block">· {blocks(primary.block)}</span>
              <MissedBadge className="first-missed" />
            </>
          ) : null}
        </p>

        <div className="first-actions">
          <motion.button
            ref={startButtonRef}
            type="button"
            className="bg-foreground px-6 text-base font-semibold text-background disabled:opacity-60"
            disabled={busy}
            aria-labelledby="first-start-label first-title first-duration"
            onClick={() => onStart(primary, "full")}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.12 }}
          >
            <span id="first-start-label">{primaryLabel}</span> <span aria-hidden className="first-start-icon">▶️</span>
          </motion.button>
          {tasks.length > 2 ? (
            <button
              type="button"
              className="first-secondary"
              disabled={busy}
              onClick={() => setPeekOffset((value) => value + 1)}
            >
              {t("showAnother")}
            </button>
          ) : null}
          <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Menu.Trigger
              type="button"
              className="first-more"
              disabled={busy}
              aria-label={common("moreOptions")}
            >
              ⋯
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner
                className="first-menu-positioner"
                sideOffset={8}
                align="end"
              >
                <Menu.Popup className="first-menu">
                  {primary.shortStepMin && !primary.shortStepDone ? (
                    <Menu.Item
                      className="first-menu-item"
                      disabled={busy}
                      onClick={() => onStart(primary, "short")}
                    >
                      {t("shortStep", { minutes: primary.shortStepMin })}
                    </Menu.Item>
                  ) : null}
                  {view.canSwap ? (
                    <Menu.Item
                      className="first-menu-item"
                      disabled={busy}
                      onClick={() => void onSwap(primary)}
                    >
                      {t("swap")}
                    </Menu.Item>
                  ) : null}
                  <Menu.Item
                    className="first-menu-item"
                    disabled={busy}
                    onClick={() => {
                      setCorrection({ kind: "already_done", task: primary });
                      setConfirmOpen(true);
                    }}
                  >
                    {t("alreadyDone")}
                  </Menu.Item>
                  <Menu.Item
                    className="first-menu-item"
                    disabled={busy}
                    onClick={() => {
                      setCorrection({ kind: "not_applicable", task: primary });
                      setConfirmOpen(true);
                    }}
                  >
                    {t("notToday")}
                  </Menu.Item>
                  <Menu.Item
                    className="first-menu-item"
                    disabled={busy}
                    onClick={() => onEdit(primary)}
                  >
                    {t("edit")}
                  </Menu.Item>
                  <Menu.Item
                    className="first-menu-item"
                    disabled={busy}
                    onClick={() => {
                      setMenuOpen(false);
                      onEndDay();
                    }}
                  >
                    {t("endDay")}
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
        </motion.section>
      </AnimatePresence>

      <AnimatePresence mode="popLayout" initial={false}>
        {secondary ? (
        <motion.button
          type="button"
          key={secondary.id}
          layout
          className="peek-back"
          onClick={promoteSecondary}
          disabled={busy}
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          aria-labelledby="peek-back-action peek-back-title peek-back-duration"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.7 }}
        >
          <span className="peek-back-top">
            <span className="peek-back-label">{t("otherOption")}</span>
            <span id="peek-back-action" className="peek-back-action">{t("chooseTask")}</span>
          </span>
          <span id="peek-back-title" className="peek-back-title">{secondary.title}</span>
          <span id="peek-back-duration" className="peek-back-duration">
            {common("minutes", { count: secondary.remainingMin })}
            {secondary.isMissed ? (
              <>
                <span className="peek-block">· {blocks(secondary.block)}</span>
                <MissedBadge className="peek-missed" />
              </>
            ) : null}
          </span>
        </motion.button>
        ) : null}
      </AnimatePresence>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={correction?.kind === "already_done"
          ? t("confirm.alreadyDoneTitle")
          : t("confirm.notTodayTitle", { title: correction?.task.title ?? "" })}
        description={correction?.kind === "already_done"
          ? t("confirm.alreadyDoneCopy")
          : t("confirm.notTodayCopy")}
        note={encouragement}
        confirmLabel={correction?.kind === "already_done"
          ? t("confirm.alreadyDoneConfirm")
          : t("confirm.notTodayConfirm")}
        onConfirm={() => {
          if (!correction) return;
          if (correction.kind === "already_done") onAlreadyDone(correction.task);
          else onNotApplicable(correction.task);
        }}
      />
    </>
  );
}

function EmptyState({ onEndDay }: { onEndDay: () => void }) {
  const t = useTranslations("home");
  return (
    <section className="border-t border-line pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {t("emptyEyebrow")}
      </p>
      <div className="mt-3 flex items-start gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("emptyTitle")}
        </h2>
        <HelpTip label={t("emptyHelpLabel")}>{t("emptyHelp")}</HelpTip>
      </div>
      <button
        type="button"
        onClick={onEndDay}
        className="mt-6 min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline"
      >
        {t("endDay")}
      </button>
    </section>
  );
}

function DayClosed({ view }: { view: Extract<View, { kind: "closed" }> }) {
  const t = useTranslations("home");
  return (
    <section
      aria-label={t("closedAria", { date: view.dateLabel })}
      className="border-y border-line py-8 sm:py-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {t("closedEyebrow")}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("closedTitle")}
      </h2>
      <p className="mt-3 text-base leading-7 text-muted">
        {t("closedCopy")}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{t("closedTomorrow")}</p>
    </section>
  );
}
