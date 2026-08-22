import { neon } from "@neondatabase/serverless";

// One-time application of drizzle/0011_add_ask_save_title.sql.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ask_saves' AND column_name = 'title'
  `;

  if (existing) {
    console.log("Already applied — ask_saves.title exists. No-op.");
    return;
  }

  console.log("Applying 0011: ask_saves.title...");
  await sql`ALTER TABLE "ask_saves" ADD COLUMN "title" text NOT NULL DEFAULT ''`;
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
