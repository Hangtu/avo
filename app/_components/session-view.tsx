"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { openDatabase } from "@/lib/db/database";
import {
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
import { chooseVoicePhrase, type VoiceTone } from "@/lib/domain/voice";
import { intlLocales } from "@/lib/i18n/config";
import { voicePhrasesFromMessages } from "@/lib/i18n/voice";
import { HelpTip } from "./help-tip";
import { pulse } from "@/lib/platform/haptics";
import { useSessionAudio } from "./use-session-audio";
import { useWakeLock } from "./use-wake-lock";

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatEndTime(startedAt: number, remainingSec: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
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
  tone,
}: {
  session: Session;
  onFinished: (offerBreak?: boolean, message?: string) => void;
  tone: VoiceTone;
}) {
  const t = useTranslations("session");
  const common = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const locale = useLocale();
  const messages = useMessages();
  const voicePhrases = useMemo(() => voicePhrasesFromMessages(messages), [messages]);
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
  const [pushCount, setPushCount] = useState(0);
  const [noPhrase, setNoPhrase] = useState<string | null>(null);
  const busyRef = useRef(false);
  const isShort = current.variant === "short";
  const isQuick = current.quick === true;
  const isPending = current.pendingId !== undefined;
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
  const phrase = chooseVoicePhrase(
    tone, "work", `${current.id}:${current.startedAt ?? current.updatedAt}`, voicePhrases,
  );

  useWakeLock(current.status === "running");
  const { ringBell } = useSessionAudio(current.status === "running");

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
        pulse("timer");
        ringBell();
      } finally {
        db.close();
      }
    } catch (cause) {
      console.error("No se pudo cerrar el timer", cause);
      setExpiryError(t("expiryError"));
    }
  }, [current.id, ringBell, t]);

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
      setActionError(t("actionError"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [t]);

  function askNo() {
    setRetryId(newActionId());
    setNoPhrase(
      tone > 0
        ? chooseVoicePhrase(2, "push", `${current.id}:no:${pushCount}`, voicePhrases)
        : null,
    );
    setPushCount((count) => count + 1);
    setShowNoOptions(true);
  }

  async function complete() {
    await runAction(async () => {
      const db = await openDatabase();
      try {
        const result = await completeSessionWithCredit(db, current.id, Date.now());
        const closing = chooseVoicePhrase(
          tone, "close", `${current.id}:${current.startedAt ?? current.updatedAt}`, voicePhrases,
        );
        const credit = isPending
          ? t("pendingDone")
          : isQuick
            ? t("quickDone")
            : result.creditedRc > 0
              ? t("credit", { minutes: result.creditedRc })
              : t("noCredit");
        onFinished(!isQuick && !isShort, [credit, closing].filter(Boolean).join(" "));
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
        onFinished(false, isPending ? t("pendingStays") : undefined);
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

  return (
    <motion.section
      className="border-y border-line py-8 sm:py-10"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.25, ease: "easeOut" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {current.status === "running"
          ? isShort ? t("status.firstStep") : t("status.now")
          : current.status === "awaiting_confirmation"
            ? t("status.timeUp")
            : current.status === "paused"
              ? isShort ? t("status.stepPaused") : t("status.paused")
              : t("status.finished")}
      </p>
      <div className="mt-3 flex items-start gap-2">
        <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
          {displayTitle}
        </h2>
        {current.status === "running" || current.status === "paused" ? (
          <HelpTip label={t("helpLabel")}>
            {current.status === "paused"
              ? t("pausedHelp")
              : t("runningHelp")}
          </HelpTip>
        ) : null}
      </div>
      {phrase ? <p className="mt-2 text-sm leading-6 text-muted">{phrase}</p> : null}
      {isPending ? (
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {t("label.pending")}
        </p>
      ) : isQuick ? (
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {t("label.quick")}
        </p>
      ) : null}
      {!isQuick && !isPending && !isTodaySession ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          {t("previousDay")}
        </p>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {current.status === "running" ? (
          <motion.div
            key="running"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.16, ease: "easeOut" }}
          >
            <p
              role="timer"
              aria-label={t("timerAria")}
              className="mt-8 break-words text-center text-[clamp(2.25rem,20vw,4.5rem)] font-semibold tracking-tight tabular-nums"
            >
              {formatRemaining(remainingMs)}
            </p>
            <p className="mt-4 text-center text-sm text-muted">
              {t("endsAt", { time: formatEndTime(current.startedAt, current.remainingSecAtStart, intlLocales[locale]) })}
            </p>
            <Vigia progress={progress} isShort={isShort} />
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <motion.button
                type="button"
                onClick={() => void complete()}
                disabled={busy}
                className="min-h-12 rounded-none bg-foreground px-7 text-base font-semibold text-background disabled:opacity-60"
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                {busy ? common("saving") : isShort ? t("finishStep") : t("finish")}
              </motion.button>
              <button
                type="button"
                onClick={() => void pauseNow()}
                disabled={busy}
                className="min-h-12 rounded-none border border-control px-6 text-sm font-semibold disabled:opacity-60"
              >
                {t("pause")}
              </button>
              <button
                type="button"
                onClick={() => void pauseNow("baby")}
                disabled={busy}
                className="min-h-12 rounded-none border border-control px-6 text-sm font-semibold disabled:opacity-60"
              >
                {t("baby")}
              </button>
            </div>
          </motion.div>
        ) : null}

        {current.status === "awaiting_confirmation" ? (
          <motion.div
            key="awaiting"
            className="mt-6 space-y-4"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.16, ease: "easeOut" }}
          >
            <p role="status" className="text-base leading-7 text-muted">
              {isPending
                ? t("timeUpPending")
                : isQuick
                  ? t("timeUpQuick")
                  : isShort
                    ? t("timeUpStep")
                    : t("timeUpTask")}
            </p>
            <Vigia progress={progress} isShort={isShort} />
            {!showNoOptions ? (
              <>
                <p className="text-lg font-semibold">
                  {isShort ? t("didStep") : t("didTask")}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <motion.button
                    type="button"
                    onClick={() => void complete()}
                    disabled={busy}
                    className="min-h-12 flex-1 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                  >
                    {busy ? common("saving") : isShort ? t("yesStep") : t("yesTask")}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => void retry()}
                    disabled={busy}
                    className="min-h-12 flex-1 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
                  >
                    {busy ? common("saving") : t("more")}
                  </button>
                  <button
                    type="button"
                    onClick={askNo}
                    disabled={busy}
                    className="min-h-12 flex-1 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
                  >
                    {isShort ? t("noStep") : t("noTask")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">
                  {isShort
                    ? t("whatStep")
                    : isPending ? t("whatPending") : t("whatTask")}
                </p>
                {noPhrase ? (
                  <p className="border-l-2 border-accent pl-4 text-base leading-7">
                    {noPhrase}
                  </p>
                ) : null}
                <p className="text-sm leading-6 text-muted">
                  {isPending
                    ? t("retryHelpPending")
                    : t("retryHelp")}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void retry()}
                    disabled={busy}
                    className="min-h-12 flex-1 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                  >
                    {busy ? common("saving") : t("more")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void notApplicable()}
                    disabled={busy}
                    className="min-h-12 flex-1 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
                  >
                    {isPending ? t("later") : t("notToday")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNoOptions(false)}
                  disabled={busy}
                  className="min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline disabled:opacity-60"
                >
                  {t("back")}
                </button>
              </>
            )}
          </motion.div>
        ) : null}

        {current.status === "paused" ? (
          <motion.div
            key="paused"
            className="mt-6 space-y-4"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.16, ease: "easeOut" }}
          >
            <p className="text-base leading-7 text-muted">
              {t("pausedTime", { time: formatRemaining(current.remainingSecAtStart * 1000) })}
            </p>
            <Vigia progress={progress} isShort={isShort} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <motion.button
                type="button"
                onClick={() => void resumeNow()}
                disabled={busy}
                className="min-h-12 flex-1 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                {busy ? common("saving") : t("continue")}
              </motion.button>
              <button
                type="button"
                onClick={() => void notApplicable()}
                disabled={busy}
                className="min-h-12 flex-1 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
              >
                {isPending ? t("later") : t("notToday")}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
            {common("retry")}
          </button>
        </div>
      ) : null}
    </motion.section>
  );
}


function Vigia({ progress, isShort }: { progress: number; isShort: boolean }) {
  const t = useTranslations("session");
  return (
    <div className="mt-5">
      <div
        role="progressbar"
        aria-label={isShort ? t("progressStepAria") : t("progressTaskAria")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={t("progressText", { progress })}
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
