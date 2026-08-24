import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
        return trimmed.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
      }
    }
  }
  throw new Error("DATABASE_URL not found in environment or .env.local");
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const sql = neon(databaseUrl);

  console.log("Applying 0016: occurred_on, entities, tags...");
  await sql`ALTER TABLE "scraps" ADD COLUMN IF NOT EXISTS "occurred_on" date`;
  await sql`ALTER TABLE "scraps" ADD COLUMN IF NOT EXISTS "entities" jsonb`;
  await sql`ALTER TABLE "scraps" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb`;
  await sql`UPDATE "scraps" SET "occurred_on" = "logged_for" WHERE "occurred_on" IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS "scraps_user_occurred_on_idx" ON "scraps" ("user_id", "is_buried", "occurred_on" DESC)`;

  console.log("Migration 0016 successfully applied to database!");
}

main().catch((err) => {
  console.error("Failed to apply migration:", err);
  process.exit(1);
});
