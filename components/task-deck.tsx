"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useTranslations } from "next-intl";
import {
  DECK_TURN_DURATION,
  deckContentOpacity,
  deckLayer,
  deckPreviewOpacity,
  deckTransform,
  promoteDeckSelection,
  resolveDeckSelection,
  type DeckRole,
  type DeckSelection,
} from "@/lib/ui/task-deck";
import type { FranjaTask } from "./franja-task";
import { MissedBadge } from "./missed-badge";

interface DeckActions {
  active: boolean;
  disabled: boolean;
  startButtonRef: RefObject<HTMLButtonElement | null>;
  ids: { title: string; duration: string; start: string };
}

interface TaskDeckProps {
  tasks: FranjaTask[];
  handId: string;
  busy: boolean;
  onOffer: (handId: string, task: FranjaTask) => void | Promise<void>;
  onPromote: () => void;
  renderActions: (task: FranjaTask, actions: DeckActions) => ReactNode;
}

export function TaskDeck({ tasks, handId, busy, onOffer, onPromote, renderActions }: TaskDeckProps) {
  const [selection, setSelection] = useState<DeckSelection>(() =>
    resolveDeckSelection(
      tasks.map((task) => task.id),
      { primaryId: null, secondaryId: null },
    ),
  );
  const [turn, setTurn] = useState<DeckSelection | null>(null);
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const turnLock = useRef(false);
  const reduceMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const reveal = useMotionValue(108);
  const current =
    turn ??
    resolveDeckSelection(
      tasks.map((task) => task.id),
      selection,
    );
  const primary = tasks.find((task) => task.id === current.primaryId);
  const secondary = tasks.find((task) => task.id === current.secondaryId);
  const orderedTasks = [
    ...(primary ? [primary] : []),
    ...(secondary ? [secondary] : []),
    ...tasks.filter((task) => task !== primary && task !== secondary),
  ];
  const turning = turn !== null;

  useEffect(() => {
    if (primary) void onOffer(handId, primary);
    if (secondary) void onOffer(handId, secondary);
  }, [handId, onOffer, primary, secondary]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll<HTMLElement>(".peek-card"));
    const previews = Array.from(stage.querySelectorAll<HTMLElement>(".peek-back"));
    function measure() {
      if (!stage) return;
      const nextWidth = stage.clientWidth;
      const nextHeight = cards[0]?.offsetHeight ?? 0;
      const nextReveal =
        tasks.length > 1 ? Math.max(0, ...previews.map((preview) => preview.offsetHeight)) : 0;
      width.set(nextWidth);
      height.set(nextHeight);
      reveal.set(nextReveal);
      stage.style.setProperty("--peek-reveal", `${nextReveal}px`);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    for (const element of [...cards, ...previews]) observer.observe(element);
    return () => observer.disconnect();
  }, [tasks.length, width, height, reveal]);

  useEffect(() => {
    if (!turn) return;
    const controls = animate(progress, 1, {
      duration: reduceMotion ? 0 : DECK_TURN_DURATION,
      ease: "linear",
      onComplete: () => {
        setSelection(promoteDeckSelection(turn));
        setTurn(null);
        turnLock.current = false;
      },
    });
    return () => controls.stop();
  }, [turn, progress, reduceMotion]);

  function promoteSecondary() {
    if (!secondary || busy || turnLock.current) return;
    turnLock.current = true;
    setFocusTargetId(secondary.id);
    onPromote();
    if (reduceMotion) {
      setSelection(promoteDeckSelection(current));
      turnLock.current = false;
      return;
    }
    progress.set(0);
    setTurn(current);
  }

  return (
    <div
      ref={stageRef}
      className="peek-layout"
      data-has-alternative={Boolean(secondary)}
      data-turning={turning || undefined}
      aria-busy={busy || turning}
    >
      {orderedTasks.map((task) => (
        <DeckCard
          key={task.occurrenceId}
          task={task}
          role={task.id === current.primaryId ? "front" : task.id === current.secondaryId ? "back" : "hidden"}
          turning={turning}
          busy={busy}
          progress={progress}
          width={width}
          height={height}
          reveal={reveal}
          focusOnSelect={focusTargetId === task.id}
          onChoose={promoteSecondary}
          renderActions={renderActions}
        />
      ))}
    </div>
  );
}

function DeckCard({
  task,
  role,
  turning,
  busy,
  progress,
  width,
  height,
  reveal,
  focusOnSelect,
  onChoose,
  renderActions,
}: {
  task: FranjaTask;
  role: DeckRole;
  turning: boolean;
  busy: boolean;
  progress: MotionValue<number>;
  width: MotionValue<number>;
  height: MotionValue<number>;
  reveal: MotionValue<number>;
  focusOnSelect: boolean;
  onChoose: () => void;
  renderActions: TaskDeckProps["renderActions"];
}) {
  const t = useTranslations("franja");
  const common = useTranslations("common");
  const blocks = useTranslations("common.blocks");
  const id = useId();
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const ids = { title: `${id}-title`, duration: `${id}-duration`, start: `${id}-start` };
  const active = role === "front";
  const isBack = role === "back";
  const transform = useTransform(() =>
    deckTransform(role, turning ? progress.get() : 0, width.get(), height.get(), reveal.get()),
  );
  const zIndex = useTransform(() => deckLayer(role, turning ? progress.get() : 0));
  const fullOpacity = useTransform(() => deckContentOpacity(role, turning ? progress.get() : 0));
  const previewOpacity = useTransform(() => deckPreviewOpacity(role, turning ? progress.get() : 0));

  useEffect(() => {
    if (active && !turning && focusOnSelect) {
      startButtonRef.current?.focus({ preventScroll: true });
    }
  }, [active, turning, focusOnSelect]);

  return (
    <motion.section
      className="peek-card"
      data-task-id={task.id}
      data-deck-role={role}
      aria-labelledby={active ? ids.title : `${id}-peek-title`}
      aria-hidden={role === "hidden" || undefined}
      inert={role === "hidden"}
      style={{ transform, zIndex, willChange: turning ? "transform" : undefined }}
    >
      <motion.div
        className="first-experience peek-front"
        aria-hidden={!active || undefined}
        inert={!active || turning}
        style={{ opacity: fullOpacity }}
      >
        <p className="first-eyebrow">
          {task.routine
            ? t("routineProgress", {
                name: task.routine.title,
                step: task.routine.step,
                total: task.routine.total,
              })
            : t("eyebrow")}
        </p>
        <h2 id={ids.title} className="first-title">
          {task.title}
        </h2>
        <p id={ids.duration} className="first-duration">
          {common("minutes", { count: task.remainingMin })}
          {task.isMissed ? (
            <>
              <span className="first-block">· {blocks(task.block)}</span>
              <MissedBadge className="first-missed" />
            </>
          ) : null}
        </p>
        <div className="first-actions">
          {renderActions(task, {
            active,
            disabled: busy || turning || !active,
            startButtonRef,
            ids,
          })}
        </div>
      </motion.div>
      <motion.button
        type="button"
        className="peek-back"
        onClick={onChoose}
        disabled={busy || turning || !isBack}
        tabIndex={isBack ? 0 : -1}
        aria-hidden={!isBack || undefined}
        style={{ opacity: previewOpacity }}
      >
        <span className="peek-back-top">
          <span id={`${id}-peek-label`} className="peek-back-label">
            {t("otherOption")}
          </span>
          <span id={`${id}-peek-action`} className="peek-back-action">
            {t("chooseTask")}
          </span>
        </span>
        <span id={`${id}-peek-title`} className="peek-back-title">
          {task.title}
        </span>
        {task.routine ? (
          <span id={`${id}-peek-routine`} className="peek-back-label">
            {t("routineProgress", {
              name: task.routine.title,
              step: task.routine.step,
              total: task.routine.total,
            })}
          </span>
        ) : null}
        <span id={`${id}-peek-duration`} className="peek-back-duration">
          {common("minutes", { count: task.remainingMin })}
          {task.isMissed ? (
            <>
              <span className="peek-block">· {blocks(task.block)}</span>
              <MissedBadge className="peek-missed" />
            </>
          ) : null}
        </span>
      </motion.button>
    </motion.section>
  );
}
