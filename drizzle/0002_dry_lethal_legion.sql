CREATE TABLE "runo_auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runo_auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "runo_auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runo_auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "runo_auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runo_auth_accounts" ADD CONSTRAINT "runo_auth_accounts_user_id_runo_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runo_auth_sessions" ADD CONSTRAINT "runo_auth_sessions_user_id_runo_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."runo_auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runo_auth_accounts_user_id_idx" ON "runo_auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "runo_auth_accounts_provider_account_idx" ON "runo_auth_accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "runo_auth_sessions_user_id_idx" ON "runo_auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "runo_auth_verifications_identifier_idx" ON "runo_auth_verifications" USING btree ("identifier");