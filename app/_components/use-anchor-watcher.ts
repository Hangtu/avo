"use client";

import { useEffect, useRef } from "react";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  claimAnchor,
  ensureOccurrence,
  listTasks,
  pauseSession,
} from "@/lib/db/repository";
import { findDueAnchor } from "@/lib/domain/anchors";
import { pulse } from "@/lib/platform/haptics";
import { toLocalDate, weekdayOf } from "@/lib/domain/time";
import type { Occurrence, Task } from "@/lib/domain/types";

export function useAnchorWatcher({
  enabled,
  onAnchor,
}: {
  enabled: boolean;
  onAnchor: (task: Task, occurrence: Occurrence) => void;
}) {
  const onAnchorRef = useRef(onAnchor);

  useEffect(() => {
    onAnchorRef.current = onAnchor;
  }, [onAnchor]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function check() {
      if (document.visibilityState !== "visible") return;
      let db: RunoDatabase | null = null;
      try {
        db = await openDatabase();
        const now = Date.now();
        const date = toLocalDate(now);
        const day = await db.days.get(date);
        if (day?.closedAt != null) return;

        const tasks = await listTasks(db);
        const weekday = weekdayOf(date);
        for (const task of tasks) {
          if (!task.days.includes(weekday)) continue;
          try {
            await ensureOccurrence(db, task.id, date, now);
          } catch {
            // Archived/edited between listing and materializing.
          }
        }
        const occurrences = await db.occurrences.where("date").equals(date).toArray();
        const due = findDueAnchor(tasks, occurrences, now);
        if (!due) return;

        const active = await db.sessions
          .filter((session) => ["running", "paused", "awaiting_confirmation"].includes(session.status))
          .first();
        if (active?.status === "awaiting_confirmation") return;
        if (active?.status === "running") {
          await pauseSession(db, active.id, now);
        }

        const claimed = await claimAnchor(db, {
          taskId: due.task.id,
          date,
          fixedTime: due.task.fixedTime!,
          now,
        });
        if (claimed && !cancelled) {
          pulse("anchor");
          onAnchorRef.current(due.task, claimed);
        }
      } catch (cause) {
        if (!cancelled) console.error("No se pudo revisar el ancla", cause);
      } finally {
        db?.close();
      }
    }

    void check();
    const interval = window.setInterval(() => void check(), 30_000);
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void check();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);
}
