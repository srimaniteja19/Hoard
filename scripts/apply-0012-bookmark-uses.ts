import { neon } from "@neondatabase/serverless";

// One-time application of drizzle/0012_add_bookmark_uses.sql.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookmark_uses'
  `;

  if (existing) {
    console.log("Already applied — bookmark_uses exists. No-op.");
    return;
  }

  console.log("Applying 0012: bookmark_uses...");
  await sql`
    CREATE TABLE "bookmark_uses" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "bookmark_id" integer NOT NULL REFERENCES "bookmarks"("id") ON DELETE CASCADE,
      "used_at" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX "bookmark_uses_user_used_idx" ON "bookmark_uses" ("user_id", "used_at")`;
  await sql`CREATE INDEX "bookmark_uses_bookmark_used_idx" ON "bookmark_uses" ("bookmark_id", "used_at")`;
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
