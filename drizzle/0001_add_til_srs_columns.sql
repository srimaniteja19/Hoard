-- Migration: Add SRS and supersession columns to til_entries
-- Run against existing database where til_entries already has data

-- 1. Add new columns
ALTER TABLE "til_entries" ADD COLUMN "superseded_by_id" text;
ALTER TABLE "til_entries" ADD COLUMN "stability" real NOT NULL DEFAULT 1;
ALTER TABLE "til_entries" ADD COLUMN "ease" real NOT NULL DEFAULT 2.5;
ALTER TABLE "til_entries" ADD COLUMN "review_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "til_entries" ADD COLUMN "last_reviewed_at" timestamp;
ALTER TABLE "til_entries" ADD COLUMN "next_review_at" timestamp;

-- 2. Self-referencing FK for supersession
ALTER TABLE "til_entries"
  ADD CONSTRAINT "til_entries_superseded_by_id_til_entries_id_fk"
  FOREIGN KEY ("superseded_by_id")
  REFERENCES "til_entries"("id")
  ON DELETE SET NULL;

-- 3. Indexes for RECALL deck query and supersession lookups
CREATE INDEX "til_user_review_idx" ON "til_entries" ("user_id", "next_review_at");
CREATE INDEX "til_superseded_idx" ON "til_entries" ("superseded_by_id");

-- 4. Backfill existing rows: stability=1, last_reviewed_at=created_at, next_review_at=created_at+1day
UPDATE "til_entries"
SET
  "last_reviewed_at" = "created_at",
  "next_review_at" = "created_at" + interval '1 day'
WHERE "last_reviewed_at" IS NULL;
