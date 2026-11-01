"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { HelpTip } from "./help-tip";

const BREAK_MS = 10 * 60 * 1000;

type Phase = "offer" | "running" | "done";

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function BreakCard({ onClose }: { onClose: () => void }) {
  const t = useTranslations("break");
  const reduceMotion = useReducedMotion();
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
    <motion.section
      aria-label={t("aria")}
      className="mb-5 border-y border-line py-5"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {t("eyebrow")}
        </p>
        <HelpTip label={t("helpLabel")}>{t("help")}</HelpTip>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === "offer" ? (
          <motion.div
            key="offer"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.16, ease: "easeOut" }}
          >
            <h2 className="mt-2 text-xl font-semibold">{t("offer")}</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <motion.button
                type="button"
                onClick={start}
                className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background"
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                {t("start")}
              </motion.button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-none border border-control px-5 text-sm font-semibold"
              >
                {t("now")}
              </button>
            </div>
          </motion.div>
        ) : null}

        {phase === "running" ? (
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
              className="mt-3 break-words text-[clamp(2.25rem,18vw,3rem)] font-semibold tabular-nums text-foreground"
            >
              {formatRemaining(remainingMs)}
            </p>
            <motion.button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-11 rounded-none border border-control px-5 text-sm font-semibold"
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.12 }}
            >
              {t("finish")}
            </motion.button>
          </motion.div>
        ) : null}

        {phase === "done" ? (
          <motion.div
            key="done"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.16, ease: "easeOut" }}
          >
            <h2 className="mt-2 text-xl font-semibold">{t("doneTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{t("doneCopy")}</p>
            <motion.button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background"
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.12 }}
            >
              {t("doneContinue")}
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
