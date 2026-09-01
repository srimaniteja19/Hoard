CREATE TABLE "notebook_courses" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "provider" text NOT NULL DEFAULT 'DeepLearning.AI',
  "accent" varchar(32) NOT NULL DEFAULT '#7B5CF0',
  "accent_fg" varchar(32) NOT NULL DEFAULT '#FFFFFF',
  "init" varchar(16) NOT NULL DEFAULT 'C',
  "url" text,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "archived_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "notebook_course_user_idx" ON "notebook_courses" ("user_id", "created_at" DESC);--> statement-breakpoint

CREATE TABLE "notebook_modules" (
  "id" text PRIMARY KEY,
  "course_id" text NOT NULL REFERENCES "notebook_courses"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "notebook_module_course_pos_idx" ON "notebook_modules" ("course_id", "position");--> statement-breakpoint

CREATE TABLE "notebook_lessons" (
  "id" text PRIMARY KEY,
  "module_id" text NOT NULL REFERENCES "notebook_modules"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "watched_at" timestamp,
  "lesson_url" text,
  "gap" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "notebook_lesson_module_pos_idx" ON "notebook_lessons" ("module_id", "position");--> statement-breakpoint

CREATE TABLE "notebook_pages" (
  "id" text PRIMARY KEY,
  "lesson_id" text NOT NULL UNIQUE REFERENCES "notebook_lessons"("id") ON DELETE CASCADE,
  "blocks" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "word_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "notebook_page_lesson_idx" ON "notebook_pages" ("lesson_id");--> statement-breakpoint

CREATE TABLE "notebook_transcripts" (
  "id" text PRIMARY KEY,
  "lesson_id" text NOT NULL UNIQUE REFERENCES "notebook_lessons"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "cues" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "source" varchar(32) NOT NULL DEFAULT 'pasted',
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "notebook_transcript_lesson_idx" ON "notebook_transcripts" ("lesson_id");--> statement-breakpoint

CREATE TABLE "notebook_chunks" (
  "id" text PRIMARY KEY,
  "page_id" text NOT NULL REFERENCES "notebook_pages"("id") ON DELETE CASCADE,
  "block_id" text NOT NULL,
  "text" text NOT NULL,
  "embedding" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "notebook_chunk_page_idx" ON "notebook_chunks" ("page_id");--> statement-breakpoint

CREATE TABLE "notebook_collisions" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "relation" varchar(32) NOT NULL DEFAULT 'same-idea',
  "source_a" jsonb NOT NULL,
  "source_b" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "notebook_collision_user_idx" ON "notebook_collisions" ("user_id", "created_at" DESC);
