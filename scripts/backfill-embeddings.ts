import { isNull } from "drizzle-orm";
import { db } from "../src/db";
import { bookmarks, tilEntries } from "../src/db/schema";
import { upsertBookmarkEmbedding, upsertTilEmbedding } from "../src/lib/embeddings/upsertBookmarkEmbedding";

async function main() {
  const bookmarkRows = await db
    .select({
      id: bookmarks.id,
      userId: bookmarks.userId,
      title: bookmarks.title,
      note: bookmarks.note,
      archivedText: bookmarks.archivedText,
    })
    .from(bookmarks)
    .where(isNull(bookmarks.deletedAt));

  console.log(`Backfilling embeddings for ${bookmarkRows.length} bookmark(s)...`);
  let i = 0;
  for (const row of bookmarkRows) {
    await upsertBookmarkEmbedding(row);
    i++;
    if (i % 10 === 0 || i === bookmarkRows.length) {
      console.log(`  bookmarks ${i}/${bookmarkRows.length}`);
    }
  }

  const tilRows = await db
    .select({
      id: tilEntries.id,
      userId: tilEntries.userId,
      body: tilEntries.body,
      code: tilEntries.code,
      linkUrl: tilEntries.linkUrl,
    })
    .from(tilEntries);

  console.log(`Backfilling embeddings for ${tilRows.length} TIL(s)...`);
  i = 0;
  for (const row of tilRows) {
    await upsertTilEmbedding(row);
    i++;
    if (i % 10 === 0 || i === tilRows.length) {
      console.log(`  tils ${i}/${tilRows.length}`);
    }
  }

  console.log("Done. Rows whose hash was unchanged or whose embed failed were skipped.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
