CREATE TABLE "scraps" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "kind" varchar(32) NOT NULL DEFAULT 'FRAGMENT',
  "color" varchar(32) NOT NULL DEFAULT 'cyan',
  "tilt" varchar(16) NOT NULL DEFAULT '0deg',
  "notes" text NOT NULL DEFAULT '',
  "status" varchar(32) NOT NULL DEFAULT 'raw',
  "status_label" varchar(64) NOT NULL DEFAULT 'RAW',
  "promoted_to" varchar(32),
  "promoted_id" text,
  "thread_n" integer NOT NULL DEFAULT 0,
  "thread_summary" text,
  "welded_to_id" text REFERENCES "scraps"("id") ON DELETE SET NULL,
  "logged_for" date NOT NULL,
  "is_buried" boolean NOT NULL DEFAULT false,
  "buried_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "scraps_user_logged_for_idx" ON "scraps" ("user_id", "is_buried", "logged_for" DESC);--> statement-breakpoint
CREATE INDEX "scraps_user_created_idx" ON "scraps" ("user_id", "is_buried", "created_at" DESC);--> statement-breakpoint
CREATE INDEX "scraps_user_kind_idx" ON "scraps" ("user_id", "kind");
