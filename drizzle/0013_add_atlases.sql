CREATE TABLE "atlases" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "serial" varchar(16) NOT NULL,
  "title" text NOT NULL,
  "brief" text NOT NULL DEFAULT '',
  "prompt" text NOT NULL,
  "depth" text NOT NULL,
  "cadence" text NOT NULL,
  "minutes_per_session" integer NOT NULL,
  "weeks_planned" integer NOT NULL,
  "anti_scope" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  "current_week_id" text,
  "syllabus" jsonb NOT NULL,
  "model" text NOT NULL DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "atlases_user_status_updated_idx" ON "atlases" ("user_id", "status", "updated_at" DESC);

-- Rollback (run by hand if this needs to be undone):
-- DROP INDEX "atlases_user_status_updated_idx";
-- DROP TABLE "atlases";
