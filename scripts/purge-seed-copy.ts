import { db } from "../src/db";
import { bookmarks } from "../src/db/schema";
import { or, like } from "drizzle-orm";

export const KNOWN_SEED_STRINGS = [
  "Tools and apps skip the reading queue and land on a shelf you check when setting up a machine.",
  "Stars and last-commit refresh on a schedule, so an abandoned repo tells you it's abandoned.",
  "Full text is archived at save time so the article outlives the site.",
  "Playlists never enter the unread queue. They're ambient, not debt.",
  "Chapters are stored too — a 2-hour video can still surface in a 20-minute slot as one chapter.",
  "The PDF is mirrored locally, so link rot is not your problem.",
  "Docs are reference, never unread. You don't owe a docs page a read-through.",
];

async function purgeSeedCopy() {
  console.log("Purging design document seed sentences from bookmarks database...");

  const clauses = KNOWN_SEED_STRINGS.map((str) => like(bookmarks.note, `%${str}%`));

  const result = await db
    .update(bookmarks)
    .set({ note: "" })
    .where(or(...clauses))
    .returning({ id: bookmarks.id, note: bookmarks.note });

  console.log(`Successfully purged seed copy from ${result.length} bookmark rows.`);
}

if (require.main === module) {
  purgeSeedCopy().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
