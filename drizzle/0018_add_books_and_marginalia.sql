CREATE TABLE "books" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "author" text NOT NULL,
  "isbn" varchar(32),
  "format" varchar(16) NOT NULL DEFAULT 'AUDIO',
  "accent_color" varchar(16) NOT NULL DEFAULT '#7B5CF0',
  "fg_color" varchar(16) NOT NULL DEFAULT '#FFFFFF',
  "motif" varchar(16) NOT NULL DEFAULT 'arcs',
  "initial" varchar(8) NOT NULL DEFAULT 'B',
  "total_chapters" integer NOT NULL DEFAULT 1,
  "current_chapter" integer NOT NULL DEFAULT 1,
  "total_pages" integer,
  "current_page" integer,
  "audio_duration" varchar(32),
  "audio_current_time" varchar(32),
  "started_date" varchar(64),
  "completed_date" varchar(64),
  "status" varchar(16) NOT NULL DEFAULT 'READING',
  "cover_url" text,
  "cover_source" varchar(32) DEFAULT 'HOUSE',
  "custom_cover_url" text,
  "notes_count" integer DEFAULT 0,
  "promoted_count" integer DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "books_user_idx" ON "books" ("user_id", "updated_at" DESC);--> statement-breakpoint

CREATE TABLE "marginalia" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "book_id" text NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "kind" varchar(16) NOT NULL DEFAULT 'VERBATIM',
  "quote" text,
  "note" text,
  "chapter" integer NOT NULL DEFAULT 1,
  "page" integer,
  "timestamp" varchar(32),
  "promoted_to" varchar(16),
  "promoted_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "marginalia_book_user_idx" ON "marginalia" ("book_id", "user_id", "chapter", "created_at" DESC);--> statement-breakpoint
CREATE INDEX "marginalia_user_created_idx" ON "marginalia" ("user_id", "created_at" DESC);--> statement-breakpoint

CREATE TABLE "marginalia_pending_marks" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "book_id" text NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "timestamp" varchar(32) NOT NULL,
  "chapter" integer,
  "note" text,
  "status" varchar(16) NOT NULL DEFAULT 'PENDING',
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "marginalia_pending_book_idx" ON "marginalia_pending_marks" ("book_id", "user_id", "status", "created_at" ASC);
