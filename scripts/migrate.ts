import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const db = drizzle(neon(databaseUrl));
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migrations applied.");
}

main().catch(console.error);
