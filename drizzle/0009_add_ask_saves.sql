CREATE TABLE "ask_saves" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "summary" text NOT NULL DEFAULT '',
  "citations" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "model" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "ask_saves_user_created_idx" ON "ask_saves" ("user_id", "created_at" DESC);

-- Rollback (run by hand if this needs to be undone):
-- DROP INDEX "ask_saves_user_created_idx";
-- DROP TABLE "ask_saves";
