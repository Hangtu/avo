CREATE TYPE "public"."runo_event_type" AS ENUM('offered', 'started', 'paused', 'resumed', 'timer_expired', 'completed', 'partial', 'abandoned', 'swapped', 'already_done', 'not_applicable', 'life_real', 'hand_closed', 'redeemed', 'task_created', 'task_updated', 'task_archived', 'anchor_presented');--> statement-breakpoint
CREATE TYPE "public"."runo_hand_item_state" AS ENUM('active', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."runo_hand_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."runo_ledger_reason" AS ENUM('full_completion', 'short_step', 'redemption');--> statement-breakpoint
CREATE TYPE "public"."runo_occurrence_status" AS ENUM('pending', 'in_progress', 'partial', 'completed', 'already_done', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."runo_session_status" AS ENUM('running', 'paused', 'awaiting_confirmation', 'completed', 'partial', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."runo_session_variant" AS ENUM('full', 'short');--> statement-breakpoint
CREATE TYPE "public"."runo_sound" AS ENUM('brown', 'tick');--> statement-breakpoint
CREATE TYPE "public"."runo_theme" AS ENUM('auto', 'light', 'dark');--> statement-breakpoint
CREATE TABLE "runo_days" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"swaps_used" smallint DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_days_user_id_date_pk" PRIMARY KEY("user_id","date"),
	CONSTRAINT "runo_days_swaps" CHECK ("runo_days"."swaps_used" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "runo_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action_id" text NOT NULL,
	"type" "runo_event_type" NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"task_id" text,
	"occurrence_id" text,
	"session_id" text,
	"hand_id" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runo_hand_items" (
	"hand_id" text NOT NULL,
	"occurrence_id" text NOT NULL,
	"state" "runo_hand_item_state" DEFAULT 'active' NOT NULL,
	"position" smallint,
	CONSTRAINT "runo_hand_items_hand_id_occurrence_id_pk" PRIMARY KEY("hand_id","occurrence_id"),
	CONSTRAINT "runo_hand_items_position" CHECK (("runo_hand_items"."state" = 'active' and "runo_hand_items"."position" between 1 and 3) or ("runo_hand_items"."state" = 'deferred' and "runo_hand_items"."position" is null))
);
--> statement-breakpoint
CREATE TABLE "runo_hands" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"ordinal" smallint NOT NULL,
	"status" "runo_hand_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "runo_hands_ordinal" CHECK ("runo_hands"."ordinal" > 0)
);
--> statement-breakpoint
CREATE TABLE "runo_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_key" text NOT NULL,
	"occurrence_id" text,
	"delta_rc" integer NOT NULL,
	"reason" "runo_ledger_reason" NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "runo_ledger_delta" CHECK ("runo_ledger"."delta_rc" <> 0)
);
--> statement-breakpoint
CREATE TABLE "runo_metadata" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_metadata_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "runo_occurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text NOT NULL,
	"date" date NOT NULL,
	"status" "runo_occurrence_status" DEFAULT 'pending' NOT NULL,
	"timer_elapsed_sec" integer DEFAULT 0 NOT NULL,
	"credited_rc" integer DEFAULT 0 NOT NULL,
	"short_step_completed" boolean DEFAULT false NOT NULL,
	"agreement" jsonb,
	"anchor_presented_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_occurrences_elapsed" CHECK ("runo_occurrences"."timer_elapsed_sec" >= 0),
	CONSTRAINT "runo_occurrences_credited" CHECK ("runo_occurrences"."credited_rc" >= 0)
);
--> statement-breakpoint
CREATE TABLE "runo_pendings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"duration_min" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_pendings_duration" CHECK ("runo_pendings"."duration_min" > 0)
);
--> statement-breakpoint
CREATE TABLE "runo_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"occurrence_id" text NOT NULL,
	"hand_id" text,
	"variant" "runo_session_variant" NOT NULL,
	"status" "runo_session_status" NOT NULL,
	"quick" boolean DEFAULT false NOT NULL,
	"pending_id" text,
	"task_snapshot" jsonb NOT NULL,
	"duration_sec" integer NOT NULL,
	"reward_target_rc" integer DEFAULT 0 NOT NULL,
	"reward_cap_rc" integer DEFAULT 0 NOT NULL,
	"remaining_sec_at_start" integer DEFAULT 0 NOT NULL,
	"elapsed_sec" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_sessions_duration" CHECK ("runo_sessions"."duration_sec" > 0),
	CONSTRAINT "runo_sessions_remaining" CHECK ("runo_sessions"."remaining_sec_at_start" >= 0),
	CONSTRAINT "runo_sessions_elapsed" CHECK ("runo_sessions"."elapsed_sec" >= 0),
	CONSTRAINT "runo_sessions_rewards" CHECK ("runo_sessions"."reward_target_rc" >= 0 and "runo_sessions"."reward_cap_rc" >= 0),
	CONSTRAINT "runo_sessions_started_at" CHECK (("runo_sessions"."status" = 'running' and "runo_sessions"."started_at" is not null) or ("runo_sessions"."status" <> 'running' and "runo_sessions"."started_at" is null))
);
--> statement-breakpoint
CREATE TABLE "runo_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"audio_enabled" boolean DEFAULT false NOT NULL,
	"sound" "runo_sound" DEFAULT 'brown' NOT NULL,
	"max_tone" smallint DEFAULT 2 NOT NULL,
	"theme" "runo_theme" DEFAULT 'auto' NOT NULL,
	"show_wallet" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_settings_max_tone" CHECK ("runo_settings"."max_tone" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "runo_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"duration_min" integer NOT NULL,
	"priority" smallint NOT NULL,
	"days" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
	"window_start" time,
	"window_end" time,
	"fixed_time" time,
	"short_step_title" text,
	"short_step_duration_min" smallint,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_tasks_duration" CHECK ("runo_tasks"."duration_min" > 0),
	CONSTRAINT "runo_tasks_priority" CHECK ("runo_tasks"."priority" between 1 and 3),
	CONSTRAINT "runo_tasks_days" CHECK ("runo_tasks"."days" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]),
	CONSTRAINT "runo_tasks_window" CHECK (("runo_tasks"."window_start" is null and "runo_tasks"."window_end" is null) or ("runo_tasks"."window_start" is not null and "runo_tasks"."window_end" is not null and "runo_tasks"."window_start" < "runo_tasks"."window_end")),
	CONSTRAINT "runo_tasks_fixed_time_window" CHECK ("runo_tasks"."fixed_time" is null or "runo_tasks"."window_start" is null or ("runo_tasks"."fixed_time" >= "runo_tasks"."window_start" and "runo_tasks"."fixed_time" < "runo_tasks"."window_end")),
	CONSTRAINT "runo_tasks_short_step" CHECK (("runo_tasks"."short_step_title" is null and "runo_tasks"."short_step_duration_min" is null) or ("runo_tasks"."short_step_title" is not null and "runo_tasks"."short_step_duration_min" is not null and "runo_tasks"."short_step_duration_min" > 0 and "runo_tasks"."short_step_duration_min" < "runo_tasks"."duration_min"))
);
--> statement-breakpoint
CREATE TABLE "runo_users" (
	"id" text PRIMARY KEY NOT NULL,
	"time_zone" text DEFAULT 'America/Mexico_City' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runo_days" ADD CONSTRAINT "runo_days_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_events" ADD CONSTRAINT "runo_events_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_hand_items" ADD CONSTRAINT "runo_hand_items_hand_id_runo_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."runo_hands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_hand_items" ADD CONSTRAINT "runo_hand_items_occurrence_id_runo_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."runo_occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_hands" ADD CONSTRAINT "runo_hands_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_ledger" ADD CONSTRAINT "runo_ledger_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_ledger" ADD CONSTRAINT "runo_ledger_occurrence_id_runo_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."runo_occurrences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_metadata" ADD CONSTRAINT "runo_metadata_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_occurrences" ADD CONSTRAINT "runo_occurrences_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_pendings" ADD CONSTRAINT "runo_pendings_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_sessions" ADD CONSTRAINT "runo_sessions_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_sessions" ADD CONSTRAINT "runo_sessions_occurrence_id_runo_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."runo_occurrences"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_sessions" ADD CONSTRAINT "runo_sessions_hand_id_runo_hands_id_fk" FOREIGN KEY ("hand_id") REFERENCES "public"."runo_hands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_sessions" ADD CONSTRAINT "runo_sessions_pending_id_runo_pendings_id_fk" FOREIGN KEY ("pending_id") REFERENCES "public"."runo_pendings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_settings" ADD CONSTRAINT "runo_settings_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_tasks" ADD CONSTRAINT "runo_tasks_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "runo_events_user_action_type_idx" ON "runo_events" USING btree ("user_id","action_id","type");--> statement-breakpoint
CREATE INDEX "runo_events_user_at_idx" ON "runo_events" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "runo_events_occurrence_idx" ON "runo_events" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "runo_events_session_idx" ON "runo_events" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "runo_hand_items_active_position_idx" ON "runo_hand_items" USING btree ("hand_id","position") WHERE "runo_hand_items"."state" = 'active';--> statement-breakpoint
CREATE INDEX "runo_hand_items_occurrence_idx" ON "runo_hand_items" USING btree ("occurrence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "runo_hands_user_date_ordinal_idx" ON "runo_hands" USING btree ("user_id","date","ordinal");--> statement-breakpoint
CREATE INDEX "runo_hands_user_date_status_idx" ON "runo_hands" USING btree ("user_id","date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "runo_ledger_user_source_idx" ON "runo_ledger" USING btree ("user_id","source_key");--> statement-breakpoint
CREATE INDEX "runo_ledger_user_at_idx" ON "runo_ledger" USING btree ("user_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "runo_occurrences_user_task_date_idx" ON "runo_occurrences" USING btree ("user_id","task_id","date");--> statement-breakpoint
CREATE INDEX "runo_occurrences_user_date_status_idx" ON "runo_occurrences" USING btree ("user_id","date","status");--> statement-breakpoint
CREATE INDEX "runo_pendings_user_created_idx" ON "runo_pendings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "runo_sessions_one_running_per_user_idx" ON "runo_sessions" USING btree ("user_id") WHERE "runo_sessions"."status" = 'running';--> statement-breakpoint
CREATE INDEX "runo_sessions_user_status_idx" ON "runo_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "runo_sessions_occurrence_idx" ON "runo_sessions" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "runo_tasks_user_archived_idx" ON "runo_tasks" USING btree ("user_id","archived_at");