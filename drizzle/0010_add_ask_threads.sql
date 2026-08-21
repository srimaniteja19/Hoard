CREATE TABLE "ask_threads" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT '',
  "model" text NOT NULL DEFAULT '',
  "web" boolean NOT NULL DEFAULT false,
  "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "ask_threads_user_updated_idx" ON "ask_threads" ("user_id", "updated_at" DESC);

-- Rollback (run by hand if this needs to be undone):
-- DROP INDEX "ask_threads_user_updated_idx";
-- DROP TABLE "ask_threads";
