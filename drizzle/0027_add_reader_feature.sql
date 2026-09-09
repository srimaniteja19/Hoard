CREATE TABLE IF NOT EXISTS "reader_senders" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "issue_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reader_sender_user_name_idx" ON "reader_senders" ("user_id", "name");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "reader_issues" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sender" text NOT NULL,
  "sender_id" text REFERENCES "reader_senders"("id") ON DELETE SET NULL,
  "subject" text NOT NULL,
  "dek" text NOT NULL DEFAULT '',
  "category" varchar(32) NOT NULL DEFAULT 'unsorted',
  "category_confidence" real NOT NULL DEFAULT 1.0,
  "arrived_at" timestamp with time zone NOT NULL DEFAULT now(),
  "word_count" integer NOT NULL DEFAULT 0,
  "read_minutes" integer NOT NULL DEFAULT 1,
  "body_blocks" jsonb,
  "links" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" varchar(24) NOT NULL DEFAULT 'unread',
  "kept_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_issues_user_arrived_idx" ON "reader_issues" ("user_id", "arrived_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_issues_user_status_idx" ON "reader_issues" ("user_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_issues_user_category_idx" ON "reader_issues" ("user_id", "category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_issues_user_sender_idx" ON "reader_issues" ("user_id", "sender");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "reader_keeps" (
  "id" text PRIMARY KEY NOT NULL,
  "issue_id" text NOT NULL REFERENCES "reader_issues"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" varchar(16) NOT NULL DEFAULT 'CLAIM',
  "quote" text,
  "reason" text NOT NULL,
  "color" varchar(32),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_keeps_issue_idx" ON "reader_keeps" ("issue_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_keeps_user_idx" ON "reader_keeps" ("user_id", "created_at" DESC);
