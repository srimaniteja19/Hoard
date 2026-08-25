CREATE TABLE "scratch_postcards" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "week_start" date NOT NULL,
  "week_end" date NOT NULL,
  "kind_tallies" jsonb NOT NULL,
  "total_count" integer NOT NULL,
  "days_logged" integer NOT NULL,
  "previous_week_total" integer NOT NULL,
  "current_streak" integer NOT NULL,
  "highlight_scrap_id" text REFERENCES "scraps"("id") ON DELETE SET NULL,
  "highlight_content" text,
  "highlight_kind" varchar(32),
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX "scratch_postcards_user_week_idx" ON "scratch_postcards" ("user_id", "week_start");
