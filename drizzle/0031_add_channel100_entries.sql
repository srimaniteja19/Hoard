CREATE TABLE IF NOT EXISTS "channel100_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"media_id" varchar(16) NOT NULL,
	"status" varchar(16) DEFAULT '' NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channel100_entries_user_media_idx" ON "channel100_entries" ("user_id", "media_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel100_entries_user_status_idx" ON "channel100_entries" ("user_id", "status");
