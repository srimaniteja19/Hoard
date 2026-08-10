import { db } from "@/db";
import { parseCoverData } from "@/lib/cover-data";
import { cleanTitle } from "@/lib/cleanTitle";
import { bookmarks as bookmarksTable, collections as collectionsTable } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Bookmark, Collection } from "@/types";

// Centralized Data-Access Layer (DAL) enforcing strict userId isolation on every query.

export async function fetchUserBookmarks(userId: string): Promise<Bookmark[]> {
  try {
    const rows = await db
      .select()
      .from(bookmarksTable)
      .where(and(eq(bookmarksTable.userId, userId), isNull(bookmarksTable.deletedAt)));

    const titleMap = new Map<number, string>();
    rows.forEach((r) => titleMap.set(r.id, cleanTitle(r.title, r.url)));

    return rows.map((r) => {
      const d = new Date(r.createdAt);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const whenStr = `${months[d.getMonth()]} ${d.getDate()}`;

      return {
        id: r.id,
        t: cleanTitle(r.title, r.url),
        ty: r.type,
        src: r.source,
        url: r.url,
        mins: r.mins,
        tag: r.tag,
        coll: r.collectionId,
        when: whenStr,
        unread: r.unread,
        ex: (r.extra as Record<string, string>) || {},
        note: r.note || "",
        coverData: parseCoverData((r.extra as Record<string, unknown>)?.coverData),

        parentId: r.parentId,
        parentTitle: r.parentId ? titleMap.get(r.parentId) || null : null,
        startTimeSec: r.startTimeSec,
        chapterIndex: r.chapterIndex,
        archivedText: r.archivedText,
        lastFetchedAt: r.lastFetchedAt ? new Date(r.lastFetchedAt).toISOString() : null,
        driftStatus: (r.driftStatus as unknown as Bookmark["driftStatus"]) || null,
        driftPercent: r.driftPercent,
        clusterId: r.clusterId,
        clusterTitle: r.clusterTitle,
      };
    });
  } catch (err) {
    console.error("Error fetching bookmarks from Neon DB:", err);
    return [];
  }
}

export async function fetchUserCollections(userId: string): Promise<Collection[]> {
  try {
    const rows = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.userId, userId));

    const map = new Map<string, Collection>();
    const topLevel: Collection[] = [];

    rows.forEach((r) => {
      map.set(r.id, {
        id: r.id,
        name: r.name,
        ic: r.icon,
        c: r.color,
        query: r.query,
        kids: [],
      });
    });

    rows.forEach((r) => {
      const item = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId)) {
        const parent = map.get(r.parentId)!;
        parent.kids = parent.kids || [];
        parent.kids.push(item);
      } else {
        topLevel.push(item);
      }
    });

    return topLevel;
  } catch (err) {
    console.error("Error fetching collections from Neon DB:", err);
    return [];
  }
}

export async function createBookmarkInDb(userId: string, bm: Omit<Bookmark, "id" | "when">) {
  try {
    const [inserted] = await db
      .insert(bookmarksTable)
      .values({
        userId,
        title: cleanTitle(bm.t, bm.url),
        type: bm.ty,
        source: bm.src,
        url: bm.url,
        mins: bm.mins,
        tag: bm.tag,
        collectionId: bm.coll,
        unread: bm.unread,
        note: bm.note || "",
        extra: bm.ex || {},

        parentId: bm.parentId ?? null,
        startTimeSec: bm.startTimeSec ?? null,
        chapterIndex: bm.chapterIndex ?? null,
        archivedText: bm.archivedText ?? null,
        driftStatus: bm.driftStatus ?? null,
        driftPercent: bm.driftPercent ?? null,
        clusterId: bm.clusterId ?? null,
        clusterTitle: bm.clusterTitle ?? null,
      })
      .returning();

    return inserted;
  } catch (err) {
    console.error("Error creating bookmark in Neon DB:", err);
    throw err;
  }
}

export async function updateNoteInDb(userId: string, bookmarkId: number, note: string) {
  await db
    .update(bookmarksTable)
    .set({ note, updatedAt: new Date() })
    .where(and(eq(bookmarksTable.id, bookmarkId), eq(bookmarksTable.userId, userId)));
}

export async function toggleReadInDb(userId: string, bookmarkId: number, currentUnread: boolean) {
  await db
    .update(bookmarksTable)
    .set({ unread: !currentUnread, updatedAt: new Date() })
    .where(and(eq(bookmarksTable.id, bookmarkId), eq(bookmarksTable.userId, userId)));
}

export async function changeCollectionInDb(userId: string, bookmarkId: number, collectionId: string) {
  await db
    .update(bookmarksTable)
    .set({ collectionId, updatedAt: new Date() })
    .where(and(eq(bookmarksTable.id, bookmarkId), eq(bookmarksTable.userId, userId)));
}

export async function softDeleteInDb(userId: string, bookmarkId: number) {
  await db
    .update(bookmarksTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(bookmarksTable.id, bookmarkId), eq(bookmarksTable.userId, userId)));
}

export async function exportUserData(userId: string) {
  const bookmarksList = await fetchUserBookmarks(userId);
  const collectionsList = await fetchUserCollections(userId);

  return {
    app: "HOARD",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    userId,
    collections: collectionsList,
    bookmarks: bookmarksList,
  };
}
