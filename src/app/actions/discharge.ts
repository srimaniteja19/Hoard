"use server";

/**
 * Discharge (SPECTACLE.md §4): turns a queued bookmark into the TIL entry it
 * produced. The write MUST be atomic — a partial success (bookmark marked
 * read with no entry to show for it) is explicitly called out in the spec as
 * the worst possible outcome.
 *
 * This calls Drizzle directly rather than going through the existing
 * Server Action → fetch-own-REST-API pattern used by src/app/actions/til.ts.
 * That's a deliberate, called-out deviation (see the Phase 6 plan): the only
 * way to keep the insert + bookmark update genuinely atomic on this driver is
 * db.batch() (drizzle-orm/neon-http has no db.transaction() support — see
 * lib comments elsewhere in this repo), and duplicating batch logic behind a
 * fetch hop would just move the same code, not simplify anything.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable, bookmarks, tilTypeValues } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/session";
import { generateShortHash, getUserTimezone, getLoggedForDate } from "@/lib/dal/til";
import { recordUse } from "@/lib/library/recordUse";
import { scheduleTilEmbedding } from "@/lib/embeddings/upsertBookmarkEmbedding";

const dischargeSchema = z.object({
  bookmarkId: z.number().int().positive(),
  type: z.enum(tilTypeValues).default("FACT"),
  body: z.string().trim().min(1, "Say what you learned").max(4000),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
});

export type DischargeInput = z.infer<typeof dischargeSchema>;

export interface DischargeResult {
  til: {
    id: string;
    shortHash: string;
    type: string;
    body: string | null;
    dischargesBookmarkId: number | null;
    loggedFor: string;
    createdAt: string;
    tags: string[];
  };
}

export async function dischargeBookmarkAction(input: DischargeInput): Promise<DischargeResult> {
  const userId = await requireUserId();
  const data = dischargeSchema.parse(input);

  const [bookmark] = await db
    .select({ id: bookmarks.id, unread: bookmarks.unread })
    .from(bookmarks)
    .where(and(eq(bookmarks.id, data.bookmarkId), eq(bookmarks.userId, userId)))
    .limit(1);

  if (!bookmark) {
    throw new Error("Bookmark not found");
  }

  const timezone = await getUserTimezone(userId);
  const loggedFor = getLoggedForDate(timezone);
  const shortHash = await generateShortHash(userId);
  const now = new Date();

  const [insertedRows] = await db.batch([
    db
      .insert(tilEntries)
      .values({
        userId,
        shortHash,
        type: data.type,
        body: data.body,
        dischargesBookmarkId: data.bookmarkId,
        loggedFor,
        lastReviewedAt: now,
        nextReviewAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      })
      .returning(),
    db
      .update(bookmarks)
      .set({ unread: false, updatedAt: now })
      .where(and(eq(bookmarks.id, data.bookmarkId), eq(bookmarks.userId, userId))),
  ]);

  const inserted = insertedRows[0];
  scheduleTilEmbedding(inserted);

  // A TIL entry citing this bookmark is itself a "use" (LIBRARY.md §2) —
  // doesn't need the same atomicity as the batch above, this is informational.
  await recordUse(data.bookmarkId, userId);

  const tagNames: string[] = [];
  for (const rawTag of data.tags) {
    const tagName = rawTag.trim().toLowerCase();
    if (!tagName) continue;

    let tagId: number;
    const [existing] = await db
      .select({ id: tagsTable.id })
      .from(tagsTable)
      .where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, tagName)));

    if (existing) {
      tagId = existing.id;
    } else {
      const [newTag] = await db
        .insert(tagsTable)
        .values({ userId, name: tagName, color: "#00F0FF" })
        .returning({ id: tagsTable.id });
      tagId = newTag.id;
    }

    await db.insert(tilEntryTags).values({ tilId: inserted.id, tagId }).onConflictDoNothing();
    tagNames.push(tagName);
  }

  revalidatePath("/");
  revalidatePath("/til");
  revalidatePath("/stats");

  return {
    til: {
      id: inserted.id,
      shortHash: inserted.shortHash,
      type: inserted.type,
      body: inserted.body,
      dischargesBookmarkId: inserted.dischargesBookmarkId,
      loggedFor: inserted.loggedFor,
      createdAt: inserted.createdAt.toISOString(),
      tags: tagNames,
    },
  };
}
