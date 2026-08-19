import { neon } from "@neondatabase/serverless";

// One-time application of drizzle/0006_add_bookmark_item_type_and_usage.sql,
// run directly (not via drizzle-kit migrate/push — see LIBRARY.md Phase 4 plan
// for why both were blocked in this environment). Guarded so re-running is a
// safe no-op instead of re-flipping user-corrected item_type_guessed rows.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'bookmarks' AND column_name = 'item_type'
  `;

  if (existing) {
    console.log("Already applied — bookmarks.item_type exists. No-op.");
    return;
  }

  console.log("Applying 0006: item_type / item_type_guessed / use_count / last_used_at...");

  await sql`CREATE TYPE "bookmark_item_type" AS ENUM('REFERENCE', 'QUEUED')`;
  await sql`ALTER TABLE "bookmarks" ADD COLUMN "item_type" "bookmark_item_type" DEFAULT 'REFERENCE' NOT NULL`;
  await sql`ALTER TABLE "bookmarks" ADD COLUMN "item_type_guessed" boolean DEFAULT false NOT NULL`;
  await sql`ALTER TABLE "bookmarks" ADD COLUMN "use_count" integer DEFAULT 0 NOT NULL`;
  await sql`ALTER TABLE "bookmarks" ADD COLUMN "last_used_at" timestamp with time zone`;
  await sql`CREATE INDEX "user_use_count_idx" ON "bookmarks" USING btree ("user_id","use_count")`;
  await sql`CREATE INDEX "user_last_used_idx" ON "bookmarks" USING btree ("user_id","last_used_at")`;

  await sql`
    UPDATE "bookmarks"
    SET
      "item_type" = CASE
        WHEN "type" IN ('ART', 'VID', 'PPR') THEN 'QUEUED'::"bookmark_item_type"
        ELSE 'REFERENCE'::"bookmark_item_type"
      END,
      "item_type_guessed" = true
  `;

  const [{ count }] = await sql`SELECT count(*) FROM "bookmarks"` as unknown as [{ count: string }];
  console.log(`Done. Backfilled item_type on ${count} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
