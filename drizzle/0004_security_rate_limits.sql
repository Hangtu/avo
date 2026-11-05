CREATE TABLE "runo_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "runo_rate_limits_count" CHECK ("runo_rate_limits"."count" > 0),
	CONSTRAINT "runo_rate_limits_key" CHECK ("runo_rate_limits"."key" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE INDEX "runo_rate_limits_expires_idx" ON "runo_rate_limits" USING btree ("expires_at");