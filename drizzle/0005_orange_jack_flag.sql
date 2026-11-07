CREATE TABLE "runo_routines" (
	"id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"task_ids" text[] NOT NULL,
	"archived_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_routines_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "runo_routines_revision" CHECK ("runo_routines"."revision" > 0),
	CONSTRAINT "runo_routines_title" CHECK (length(trim("runo_routines"."title")) between 1 and 1024),
	CONSTRAINT "runo_routines_task_ids" CHECK (cardinality("runo_routines"."task_ids") between 2 and 50)
);
--> statement-breakpoint
ALTER TABLE "runo_routines" ADD CONSTRAINT "runo_routines_user_id_runo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runo_routines_user_created_idx" ON "runo_routines" USING btree ("user_id","created_at");