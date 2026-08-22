import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookmarkUses, bookmarks, collections, tilEntries } from "@/db/schema";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";
import { getTilStreak } from "@/lib/dal/til";
import { getRecallCard } from "./queries";
import type { KindType } from "@/types";
import {
  displayedReach,
  formatFolioDate,
  formatSaveMonth,
  isUnfiledCollection,
  rankReached,
  resumeCrumb,
  resumePoint,
  shelfDisplayName,
  spineColor,
  ticksFilled,
  tilWhenLabel,
  wearFromCounts,
  type DeskColdItem,
  type DeskReachedItem,
  type DeskResumeItem,
  type DeskShelf,
  type DeskTilItem,
  type HomeDesk,
  REACH_WINDOW_DAYS,
} from "./deskModel";

const MS_PER_DAY = 86_400_000;

function daysAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - n * MS_PER_DAY);
}

async function reachCounts(
  userId: string,
  since: Date,
): Promise<Map<number, number>> {
  try {
    const rows = await db
      .select({
        bookmarkId: bookmarkUses.bookmarkId,
        count: sql<number>`count(*)::int`,
      })
      .from(bookmarkUses)
      .where(and(eq(bookmarkUses.userId, userId), gte(bookmarkUses.usedAt, since)))
      .groupBy(bookmarkUses.bookmarkId);
    return new Map(rows.map((row) => [row.bookmarkId, Number(row.count)]));
  } catch (error) {
    console.error("[home/desk] bookmark_uses unavailable; ranking by recency", error);
    return new Map();
  }
}

export async function getDeskShelves(userId: string): Promise<DeskShelf[]> {
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      color: collections.color,
      count: sql<number>`count(${bookmarks.id})::int`,
    })
    .from(collections)
    .leftJoin(
      bookmarks,
      and(
        eq(bookmarks.collectionId, collections.id),
        eq(bookmarks.userId, userId),
        isNull(bookmarks.deletedAt),
        isNull(bookmarks.parentId),
      ),
    )
    .where(eq(collections.userId, userId))
    .groupBy(collections.id, collections.name, collections.color);

  const shelves = rows
    .map((row) => {
      const unfiled = isUnfiledCollection(row.id, row.name);
      return {
        id: row.id,
        name: shelfDisplayName(row.name, unfiled),
        count: Number(row.count),
        color: row.color,
        unfiled,
      };
    })
    .filter((shelf) => shelf.count > 0)
    .sort((a, b) => {
      if (a.unfiled !== b.unfiled) return a.unfiled ? 1 : -1;
      return b.count - a.count;
    });

  return shelves.map((shelf, index) => ({
    ...shelf,
    color: shelf.unfiled ? "#FFFDF8" : spineColor(shelf.color, index),
  }));
}

export async function getPickedUp(userId: string): Promise<DeskResumeItem[]> {
  const rows = await db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      extra: bookmarks.extra,
      chapterIndex: bookmarks.chapterIndex,
      startTimeSec: bookmarks.startTimeSec,
      useCount: bookmarks.useCount,
      collectionName: collections.name,
    })
    .from(bookmarks)
    .innerJoin(collections, eq(collections.id, bookmarks.collectionId))
    .where(
      and(
        eq(bookmarks.userId, userId),
        isNull(bookmarks.deletedAt),
        isNull(bookmarks.parentId),
      ),
    )
    .orderBy(desc(bookmarks.updatedAt))
    .limit(80);

  const chapterIds = rows
    .map((row) => row.chapterIndex)
    .filter((index): index is number => index != null && index >= 0);

  const chapterTitles = new Map<string, string>();
  if (chapterIds.length > 0) {
    const kids = await db
      .select({
        parentId: bookmarks.parentId,
        title: bookmarks.title,
        chapterIndex: bookmarks.chapterIndex,
      })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          isNull(bookmarks.deletedAt),
          sql`${bookmarks.parentId} is not null`,
        ),
      );
    for (const kid of kids) {
      if (kid.parentId == null || kid.chapterIndex == null) continue;
      chapterTitles.set(`${kid.parentId}:${kid.chapterIndex}`, kid.title);
    }
  }

  const picked: DeskResumeItem[] = [];
  for (const row of rows) {
    const chapterTitle =
      row.chapterIndex != null
        ? (chapterTitles.get(`${row.id}:${row.chapterIndex}`) ?? null)
        : null;
    const point = resumePoint({
      extra: row.extra,
      chapterIndex: row.chapterIndex,
      startTimeSec: row.startTimeSec,
      chapterTitle,
    });
    if (!point) continue;
    const collection = row.collectionName.toUpperCase();
    picked.push({
      id: row.id,
      title: row.title,
      collection,
      crumb: resumeCrumb(collection, point, Number(row.useCount)),
      href: `/session?id=${row.id}`,
      sessions: Number(row.useCount),
    });
    if (picked.length >= 3) break;
  }
  return picked;
}

export async function getMostReached(userId: string, now = new Date()): Promise<DeskReachedItem[]> {
  const since = daysAgo(REACH_WINDOW_DAYS, now);
  const counts = await reachCounts(userId, since);

  const rows = await db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      url: bookmarks.url,
      kind: bookmarks.type,
      useCount: bookmarks.useCount,
      lastUsedAt: bookmarks.lastUsedAt,
      collectionName: collections.name,
    })
    .from(bookmarks)
    .innerJoin(collections, eq(collections.id, bookmarks.collectionId))
    .where(
      and(
        eq(bookmarks.userId, userId),
        isNull(bookmarks.deletedAt),
        isNull(bookmarks.parentId),
        gte(bookmarks.lastUsedAt, since),
      ),
    )
    .limit(80);

  const candidates = rows.map((row) => ({
    ...row,
    kind: row.kind as KindType,
    reach60: counts.get(row.id) ?? 0,
    useCount: Number(row.useCount),
  }));

  const ranked = rankReached(candidates, now);
  const wears = wearFromCounts(ranked.map(displayedReach));

  return ranked.map((row, index) => {
    const reachCount = displayedReach(row);
    const wear = wears[index] ?? 0;
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      kind: row.kind,
      collection: row.collectionName.toUpperCase(),
      reachCount,
      wear,
      ticksFilled: ticksFilled(wear),
    };
  });
}

export async function getColdShelf(
  userId: string,
  timezone: string,
): Promise<{ count: number; items: DeskColdItem[] }> {
  const where = and(
    eq(bookmarks.userId, userId),
    isNull(bookmarks.deletedAt),
    isNull(bookmarks.parentId),
    eq(bookmarks.itemType, "REFERENCE"),
    eq(bookmarks.useCount, 0),
  );

  const [[{ count }], items] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(bookmarks).where(where),
    db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        createdAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .where(where)
      .orderBy(bookmarks.createdAt)
      .limit(3),
  ]);

  return {
    count: Number(count),
    items: items.map((row) => ({
      id: row.id,
      title: row.title,
      month: formatSaveMonth(row.createdAt, timezone),
      href: `/session?id=${row.id}`,
    })),
  };
}

export async function getDeskTilRecent(
  userId: string,
  timezone: string,
): Promise<DeskTilItem[]> {
  const today = getLoggedForDate(timezone);
  const yesterday = getLoggedForDate(timezone, daysAgo(1));
  const rows = await db
    .select({
      id: tilEntries.id,
      body: tilEntries.body,
      loggedFor: tilEntries.loggedFor,
    })
    .from(tilEntries)
    .where(and(eq(tilEntries.userId, userId), isNull(tilEntries.supersededById)))
    .orderBy(desc(tilEntries.loggedFor), desc(tilEntries.createdAt))
    .limit(2);

  return rows.map((row) => ({
    id: row.id,
    body: (row.body ?? "").trim() || "—",
    when: tilWhenLabel(row.loggedFor, today, yesterday),
  }));
}

export async function getDeskCounters(
  userId: string,
  timezone: string,
  neverOpenedCount?: number,
): Promise<HomeDesk["counters"]> {
  const weekAgo = daysAgo(7);
  const start14 = daysAgo(14);
  const start14Str = getLoggedForDate(timezone, start14);

  const [
    [{ inLibrary }],
    [{ addedThisWeek }],
    [{ reachedFor }],
    [{ reachedThisWeekFallback }],
    neverOpenedRow,
    streak,
    tilDays,
  ] = await Promise.all([
    db
      .select({ inLibrary: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt), isNull(bookmarks.parentId))),
    db
      .select({ addedThisWeek: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          isNull(bookmarks.deletedAt),
          isNull(bookmarks.parentId),
          gte(bookmarks.createdAt, weekAgo),
        ),
      ),
    db
      .select({ reachedFor: sql<number>`coalesce(sum(${bookmarks.useCount}), 0)::int` })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt))),
    db
      .select({ reachedThisWeekFallback: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          isNull(bookmarks.deletedAt),
          gte(bookmarks.lastUsedAt, weekAgo),
        ),
      ),
    neverOpenedCount == null
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(bookmarks)
          .where(
            and(
              eq(bookmarks.userId, userId),
              isNull(bookmarks.deletedAt),
              isNull(bookmarks.parentId),
              eq(bookmarks.itemType, "REFERENCE"),
              eq(bookmarks.useCount, 0),
            ),
          )
      : Promise.resolve([{ count: neverOpenedCount }]),
    getTilStreak(userId, timezone),
    db
      .select({ day: tilEntries.loggedFor, count: sql<number>`count(*)::int` })
      .from(tilEntries)
      .where(and(eq(tilEntries.userId, userId), gte(tilEntries.loggedFor, start14Str)))
      .groupBy(tilEntries.loggedFor),
  ]);

  let reachedThisWeek = Number(reachedThisWeekFallback);
  try {
    const [{ eventWeek }] = await db
      .select({ eventWeek: sql<number>`count(*)::int` })
      .from(bookmarkUses)
      .where(and(eq(bookmarkUses.userId, userId), gte(bookmarkUses.usedAt, weekAgo)));
    if (Number(eventWeek) > 0) reachedThisWeek = Number(eventWeek);
  } catch {
    // table not applied yet
  }

  const byDay = new Map(tilDays.map((row) => [row.day, Number(row.count)]));
  const last14: number[] = [];
  for (let i = 13; i >= 0; i--) {
    last14.push(byDay.get(getLoggedForDate(timezone, daysAgo(i))) ?? 0);
  }

  const library = Number(inLibrary);
  const neverOpened = Number(neverOpenedRow[0]?.count ?? 0);
  return {
    inLibrary: library,
    addedThisWeek: Number(addedThisWeek),
    reachedFor: Number(reachedFor),
    reachedThisWeek,
    neverOpened,
    neverOpenedPct: library > 0 ? Math.round((neverOpened / library) * 1000) / 10 : 0,
    tilStreak: streak.currentStreak,
    last14,
  };
}

export async function getHomeDesk(userId: string, now = new Date()): Promise<HomeDesk> {
  const timezone = await getUserTimezone(userId);

  const [shelves, pickedUp, mostReached, coldShelf, tilRecent, recall, counters] = await Promise.all([
    getDeskShelves(userId),
    getPickedUp(userId),
    getMostReached(userId, now),
    getColdShelf(userId, timezone),
    getDeskTilRecent(userId, timezone),
    getRecallCard(userId),
    getDeskCounters(userId, timezone),
  ]);

  return {
    folio: {
      dateLabel: formatFolioDate(now, timezone),
      savedTotal: counters.inLibrary,
      shelfCount: shelves.length,
      neverOpened: coldShelf.count,
    },
    shelves,
    pickedUp,
    mostReached,
    recall: recall
      ? { id: recall.id, hash: recall.hash, text: recall.text, confidence: recall.confidence }
      : null,
    tilRecent,
    coldShelf: {
      count: coldShelf.count,
      percent: counters.neverOpenedPct,
      items: coldShelf.items,
    },
    counters,
  };
}
