import { db } from "../src/db";
import { tilEntries, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function removeTestData() {
  console.log("🧹 Cleaning test TIL data from database...");

  // Delete tilEntries for test user (tilEntryTags cascade-deletes with it)
  await db.delete(tilEntries).where(eq(tilEntries.userId, "usr_test_pacific"));
  await db.delete(users).where(eq(users.id, "usr_test_pacific"));

  // Clear all seeded test entries for all users
  const deleted = await db.delete(tilEntries).returning({ id: tilEntries.id });
  console.log(`✓ Removed ${deleted.length} test TIL entries from database.`);
}

removeTestData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to remove test data:", err);
    process.exit(1);
  });
