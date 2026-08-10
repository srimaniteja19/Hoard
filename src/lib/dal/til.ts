import { db } from "@/db";
import { tilEntries, users } from "@/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import crypto from "crypto";

/**
 * Computes YYYY-MM-DD date string in the user's IANA timezone.
 * Defaults to UTC if invalid or missing timezone.
 */
export function getLoggedForDate(timezone: string = "UTC", dateInput: Date = new Date()): string {
  const d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d); // Returns YYYY-MM-DD
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

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

/**
 * Returns user's IANA timezone setting from DB (defaults to UTC).
 */
export async function getUserTimezone(userId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.timezone || "UTC";
}

export type HeatmapData = {
  [dateStr: string]: number; // "YYYY-MM-DD" -> count
};

/**
 * Single grouped query for 26 weeks (182 days) of TIL entry counts.
 */
export async function getTilHeatmap(userId: string, timezone: string = "UTC"): Promise<HeatmapData> {
  const todayStr = getLoggedForDate(timezone, new Date());
  
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

  return {
    currentStreak,
    longestStreak,
    streakAtRisk,
    skipsUsedThisMonth,
  };
}
