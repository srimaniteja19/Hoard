ALTER TABLE "ask_saves" ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT '';

-- Rollback (run by hand if this needs to be undone):
-- ALTER TABLE "ask_saves" DROP COLUMN "title";
