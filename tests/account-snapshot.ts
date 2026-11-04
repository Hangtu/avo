import type { RunoSnapshot } from "@/lib/db/snapshot-types";
import type { Occurrence, Task } from "@/lib/domain/types";
import { MONDAY, NOW, taskInput } from "./fixtures";

/** Synthetic full E3 graph: deliberately reuses every domain ID across owners. */
export function accountSnapshot(label: string): RunoSnapshot {
  const task: Task = {
    ...taskInput({ title: label }),
    id: "seed:coffee",
    createdAt: NOW,
    updatedAt: NOW,
    archivedAt: null,
  };
  const occurrence = (id: string, taskId: string): Occurrence => ({
    id,
    taskId,
    date: MONDAY,
    status: "pending",
    timerElapsedSec: 0,
    creditedRc: 0,
    shortStepCompleted: false,
    agreement: null,
    anchorPresentedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
  return {
    schemaVersion: 3,
    exportedAt: NOW,
    tasks: [task],
    pendings: [
      {
        id: "pending:same",
        title: label,
        durationMin: 25,
        createdAt: NOW,
        updatedAt: NOW,
        completedAt: NOW,
        deletedAt: null,
      },
    ],
    days: [{ date: MONDAY, swapsUsed: 0, closedAt: null, createdAt: NOW }],
    occurrences: [
      occurrence("occurrence:same", task.id),
      occurrence("occurrence:deferred", "quick:deferred"),
    ],
    hands: [
      {
        id: "hand:same",
        date: MONDAY,
        ordinal: 1,
        status: "open",
        occurrenceIds: ["occurrence:same"],
        deferredOccurrenceIds: ["occurrence:deferred"],
        createdAt: NOW,
        closedAt: null,
      },
    ],
    sessions: [
      {
        id: "session:same",
        occurrenceId: "occurrence:same",
        handId: "hand:same",
        variant: "full",
        status: "paused",
        taskSnapshot: task,
        durationSec: 900,
        rewardTargetRc: 0,
        rewardCapRc: 0,
        remainingSecAtStart: 900,
        elapsedSec: 0,
        startedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    events: [
      {
        id: "event:same",
        actionId: "action:same",
        type: "paused",
        at: NOW,
        taskId: task.id,
        occurrenceId: "occurrence:same",
        sessionId: "session:same",
        handId: "hand:same",
        context: { label },
      },
    ],
    ledger: [
      {
        id: "ledger:same",
        sourceKey: "source:same",
        occurrenceId: "occurrence:same",
        deltaRc: 1,
        reason: "full_completion",
        at: NOW,
      },
    ],
    settings: {
      id: "preferences",
      audioEnabled: false,
      sound: "brown",
      maxTone: 2,
      theme: "auto",
      showWallet: false,
      updatedAt: NOW,
    },
    metadata: [{ key: "test:preserved", value: { label } }],
  };
}
