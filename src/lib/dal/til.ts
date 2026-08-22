import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable, TilType } from "@/db/schema";
import { eq, and, sql, gte, lte, desc, inArray } from "drizzle-orm";
import crypto from "crypto";
import { getLoggedForDate, getUserTimezone } from "./shared";

export { getLoggedForDate, getUserTimezone };

/**
 * Generates a unique 4-character hex display hash for a user (e.g. "a3f9").
 * Retries on collision up to 10 times.
 */
export async function generateShortHash(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const hash = crypto.randomBytes(2).toString("hex"); // 4 hex chars
    const existing = await db
      .select({ id: tilEntries.id })
      .from(tilEntries)
      .where(and(eq(tilEntries.userId, userId), eq(tilEntries.shortHash, hash)))
      .limit(1);

    if (existing.length === 0) {
      return hash;
    }
  }
  // Fallback if 10 collisions in a row
  return crypto.randomBytes(3).toString("hex").slice(0, 4);
}

export type HeatmapData = {
  [dateStr: string]: number; // "YYYY-MM-DD" -> count
};

/**
 * Single grouped query for 26 weeks (182 days) of TIL entry counts.
 */
export async function getTilHeatmap(userId: string, timezone: string = "UTC"): Promise<HeatmapData> {
  // Calculate date 182 days ago
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 182);
  const startDateStr = getLoggedForDate(timezone, startDate);

  const rows = await db
    .select({
      day: tilEntries.loggedFor,
      count: sql<number>`count(*)::int`,
    })
    .from(tilEntries)
    .where(
      and(
        eq(tilEntries.userId, userId),
        gte(tilEntries.loggedFor, startDateStr)
      )
    )
    .groupBy(tilEntries.loggedFor);

  const heatmap: HeatmapData = {};
  for (const row of rows) {
    if (row.day) {
      heatmap[row.day] = row.count;
    }
  }

  return heatmap;
}

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  streakAtRisk: boolean;
  skipsUsedThisMonth: number;
  totalCount?: number;
  needsTendingCount?: number;
};

/**
 * Calculates current streak, longest streak, and streakAtRisk flag.
 * Incorporates a skip-day allowance: max 2 per calendar month preserve the streak.
 */
export async function getTilStreak(userId: string, timezone: string = "UTC"): Promise<StreakData> {
  const rows = await db
    .select({ day: tilEntries.loggedFor })
    .from(tilEntries)
    .where(eq(tilEntries.userId, userId))
    .orderBy(desc(tilEntries.loggedFor));

  const activeDaysSet = new Set(rows.map((r) => r.day));

  const todayStr = getLoggedForDate(timezone, new Date());
  
  // Helper to subtract days in timezone
  const getPastDateStr = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return getLoggedForDate(timezone, d);
  };

  const hasLoggedToday = activeDaysSet.has(todayStr);
  const streakAtRisk = !hasLoggedToday;

  // Track skip days used per YYYY-MM month
  const skipsByMonth: Record<string, number> = {};

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  // Determine starting point for current streak check
  let startOffset = hasLoggedToday ? 0 : 1;

  // Check if yesterday or today is present to keep current streak alive
  const yesterdayStr = getPastDateStr(1);
  const canContinueCurrent = hasLoggedToday || activeDaysSet.has(yesterdayStr);

  if (!canContinueCurrent) {
    // Current streak might be broken unless saved by a skip-day on yesterday
    const yesterdayMonth = yesterdayStr.slice(0, 7);
    skipsByMonth[yesterdayMonth] = (skipsByMonth[yesterdayMonth] || 0) + 1;
    if (skipsByMonth[yesterdayMonth] <= 2) {
      // Skip day allowed for yesterday
      startOffset = 2; // resume checking from 2 days ago
    } else {
      currentStreak = 0;
    }
  }

  // Calculate current streak walking backward day by day
  let i = startOffset;
  let currentActive = true;

  while (i < 365 * 2) {
    const dateStr = getPastDateStr(i);
    if (activeDaysSet.has(dateStr)) {
      if (currentActive) currentStreak++;
      runningStreak++;
    } else {
      const monthStr = dateStr.slice(0, 7);
      const used = (skipsByMonth[monthStr] || 0) + 1;
      if (used <= 2) {
        skipsByMonth[monthStr] = used;
        // Skip day preserves streak, but doesn't add to count
      } else {
        if (currentActive) currentActive = false;
        runningStreak = 0;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
    i++;
    // Stop scanning after long gap
    if (!currentActive && i > 365) break;
  }

  const currentMonthStr = todayStr.slice(0, 7);
  const skipsUsedThisMonth = skipsByMonth[currentMonthStr] || 0;

  const totalCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tilEntries)
    .where(eq(tilEntries.userId, userId));
  const totalCount = totalCountResult[0]?.count ?? 0;

  const now = new Date();
  const tendingResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tilEntries)
    .where(
      and(
        eq(tilEntries.userId, userId),
        sql`(${tilEntries.nextReviewAt} IS NOT NULL AND ${tilEntries.nextReviewAt} <= ${now}) OR ${tilEntries.stability} < 1.5`
      )
    );
  const needsTendingCount = tendingResult[0]?.count ?? 0;

  return {
    currentStreak,
    longestStreak,
    streakAtRisk,
    skipsUsedThisMonth,
    totalCount,
    needsTendingCount,
  };
}

export type OnThisDayResult = {
  entry: typeof tilEntries.$inferSelect;
  daysAgo: number;
} | null;

/**
 * Resurfaces one TIL entry from 30, 90, or 365 days ago in the user's timezone.
 */
export async function getOnThisDayEntry(
  userId: string,
  timezone: string = "UTC"
): Promise<OnThisDayResult> {
  const milestones = [30, 90, 365];

  for (const daysAgo of milestones) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const targetDateStr = getLoggedForDate(timezone, targetDate);

    const rows = await db
      .select()
      .from(tilEntries)
      .where(and(eq(tilEntries.userId, userId), eq(tilEntries.loggedFor, targetDateStr)))
      .limit(1);

    if (rows.length > 0) {
      return {
        entry: rows[0],
        daysAgo,
      };
    }
  }

  return null;
}

/**
 * Fetches tag names for a set of TIL entry IDs in one batch query (no N+1).
 * Shared by every route that needs to attach tags to a list of entries.
 */
export async function getTagsForTilEntries(tilIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (tilIds.length === 0) return map;

  const rows = await db
    .select({
      tilId: tilEntryTags.tilId,
      tagName: tagsTable.name,
    })
    .from(tilEntryTags)
    .innerJoin(tagsTable, eq(tilEntryTags.tagId, tagsTable.id))
    .where(inArray(tilEntryTags.tilId, tilIds));

  for (const row of rows) {
    const list = map.get(row.tilId) || [];
    list.push(row.tagName);
    map.set(row.tilId, list);
  }

  return map;
}

export interface WallDayAggregate {
  loggedFor: string;
  count: number;
  dominantType: TilType;
}

const WALL_ROLLING_DAYS = 364;

/**
 * One row per active day over a rolling year: count and the most common TIL
 * type that day (via Postgres's mode() ordered-set aggregate). This is the
 * entire data cost of rendering the Year Wall in `rhythm`/`composition` mode —
 * no entry bodies are fetched here (SPECTACLE.md §2).
 */
export async function getTilWallAggregate(userId: string, timezone: string = "UTC"): Promise<WallDayAggregate[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - WALL_ROLLING_DAYS);
  const startDateStr = getLoggedForDate(timezone, startDate);

  const rows = await db
    .select({
      day: tilEntries.loggedFor,
      count: sql<number>`count(*)::int`,
      dominantType: sql<TilType>`mode() within group (order by ${tilEntries.type})`,
    })
    .from(tilEntries)
    .where(and(eq(tilEntries.userId, userId), gte(tilEntries.loggedFor, startDateStr)))
    .groupBy(tilEntries.loggedFor);

  return rows
    .filter((r): r is { day: string; count: number; dominantType: TilType } => !!r.day)
    .map((r) => ({ loggedFor: r.day, count: r.count, dominantType: r.dominantType }));
}

/**
 * Full TIL entries (bodies included) for a date range — used only by the
 * Wall's `content`-mode viewport fetch, never for rhythm/composition mode.
 */
export async function getTilEntriesByDateRange(userId: string, from: string, to: string) {
  const rows = await db
    .select()
    .from(tilEntries)
    .where(and(eq(tilEntries.userId, userId), gte(tilEntries.loggedFor, from), lte(tilEntries.loggedFor, to)))
    .orderBy(tilEntries.loggedFor);

  const tilIds = rows.map((r) => r.id);
  const tagMap = await getTagsForTilEntries(tilIds);

  return rows.map((r) => ({
    ...r,
    tags: tagMap.get(r.id) || [],
  }));
}
