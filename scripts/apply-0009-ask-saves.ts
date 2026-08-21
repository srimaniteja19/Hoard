import { neon } from "@neondatabase/serverless";

// One-time application of drizzle/0009_add_ask_saves.sql.
// drizzle-kit migrate/push are blocked here (existing types already applied).
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ask_saves'
  `;

  if (existing) {
    console.log("Already applied — ask_saves table exists. No-op.");
    return;
  }

  console.log("Applying 0009: ask_saves table...");

  await sql`
    CREATE TABLE "ask_saves" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "question" text NOT NULL,
      "answer" text NOT NULL,
      "summary" text NOT NULL DEFAULT '',
      "citations" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "model" text NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE INDEX "ask_saves_user_created_idx" ON "ask_saves" ("user_id", "created_at" DESC)`;

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
