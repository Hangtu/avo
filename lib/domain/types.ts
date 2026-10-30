import type { ClockTime, LocalDate, Weekday } from "./time";

export interface TaskInput {
  title: string;
  days: Weekday[];
  durationMin: number;
  priority: 1 | 2 | 3;
  category: string;
  window?: { start: ClockTime; end: ClockTime };
  fixedTime?: ClockTime;
  shortStep?: { title: string; durationMin: number };
}

export interface Task extends TaskInput {
  id: string;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export type OccurrenceStatus =
  | "pending"
  | "in_progress"
  | "partial"
  | "completed"
  | "already_done"
  | "not_applicable";

export interface TaskAgreement {
  task: Task;
  rewardCapRc: number;
  shortStepRc: number | null;
  lockedAt: number;
}

export interface Occurrence {
  id: string;
  taskId: string;
  date: LocalDate;
  status: OccurrenceStatus;
  timerElapsedSec: number;
  creditedRc: number;
  shortStepCompleted: boolean;
  agreement: TaskAgreement | null;
  anchorPresentedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Day {
  date: LocalDate;
  swapsUsed: 0 | 1 | 2 | 3;
  createdAt: number;
}

export interface Hand {
  id: string;
  date: LocalDate;
  ordinal: number;
  occurrenceIds: string[];
  deferredOccurrenceIds: string[];
  status: "open" | "closed";
  createdAt: number;
  closedAt: number | null;
}

export type SessionVariant = "full" | "short";
export type SessionStatus =
  | "running"
  | "paused"
  | "awaiting_confirmation"
  | "completed"
  | "partial"
  | "abandoned";

interface SessionBase {
  id: string;
  occurrenceId: string;
  handId: string | null;
  variant: SessionVariant;
  taskSnapshot: Task;
  durationSec: number;
  rewardTargetRc: number;
  rewardCapRc: number;
  remainingSecAtStart: number;
  elapsedSec: number;
  createdAt: number;
  updatedAt: number;
}

/** Only running sessions have the unique IndexedDB runningSlot key. */
export type Session = SessionBase &
  (
    | { status: "running"; startedAt: number; runningSlot: "running" }
    | {
        status: Exclude<SessionStatus, "running">;
        startedAt: null;
        runningSlot?: never;
      }
  );

export const EVENT_TYPES = [
  "offered", "started", "paused", "resumed", "timer_expired",
  "completed", "partial", "abandoned", "swapped", "already_done",
  "not_applicable", "life_real", "hand_closed", "redeemed",
  "task_created", "task_updated", "task_archived", "anchor_presented",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type EventReason = "distracted" | "baby" | "cannot_continue" | "not_applicable";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface RunoEvent {
  id: string;
  actionId: string;
  type: EventType;
  at: number;
  taskId?: string;
  occurrenceId?: string;
  sessionId?: string;
  handId?: string;
  context: Record<string, JsonValue>;
}

export interface LedgerEntry {
  id: string;
  /** Stable business identity: a retry cannot create the same credit/debit twice. */
  sourceKey: string;
  occurrenceId?: string;
  deltaRc: number;
  reason: "full_completion" | "short_step" | "redemption";
  at: number;
}

export interface Settings {
  id: "preferences";
  audioEnabled: boolean;
  sound: "brown" | "tick";
  maxTone: 0 | 1 | 2;
  theme: "auto" | "light" | "dark";
  updatedAt: number;
}

/** Internal migration/seed markers, not an additional product feature. */
export interface Metadata {
  key: string;
  value: JsonValue;
}

export const TERMINAL_OCCURRENCE_STATUSES: ReadonlySet<OccurrenceStatus> =
  new Set(["completed", "already_done", "not_applicable"]);
