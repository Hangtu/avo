"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useMessages, useTranslations } from "next-intl";
import { chooseVoicePhrase, type VoiceTone } from "@/lib/domain/voice";
import { voicePhrasesFromMessages } from "@/lib/i18n/voice";
import { ConfirmDialog } from "./confirm-dialog";
import type { FranjaTask } from "./franja-task";

export interface ReviewTask {
  task: FranjaTask;
  /** Missed tasks can start late; a later window still cannot start early. */
  canStart: boolean;
}

export interface ReviewGroups {
  missed: ReviewTask[];
  later: ReviewTask[];
}

function ReviewRow({
  item,
  busy,
  disabled,
  onStart,
  onCorrect,
}: {
  item: ReviewTask;
  busy: boolean;
  disabled: boolean;
  onStart: (task: FranjaTask) => void;
  onCorrect: (
    task: FranjaTask,
    kind: "already_done" | "not_applicable",
  ) => void;
}) {
  const t = useTranslations("home.review");
  const blocks = useTranslations("common.blocks");
  const common = useTranslations("common");
  const blocked = busy || disabled;

  return (
    <div className="runo-review-item" role="listitem">
      <div className="runo-review-copy">
        <p className="runo-review-title">{item.task.title}</p>
        <p className="runo-review-meta">
          <span>{blocks(item.task.block)}</span>
          <span>{common("minutes", { count: item.task.remainingMin })}</span>
        </p>
      </div>
      <div className="runo-review-actions">
        {item.canStart ? (
          <button
            type="button"
            className="runo-review-action runo-review-action-primary"
            disabled={blocked}
            onClick={() => onStart(item.task)}
          >
            {t("start")}
          </button>
        ) : null}
        <button
          type="button"
          className="runo-review-action"
          disabled={blocked}
          onClick={() => onCorrect(item.task, "already_done")}
        >
          {t("alreadyDone")}
        </button>
        <button
          type="button"
          className="runo-review-action"
          disabled={blocked}
          onClick={() => onCorrect(item.task, "not_applicable")}
        >
          {t("notToday")}
        </button>
      </div>
    </div>
  );
}

export function EndDayReview({
  open,
  onOpenChange,
  review,
  tone,
  busyId,
  ending,
  onStart,
  onAlreadyDone,
  onNotApplicable,
  onEndDay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewGroups;
  tone: VoiceTone;
  busyId: string | null;
  ending: boolean;
  onStart: (task: FranjaTask) => void;
  onAlreadyDone: (task: FranjaTask) => void;
  onNotApplicable: (task: FranjaTask) => void;
  onEndDay: () => void;
}) {
  const t = useTranslations("home.review");
  const confirm = useTranslations("franja.confirm");
  const messages = useMessages();
  const voicePhrases = useMemo(() => voicePhrasesFromMessages(messages), [messages]);
  const [correction, setCorrection] = useState<{
    kind: "already_done" | "not_applicable";
    task: FranjaTask;
  } | null>(null);
  const count = review.missed.length + review.later.length;
  const note = correction?.kind === "not_applicable"
    ? chooseVoicePhrase(
        tone,
        "work",
        `${correction.task.occurrenceId}:review-not-today`,
        voicePhrases,
      )
    : null;

  function handleOpenChange(next: boolean) {
    if (!next) setCorrection(null);
    onOpenChange(next);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal className="runo-dialog-portal">
          <Dialog.Backdrop className="runo-dialog-backdrop" />
          <Dialog.Popup className="runo-dialog runo-review">
            <Dialog.Title className="runo-dialog-title">
              {t("title")}
            </Dialog.Title>
            <Dialog.Description className="runo-dialog-copy">
              {count > 0 ? t("copy", { count }) : t("empty")}
            </Dialog.Description>

            <div className="runo-review-body">
              {review.missed.length ? (
                <div className="runo-review-group" role="group" aria-labelledby="review-missed-title">
                  <h3
                    id="review-missed-title"
                    className="runo-review-group-title runo-review-group-title-missed"
                  >
                    {t("missedTitle")}
                  </h3>
                  <div className="runo-review-list" role="list">
                    {review.missed.map((item) => (
                      <ReviewRow
                        key={item.task.occurrenceId}
                        item={item}
                        busy={busyId === item.task.occurrenceId}
                        disabled={ending || busyId !== null}
                        onStart={onStart}
                        onCorrect={(task, kind) => setCorrection({ kind, task })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {review.later.length ? (
                <div className="runo-review-group" role="group" aria-labelledby="review-later-title">
                  <h3 id="review-later-title" className="runo-review-group-title">
                    {t("laterTitle")}
                  </h3>
                  <div className="runo-review-list" role="list">
                    {review.later.map((item) => (
                      <ReviewRow
                        key={item.task.occurrenceId}
                        item={item}
                        busy={busyId === item.task.occurrenceId}
                        disabled={ending || busyId !== null}
                        onStart={onStart}
                        onCorrect={(task, kind) => setCorrection({ kind, task })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="runo-dialog-actions">
              <Dialog.Close className="runo-dialog-cancel">
                {t("back")}
              </Dialog.Close>
              <button
                type="button"
                className="runo-dialog-confirm"
                disabled={ending || busyId !== null}
                onClick={onEndDay}
              >
                {ending ? t("ending") : t("endDay")}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={correction !== null}
        onOpenChange={(next) => {
          if (!next) setCorrection(null);
        }}
        title={correction?.kind === "already_done"
          ? confirm("alreadyDoneTitle")
          : confirm("notTodayTitle", { title: correction?.task.title ?? "" })}
        description={correction?.kind === "already_done"
          ? confirm("alreadyDoneCopy")
          : confirm("notTodayCopy")}
        note={note}
        confirmLabel={correction?.kind === "already_done"
          ? confirm("alreadyDoneConfirm")
          : confirm("notTodayConfirm")}
        onConfirm={() => {
          if (!correction) return;
          const { kind, task } = correction;
          setCorrection(null);
          if (kind === "already_done") onAlreadyDone(task);
          else onNotApplicable(task);
        }}
      />
    </>
  );
}
