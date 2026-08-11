import { db } from "../src/db";
import { bookmarks } from "../src/db/schema";
import { isNull, and, sql } from "drizzle-orm";

async function backfillExcerptSource() {
  console.log("Backfilling excerpt_source for bookmarks...");

  // Set 'user-note' for non-empty note strings
  const res1 = await db
    .update(bookmarks)
    .set({ excerptSource: "user-note" })
    .where(and(isNull(bookmarks.deletedAt), sql`length(trim(${bookmarks.note})) > 0`))
    .returning({ id: bookmarks.id });

  console.log(`Backfilled ${res1.length} bookmark rows with excerptSource = 'user-note'.`);
}

if (require.main === module) {
  backfillExcerptSource()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
