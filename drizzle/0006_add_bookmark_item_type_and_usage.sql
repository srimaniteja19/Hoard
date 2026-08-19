CREATE TYPE "public"."bookmark_item_type" AS ENUM('REFERENCE', 'QUEUED');--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "item_type" "bookmark_item_type" DEFAULT 'REFERENCE' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "item_type_guessed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "use_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "user_use_count_idx" ON "bookmarks" USING btree ("user_id","use_count");--> statement-breakpoint
CREATE INDEX "user_last_used_idx" ON "bookmarks" USING btree ("user_id","last_used_at");--> statement-breakpoint

-- Heuristic backfill (LIBRARY.md §1). Every existing row predates item_type,
-- so every row is guessed. Mirrors src/lib/library/inferItemType.ts — keep in sync.
UPDATE "bookmarks"
SET
  "item_type" = CASE
    WHEN "type" IN ('ART', 'VID', 'PPR') THEN 'QUEUED'::"bookmark_item_type"
    ELSE 'REFERENCE'::"bookmark_item_type"
  END,
  "item_type_guessed" = true;

-- Rollback (run by hand if this needs to be undone):
-- DROP INDEX "user_last_used_idx";
-- DROP INDEX "user_use_count_idx";
-- ALTER TABLE "bookmarks" DROP COLUMN "last_used_at";
-- ALTER TABLE "bookmarks" DROP COLUMN "use_count";
-- ALTER TABLE "bookmarks" DROP COLUMN "item_type_guessed";
-- ALTER TABLE "bookmarks" DROP COLUMN "item_type";
-- DROP TYPE "public"."bookmark_item_type";