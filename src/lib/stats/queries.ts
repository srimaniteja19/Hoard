import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  bookmarks,
  bookmarkUses,
  books,
  collections,
  marginalia,
  notebookCollisions,
  notebookCourses,
  notebookLessons,
  notebookModules,
  notebookPages,
  scraps,
  studioIdeas,
  studioPieces,
  tilEntries,
  todos,
} from "@/db/schema";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";
import { getTilStreak } from "@/lib/dal/til";
import {
  computeStatsOverview,
  rangeCutoffDate,
  type StatsBookmarkInput,
  type StatsCollectionInput,
  type StatsNotebookInput,
  type StatsOutputInput,
  type StatsReadingInput,
  type StatsTilInput,
  type StatsUseEventInput,
} from "./computeStats";
import type { StatsOverview, StatsRange } from "./types";

const GRID_DAYS = 98;
const MS_PER_DAY = 86_400_000;

async function fetchBookmarkUses(userId: string, since: Date): Promise<StatsUseEventInput[]> {
  try {
    return await db
      .select({
        bookmarkId: bookmarkUses.bookmarkId,
        usedAt: bookmarkUses.usedAt,
      })
      .from(bookmarkUses)
      .where(and(eq(bookmarkUses.userId, userId), gte(bookmarkUses.usedAt, since)));
  } catch (err) {
    console.error("[stats] bookmark_uses query failed; falling back to bookmark metadata", err);
    return [];
  }
}

async function fetchNotebookStats(userId: string): Promise<StatsNotebookInput> {
  const [courseRows, collisionRows] = await Promise.all([
    db
      .select({ id: notebookCourses.id, archivedAt: notebookCourses.archivedAt })
      .from(notebookCourses)
      .where(eq(notebookCourses.userId, userId)),
    db
      .select({ id: notebookCollisions.id })
      .from(notebookCollisions)
      .where(eq(notebookCollisions.userId, userId)),
  ]);

  const activeCourses = courseRows.filter((c) => !c.archivedAt);
  if (activeCourses.length === 0) {
    return {
      courses: 0,
      lessons: 0,
      writtenLessons: 0,
      stubLessons: 0,
      watchedUnwrittenLessons: 0,
      unstartedLessons: 0,
      totalWords: 0,
      collisions: collisionRows.length,
    };
  }

  const lessonRows = await db
    .select({
      lessonId: notebookLessons.id,
      watchedAt: notebookLessons.watchedAt,
      wordCount: notebookPages.wordCount,
    })
    .from(notebookLessons)
    .innerJoin(notebookModules, eq(notebookLessons.moduleId, notebookModules.id))
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .leftJoin(notebookPages, eq(notebookPages.lessonId, notebookLessons.id))
    .where(and(eq(notebookCourses.userId, userId), isNull(notebookCourses.archivedAt)));

  let writtenLessons = 0;
  let stubLessons = 0;
  let watchedUnwrittenLessons = 0;
  let unstartedLessons = 0;
  let totalWords = 0;

  for (const row of lessonRows) {
    const wc = Math.max(0, Number(row.wordCount) || 0);
    totalWords += wc;
    if (wc >= 120) {
      writtenLessons++;
    } else if (wc > 0) {
      stubLessons++;
    } else if (row.watchedAt) {
      watchedUnwrittenLessons++;
    } else {
      unstartedLessons++;
    }
  }

  return {
    courses: activeCourses.length,
    lessons: lessonRows.length,
    writtenLessons,
    stubLessons,
    watchedUnwrittenLessons,
    unstartedLessons,
    totalWords,
    collisions: collisionRows.length,
  };
}

async function fetchReadingStats(userId: string): Promise<StatsReadingInput> {
  const [bookRows, markRows] = await Promise.all([
    db.select({ status: books.status }).from(books).where(eq(books.userId, userId)),
    db.select({ promotedTo: marginalia.promotedTo }).from(marginalia).where(eq(marginalia.userId, userId)),
  ]);

  let booksReading = 0;
  let booksCompleted = 0;
  for (const b of bookRows) {
    const s = (b.status || "").toUpperCase();
    if (s === "COMPLETED" || s === "FINISHED") booksCompleted++;
    else if (s === "READING") booksReading++;
  }

  const marginaliaPromotedCount = markRows.filter((m) => Boolean(m.promotedTo)).length;

  return {
    booksTotal: bookRows.length,
    booksReading,
    booksCompleted,
    marginaliaCount: markRows.length,
    marginaliaPromotedCount,
  };
}

async function fetchOutputStats(
  userId: string,
  rangeCutoffDay: string | null
): Promise<StatsOutputInput> {
  const [todoRows, pieceRows, ideaRows, scrapRows] = await Promise.all([
    db
      .select({
        state: todos.state,
        completedOn: todos.completedOn,
        actualMinutes: todos.actualMinutes,
      })
      .from(todos)
      .where(eq(todos.userId, userId)),
    db
      .select({ status: studioPieces.status })
      .from(studioPieces)
      .where(eq(studioPieces.userId, userId)),
    db
      .select({ status: studioIdeas.status })
      .from(studioIdeas)
      .where(eq(studioIdeas.userId, userId)),
    db
      .select({ isBuried: scraps.isBuried })
      .from(scraps)
      .where(eq(scraps.userId, userId)),
  ]);

  let todosDoneInRange = 0;
  let todosOpen = 0;
  let focusMinutesInRange = 0;
  for (const t of todoRows) {
    if (t.state === "OPEN") {
      todosOpen++;
    } else if (t.state === "DONE") {
      const inRange = !rangeCutoffDay || (t.completedOn != null && t.completedOn >= rangeCutoffDay);
      if (inRange) {
        todosDoneInRange++;
        if (typeof t.actualMinutes === "number" && t.actualMinutes > 0) {
          focusMinutesInRange += t.actualMinutes;
        }
      }
    }
  }

  let studioInFlight = 0;
  let studioReady = 0;
  let studioPosted = 0;
  for (const p of pieceRows) {
    if (p.status === "ready") studioReady++;
    else if (p.status === "posted") studioPosted++;
    else studioInFlight++;
  }

  const studioIdeasOpen = ideaRows.filter((i) => i.status === "new").length;
  const scratchOpen = scrapRows.filter((s) => !s.isBuried).length;

  return {
    todosDoneInRange,
    todosOpen,
    focusMinutesInRange,
    studioTotalPieces: pieceRows.length,
    studioInFlight,
    studioReady,
    studioPosted,
    studioIdeasOpen,
    scratchOpen,
    scratchTotal: scrapRows.length,
  };
}

export async function getStatsOverview(
  userId: string,
  range: StatsRange = "90d",
  now: Date = new Date()
): Promise<StatsOverview> {
  const timezone = await getUserTimezone(userId);
  const cutoff = rangeCutoffDate(range, now);
  const cutoffDay = cutoff ? getLoggedForDate(timezone, cutoff) : null;

  // Fetch useEvents covering at least the 98-day activity grid OR the selected range.
  const gridSince = new Date(now.getTime() - GRID_DAYS * MS_PER_DAY);
  const useSince =
    range === "all"
      ? new Date(0)
      : cutoff && cutoff < gridSince
        ? cutoff
        : gridSince;

  const [
    bookmarkRows,
    collectionRows,
    tilRows,
    useEvents,
    streak,
    notebooks,
    reading,
    output,
  ] = await Promise.all([
    db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        type: bookmarks.type,
        source: bookmarks.source,
        url: bookmarks.url,
        mins: bookmarks.mins,
        collectionId: bookmarks.collectionId,
        unread: bookmarks.unread,
        itemType: bookmarks.itemType,
        useCount: bookmarks.useCount,
        lastUsedAt: bookmarks.lastUsedAt,
        parentId: bookmarks.parentId,
        deletedAt: bookmarks.deletedAt,
        createdAt: bookmarks.createdAt,
        updatedAt: bookmarks.updatedAt,
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt))),
    db
      .select({
        id: collections.id,
        name: collections.name,
        color: collections.color,
      })
      .from(collections)
      .where(eq(collections.userId, userId)),
    db
      .select({
        id: tilEntries.id,
        type: tilEntries.type,
        loggedFor: tilEntries.loggedFor,
        dischargesBookmarkId: tilEntries.dischargesBookmarkId,
        supersededById: tilEntries.supersededById,
        createdAt: tilEntries.createdAt,
      })
      .from(tilEntries)
      .where(eq(tilEntries.userId, userId)),
    fetchBookmarkUses(userId, useSince),
    getTilStreak(userId, timezone),
    fetchNotebookStats(userId),
    fetchReadingStats(userId),
    fetchOutputStats(userId, cutoffDay),
  ]);

  const mappedBookmarks: StatsBookmarkInput[] = bookmarkRows.map((b) => ({
    ...b,
    itemType: b.itemType === "QUEUED" ? "QUEUED" : "REFERENCE",
  }));

  const mappedCollections: StatsCollectionInput[] = collectionRows;
  const mappedTils: StatsTilInput[] = tilRows;

  return computeStatsOverview({
    range,
    timezone,
    now,
    bookmarks: mappedBookmarks,
    collections: mappedCollections,
    tils: mappedTils,
    useEvents,
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      streakAtRisk: streak.streakAtRisk,
      skipsUsedThisMonth: streak.skipsUsedThisMonth,
    },
    notebooks,
    reading,
    output,
  });
}
