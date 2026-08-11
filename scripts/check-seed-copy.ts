import { db } from "../src/db";
import { bookmarks } from "../src/db/schema";
import { or, like, isNull, and } from "drizzle-orm";
import { KNOWN_SEED_STRINGS } from "./purge-seed-copy";

/**
 * CI check script: Fails with exit code 1 if any design-doc seed string appears in bookmark data.
 */
export async function checkSeedCopy() {
  console.log("Checking database for forbidden design-doc seed copy strings...");

  const clauses = KNOWN_SEED_STRINGS.map((str) => like(bookmarks.note, `%${str}%`));

  const violations = await db
    .select({ id: bookmarks.id, title: bookmarks.title, note: bookmarks.note })
    .from(bookmarks)
    .where(and(isNull(bookmarks.deletedAt), or(...clauses)));

  if (violations.length > 0) {
    console.error(`❌ CI CHECK FAILED: Found ${violations.length} active bookmark(s) containing forbidden seed copy strings:`);
    violations.forEach((v) => {
      console.error(`   - Bookmark #${v.id} ("${v.title}"): "${v.note}"`);
    });
    process.exit(1);
  }

  console.log("✅ CI CHECK PASSED: Zero forbidden seed copy strings found in bookmark data.");
}

if (require.main === module) {
  checkSeedCopy().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
