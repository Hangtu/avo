import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { SOUND_KEYS, type JsonValue, type Task, type TaskAgreement } from "@/lib/domain/types";
import type { TaskOrder } from "@/lib/domain/task-order";
import { authUsers } from "./auth-schema";

/**
 * Server-side Postgres schema. Account sync exposes tasks, routines, pendings
 * and portable settings; runtime tables remain legacy-compatible, not synchronized.
 * IndexedDB is the operational layer offline. Composite domain IDs and legacy
 * event/ledger identities are preserved without distributing owner data.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const timestampColumn = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const occurrenceStatusEnum = pgEnum("runo_occurrence_status", [
  "pending",
  "in_progress",
  "partial",
  "completed",
  "already_done",
  "not_applicable",
]);

export const handStatusEnum = pgEnum("runo_hand_status", ["open", "closed"]);
export const handItemStateEnum = pgEnum("runo_hand_item_state", ["active", "deferred"]);
export const sessionVariantEnum = pgEnum("runo_session_variant", ["full", "short"]);
export const sessionStatusEnum = pgEnum("runo_session_status", [
  "running",
  "paused",
  "awaiting_confirmation",
  "completed",
  "partial",
  "abandoned",
]);
export const ledgerReasonEnum = pgEnum("runo_ledger_reason", ["full_completion", "short_step", "redemption"]);
export const soundEnum = pgEnum("runo_sound", SOUND_KEYS);
export const themeEnum = pgEnum("runo_theme", ["auto", "light", "dark"]);
export const eventTypeEnum = pgEnum("runo_event_type", [
  "offered",
  "started",
  "paused",
  "resumed",
  "timer_expired",
  "completed",
  "partial",
  "abandoned",
  "swapped",
  "already_done",
  "not_applicable",
  "life_real",
  "hand_closed",
  "redeemed",
  "task_created",
  "task_updated",
  "task_archived",
  "anchor_presented",
]);

export const users = pgTable("runo_users", {
  id: text("id").primaryKey(),
  // Null preserves the legacy owner. Never attach it to the first social login.
  authUserId: text("auth_user_id")
    .unique()
    .references(() => authUsers.id, { onDelete: "restrict" }),
  timeZone: text("time_zone").notNull().default("America/Mexico_City"),
  createdAt: createdAt(),
});

// Keep the public schema exports used by the existing auth server.
export { authUsers, authSessions, authAccounts, authVerifications } from "./auth-schema";

/** Shared abuse counters only: HMAC keys, no raw IP/account IDs or domain data. */
export const rateLimits = pgTable(
  "runo_rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    expiresAt: timestampColumn("expires_at").notNull(),
  },
  (table) => [
    index("runo_rate_limits_expires_idx").on(table.expiresAt),
    check("runo_rate_limits_count", sql`${table.count} > 0`),
    check("runo_rate_limits_key", sql`${table.key} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const settings = pgTable(
  "runo_settings",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    audioEnabled: boolean("audio_enabled").notNull().default(false),
    sound: soundEnum("sound").notNull().default("brown"),
    maxTone: smallint("max_tone").notNull().default(2),
    theme: themeEnum("theme").notNull().default("auto"),
    showWallet: boolean("show_wallet").notNull().default(false),
    locale: text("locale").$type<"es" | "en">().notNull().default("es"),
    taskOrder: jsonb("task_order")
      .$type<TaskOrder>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    revision: integer("revision").notNull().default(1),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("runo_settings_max_tone", sql`${table.maxTone} between 0 and 2`),
    check("runo_settings_locale", sql`${table.locale} in ('es', 'en')`),
    check("runo_settings_revision", sql`${table.revision} > 0`),
  ],
);

export const tasks = pgTable(
  "runo_tasks",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    durationMin: integer("duration_min").notNull(),
    priority: smallint("priority").notNull(),
    /** JavaScript weekday convention: 0 = Sunday, 6 = Saturday. */
    days: smallint("days")
      .array()
      .notNull()
      .default(sql`'{}'::smallint[]`),
    windowStart: time("window_start"),
    windowEnd: time("window_end"),
    fixedTime: time("fixed_time"),
    shortStepTitle: text("short_step_title"),
    shortStepDurationMin: smallint("short_step_duration_min"),
    revision: integer("revision").notNull().default(1),
    archivedAt: timestampColumn("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("runo_tasks_user_archived_idx").on(table.userId, table.archivedAt),
    check("runo_tasks_revision", sql`${table.revision} > 0`),
    check("runo_tasks_duration", sql`${table.durationMin} > 0`),
    check("runo_tasks_priority", sql`${table.priority} between 1 and 3`),
    check("runo_tasks_days", sql`${table.days} <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]`),
    check(
      "runo_tasks_window",
      sql`(${table.windowStart} is null and ${table.windowEnd} is null) or (${table.windowStart} is not null and ${table.windowEnd} is not null and ${table.windowStart} < ${table.windowEnd})`,
    ),
    check(
      "runo_tasks_fixed_time_window",
      sql`${table.fixedTime} is null or ${table.windowStart} is null or (${table.fixedTime} >= ${table.windowStart} and ${table.fixedTime} < ${table.windowEnd})`,
    ),
    check(
      "runo_tasks_short_step",
      sql`(${table.shortStepTitle} is null and ${table.shortStepDurationMin} is null) or (${table.shortStepTitle} is not null and ${table.shortStepDurationMin} is not null and ${table.shortStepDurationMin} > 0 and ${table.shortStepDurationMin} < ${table.durationMin})`,
    ),
  ],
);

export const routines = pgTable(
  "runo_routines",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    taskIds: text("task_ids").array().notNull(),
    archivedAt: timestampColumn("archived_at"),
    revision: integer("revision").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("runo_routines_user_created_idx").on(table.userId, table.createdAt),
    check("runo_routines_revision", sql`${table.revision} > 0`),
    check("runo_routines_title", sql`length(trim(${table.title})) between 1 and 1024`),
    check("runo_routines_task_ids", sql`cardinality(${table.taskIds}) between 2 and 50`),
  ],
);

export const pendings = pgTable(
  "runo_pendings",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    durationMin: integer("duration_min").notNull(),
    completedAt: timestampColumn("completed_at"),
    deletedAt: timestampColumn("deleted_at"),
    revision: integer("revision").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("runo_pendings_user_created_idx").on(table.userId, table.createdAt),
    check("runo_pendings_revision", sql`${table.revision} > 0`),
    check("runo_pendings_duration", sql`${table.durationMin} > 0`),
  ],
);

export const days = pgTable(
  "runo_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    swapsUsed: smallint("swaps_used").notNull().default(0),
    closedAt: timestampColumn("closed_at"),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date] }),
    check("runo_days_swaps", sql`${table.swapsUsed} between 0 and 3`),
  ],
);

export const hands = pgTable(
  "runo_hands",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    ordinal: smallint("ordinal").notNull(),
    status: handStatusEnum("status").notNull().default("open"),
    createdAt: createdAt(),
    closedAt: timestampColumn("closed_at"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    uniqueIndex("runo_hands_user_date_ordinal_idx").on(table.userId, table.date, table.ordinal),
    index("runo_hands_user_date_status_idx").on(table.userId, table.date, table.status),
    check("runo_hands_ordinal", sql`${table.ordinal} > 0`),
  ],
);

export const occurrences = pgTable(
  "runo_occurrences",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * Kept as text because quick/pending sessions intentionally use synthetic
     * task IDs that do not exist in runo_tasks. Their snapshot lives in
     * runo_sessions.task_snapshot.
     */
    taskId: text("task_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    status: occurrenceStatusEnum("status").notNull().default("pending"),
    timerElapsedSec: integer("timer_elapsed_sec").notNull().default(0),
    creditedRc: integer("credited_rc").notNull().default(0),
    shortStepCompleted: boolean("short_step_completed").notNull().default(false),
    agreement: jsonb("agreement").$type<TaskAgreement>(),
    anchorPresentedAt: timestampColumn("anchor_presented_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    uniqueIndex("runo_occurrences_user_task_date_idx").on(table.userId, table.taskId, table.date),
    index("runo_occurrences_user_date_status_idx").on(table.userId, table.date, table.status),
    check("runo_occurrences_elapsed", sql`${table.timerElapsedSec} >= 0`),
    check("runo_occurrences_credited", sql`${table.creditedRc} >= 0`),
  ],
);

export const handItems = pgTable(
  "runo_hand_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    handId: text("hand_id").notNull(),
    occurrenceId: text("occurrence_id").notNull(),
    state: handItemStateEnum("state").notNull().default("active"),
    position: smallint("position"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.handId, table.occurrenceId] }),
    foreignKey({ columns: [table.userId, table.handId], foreignColumns: [hands.userId, hands.id] }).onDelete(
      "cascade",
    ),
    foreignKey({
      columns: [table.userId, table.occurrenceId],
      foreignColumns: [occurrences.userId, occurrences.id],
    }).onDelete("cascade"),
    uniqueIndex("runo_hand_items_active_position_idx")
      .on(table.userId, table.handId, table.position)
      .where(sql`${table.state} = 'active'`),
    index("runo_hand_items_occurrence_idx").on(table.userId, table.occurrenceId),
    check(
      "runo_hand_items_position",
      sql`(${table.state} = 'active' and ${table.position} between 1 and 3) or (${table.state} = 'deferred' and ${table.position} is null)`,
    ),
  ],
);

export const sessions = pgTable(
  "runo_sessions",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurrenceId: text("occurrence_id").notNull(),
    handId: text("hand_id"),
    variant: sessionVariantEnum("variant").notNull(),
    status: sessionStatusEnum("status").notNull(),
    quick: boolean("quick").notNull().default(false),
    pendingId: text("pending_id"),
    taskSnapshot: jsonb("task_snapshot").$type<Task>().notNull(),
    durationSec: integer("duration_sec").notNull(),
    rewardTargetRc: integer("reward_target_rc").notNull().default(0),
    rewardCapRc: integer("reward_cap_rc").notNull().default(0),
    remainingSecAtStart: integer("remaining_sec_at_start").notNull().default(0),
    elapsedSec: integer("elapsed_sec").notNull().default(0),
    startedAt: timestampColumn("started_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    foreignKey({
      columns: [table.userId, table.occurrenceId],
      foreignColumns: [occurrences.userId, occurrences.id],
    }).onDelete("restrict"),
    // Optional references must be cleared explicitly before deleting their target.
    // Composite SET NULL would also null user_id and break account ownership.
    foreignKey({ columns: [table.userId, table.handId], foreignColumns: [hands.userId, hands.id] }),
    foreignKey({
      columns: [table.userId, table.pendingId],
      foreignColumns: [pendings.userId, pendings.id],
    }).onDelete("restrict"),
    uniqueIndex("runo_sessions_one_running_per_user_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'running'`),
    index("runo_sessions_user_status_idx").on(table.userId, table.status),
    index("runo_sessions_occurrence_idx").on(table.userId, table.occurrenceId),
    check("runo_sessions_duration", sql`${table.durationSec} > 0`),
    check("runo_sessions_remaining", sql`${table.remainingSecAtStart} >= 0`),
    check("runo_sessions_elapsed", sql`${table.elapsedSec} >= 0`),
    check("runo_sessions_rewards", sql`${table.rewardTargetRc} >= 0 and ${table.rewardCapRc} >= 0`),
    check(
      "runo_sessions_started_at",
      sql`(${table.status} = 'running' and ${table.startedAt} is not null) or (${table.status} <> 'running' and ${table.startedAt} is null)`,
    ),
  ],
);

export const events = pgTable(
  "runo_events",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actionId: text("action_id").notNull(),
    type: eventTypeEnum("type").notNull(),
    at: timestampColumn("at").notNull(),
    taskId: text("task_id"),
    occurrenceId: text("occurrence_id"),
    sessionId: text("session_id"),
    handId: text("hand_id"),
    context: jsonb("context")
      .$type<Record<string, JsonValue>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    uniqueIndex("runo_events_user_action_type_idx").on(table.userId, table.actionId, table.type),
    index("runo_events_user_at_idx").on(table.userId, table.at),
    // Event IDs remain descriptive legacy labels, not an authorization join.
    index("runo_events_occurrence_idx").on(table.userId, table.occurrenceId),
    index("runo_events_session_idx").on(table.userId, table.sessionId),
  ],
);

export const ledger = pgTable(
  "runo_ledger",
  {
    id: text("id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    occurrenceId: text("occurrence_id"),
    deltaRc: integer("delta_rc").notNull(),
    reason: ledgerReasonEnum("reason").notNull(),
    at: timestampColumn("at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    foreignKey({
      columns: [table.userId, table.occurrenceId],
      foreignColumns: [occurrences.userId, occurrences.id],
    }),
    uniqueIndex("runo_ledger_user_source_idx").on(table.userId, table.sourceKey),
    index("runo_ledger_user_at_idx").on(table.userId, table.at),
    check("runo_ledger_delta", sql`${table.deltaRc} <> 0`),
  ],
);

export const metadata = pgTable(
  "runo_metadata",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<JsonValue>().notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.key] })],
);

export type UserRow = typeof users.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type RoutineRow = typeof routines.$inferSelect;
export type PendingRow = typeof pendings.$inferSelect;
export type OccurrenceRow = typeof occurrences.$inferSelect;
export type DayRow = typeof days.$inferSelect;
export type HandRow = typeof hands.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type LedgerRow = typeof ledger.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
