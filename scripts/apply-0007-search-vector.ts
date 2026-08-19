import { neon } from "@neondatabase/serverless";

// One-time application of drizzle/0007_add_bookmark_search_vector.sql,
// run directly for the same reason as scripts/apply-0006-item-type-usage.ts
// (drizzle-kit migrate/push both blocked in this environment).
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'bookmarks' AND column_name = 'search_vector'
  `;

  if (existing) {
    console.log("Already applied — bookmarks.search_vector exists. No-op.");
    return;
  }

  console.log("Applying 0007: search_vector generated column + GIN index...");

  await sql`
    CREATE FUNCTION bookmark_search_vector_immutable(title text, archived_text text)
    RETURNS tsvector
    LANGUAGE sql IMMUTABLE
    AS $fn$
      SELECT
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(archived_text, '')), 'B')
    $fn$
  `;

  await sql`
    ALTER TABLE "bookmarks" ADD COLUMN "search_vector" tsvector
      GENERATED ALWAYS AS (bookmark_search_vector_immutable(title, archived_text)) STORED
  `;

  await sql`CREATE INDEX "bookmark_search_vector_idx" ON "bookmarks" USING GIN ("search_vector")`;

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
