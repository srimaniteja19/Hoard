import { db } from "@/db";
import { scratchPostcards, scraps, ScratchPostcardRow, NewScratchPostcardRow } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function getSavedPostcard(
  userId: string,
  weekStart: string
): Promise<ScratchPostcardRow | null> {
  const [row] = await db
    .select()
    .from(scratchPostcards)
    .where(and(eq(scratchPostcards.userId, userId), eq(scratchPostcards.weekStart, weekStart)))
    .limit(1);
  return row || null;
}

export async function savePostcard(data: NewScratchPostcardRow): Promise<ScratchPostcardRow> {
  const [created] = await db.insert(scratchPostcards).values(data).returning();
  return created;
}

export async function getWeekScraps(userId: string, weekStart: string, weekEnd: string) {
  return db
    .select()
    .from(scraps)
    .where(
      and(
        eq(scraps.userId, userId),
        eq(scraps.isBuried, false),
        gte(scraps.loggedFor, weekStart),
        lte(scraps.loggedFor, weekEnd)
      )
    );
}

export async function getWeekTotal(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scraps)
    .where(
      and(
        eq(scraps.userId, userId),
        eq(scraps.isBuried, false),
        gte(scraps.loggedFor, weekStart),
        lte(scraps.loggedFor, weekEnd)
      )
    );
  return row?.count || 0;
}

/**
 * Consecutive-day streak ending at (or before) asOfDate, capped to
 * lookbackDays of history — 60 matches the horizon getScratchStats's
 * compost logic already treats as meaningful.
 */
export async function getCurrentStreak(
  userId: string,
  asOfDate: string,
  lookbackDays = 60
): Promise<number> {
  const asOf = new Date(asOfDate + "T12:00:00");
  const start = new Date(asOf);
  start.setDate(start.getDate() - lookbackDays);
  const startIso = start.toISOString().slice(0, 10);

  const rows = await db
    .select({ loggedFor: scraps.loggedFor })
    .from(scraps)
    .where(
      and(
        eq(scraps.userId, userId),
        eq(scraps.isBuried, false),
        gte(scraps.loggedFor, startIso),
        lte(scraps.loggedFor, asOfDate)
      )
    )
    .groupBy(scraps.loggedFor);

  const loggedDays = new Set(rows.map((r) => r.loggedFor));

  let streak = 0;
  const cursor = new Date(asOf);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!loggedDays.has(iso)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
