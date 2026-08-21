import { neon } from "@neondatabase/serverless";

// One-time application of drizzle/0010_add_ask_threads.sql.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ask_threads'
  `;

  if (existing) {
    console.log("Already applied — ask_threads table exists. No-op.");
    return;
  }

  console.log("Applying 0010: ask_threads table...");

  await sql`
    CREATE TABLE "ask_threads" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "title" text NOT NULL DEFAULT '',
      "model" text NOT NULL DEFAULT '',
      "web" boolean NOT NULL DEFAULT false,
      "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE INDEX "ask_threads_user_updated_idx" ON "ask_threads" ("user_id", "updated_at" DESC)`;

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
