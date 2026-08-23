import { neon } from "@neondatabase/serverless";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'scrap_assets'
  `;

  if (existing) {
    console.log("Already applied — scrap_assets table exists. No-op.");
    return;
  }

  console.log("Applying 0015: scrap_assets...");
  await sql`
    CREATE TABLE IF NOT EXISTS "scrap_assets" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "scrap_id" text REFERENCES "scraps"("id") ON DELETE SET NULL,
      "filename" varchar(255) NOT NULL,
      "mime_type" varchar(100) NOT NULL,
      "data" text NOT NULL,
      "size_bytes" integer NOT NULL,
      "width" integer,
      "height" integer,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "scrap_assets_user_created_idx" ON "scrap_assets" ("user_id", "created_at" DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS "scrap_assets_scrap_id_idx" ON "scrap_assets" ("scrap_id")`;
  console.log("Done applying scrap_assets table.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
