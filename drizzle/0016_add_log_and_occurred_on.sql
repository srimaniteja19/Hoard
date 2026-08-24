-- Migration to add occurred_on, entities, tags, and update occurred_on for existing scraps
ALTER TABLE "scraps" ADD COLUMN IF NOT EXISTS "occurred_on" date;
ALTER TABLE "scraps" ADD COLUMN IF NOT EXISTS "entities" jsonb;
ALTER TABLE "scraps" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb;

-- Populate occurred_on with logged_for for existing records
UPDATE "scraps" SET "occurred_on" = "logged_for" WHERE "occurred_on" IS NULL;

-- Create index for occurred_on
CREATE INDEX IF NOT EXISTS "scraps_user_occurred_on_idx" ON "scraps" ("user_id", "is_buried", "occurred_on" DESC);
