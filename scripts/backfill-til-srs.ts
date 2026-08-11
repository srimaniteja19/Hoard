import { neon } from "@neondatabase/serverless";

async function backfill() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  // Backfill: set last_reviewed_at = created_at, next_review_at = created_at + 1 day
  const result = await sql`
    UPDATE til_entries
    SET
      last_reviewed_at = created_at,
      next_review_at = created_at + interval '1 day'
    WHERE last_reviewed_at IS NULL
  `;

  console.log("Backfill complete:", result);

  // Verify no nulls remain
  const nullCheck = await sql`
    SELECT count(*) as null_count
    FROM til_entries
    WHERE last_reviewed_at IS NULL OR next_review_at IS NULL
  `;

  console.log("Rows with NULL last_reviewed_at or next_review_at:", nullCheck[0]?.null_count);
}

backfill().catch(console.error);
