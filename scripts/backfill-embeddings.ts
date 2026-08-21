import { isNull } from "drizzle-orm";
import { db } from "../src/db";
import { bookmarks } from "../src/db/schema";
import { upsertBookmarkEmbedding } from "../src/lib/embeddings/upsertBookmarkEmbedding";

async function main() {
  const rows = await db
    .select({
      id: bookmarks.id,
      userId: bookmarks.userId,
      title: bookmarks.title,
      note: bookmarks.note,
      archivedText: bookmarks.archivedText,
    })
    .from(bookmarks)
    .where(isNull(bookmarks.deletedAt));

  console.log(`Backfilling embeddings for ${rows.length} bookmark(s)...`);
  let i = 0;
  for (const row of rows) {
    await upsertBookmarkEmbedding(row);
    i++;
    if (i % 10 === 0 || i === rows.length) {
      console.log(`  ${i}/${rows.length}`);
    }
  }
  console.log("Done. Rows whose hash was unchanged or whose embed failed were skipped.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
