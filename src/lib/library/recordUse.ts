import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";

const DEBOUNCE_MS = 60_000;

// A "use" is opening a bookmark's source URL, or a TIL entry discharging it
// (LIBRARY.md §2). Debounce is folded into the WHERE clause rather than an
// in-memory cache — this app runs on Vercel serverless, where an in-memory
// map only debounces within one warm instance and silently under-counts
// once traffic spreads across instances.
export async function recordUse(bookmarkId: number, userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - DEBOUNCE_MS);
  await db
    .update(bookmarks)
    .set({ useCount: sql`${bookmarks.useCount} + 1`, lastUsedAt: new Date() })
    .where(
      and(
        eq(bookmarks.id, bookmarkId),
        eq(bookmarks.userId, userId),
        or(isNull(bookmarks.lastUsedAt), lt(bookmarks.lastUsedAt, cutoff))
      )
    );
}
