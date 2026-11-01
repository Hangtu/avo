"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
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
  const t = useTranslations("anchor");
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className="border-y border-line py-8 sm:py-10"
      aria-labelledby="anchor-title"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: "easeOut" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {t("eyebrow", { time: task.fixedTime ?? "" })}
      </p>
      <div className="mt-2 flex items-start gap-2">
        <h2 id="anchor-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {task.title}
        </h2>
        <HelpTip label={t("helpLabel")}>{t("help")}</HelpTip>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        {t("duration", { minutes: task.durationMin })}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="min-h-11 bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy ? t("starting") : t("start")}
        </button>
        <button
          type="button"
          onClick={onLeave}
          disabled={busy}
          className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
        >
          {t("later")}
        </button>
        <button
          type="button"
          onClick={onNotApplicable}
          disabled={busy}
          className="min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:underline disabled:opacity-60"
        >
          {t("notToday")}
        </button>
      </div>
    </motion.section>
  );
}
