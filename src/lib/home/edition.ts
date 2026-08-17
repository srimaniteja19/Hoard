import { db } from "@/db";
import { bookmarks, todos, tilEntries, homeEditionCache } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";
import { getTilStreak } from "@/lib/dal/til";
import {
  getQueueAggregate,
  getAgendaAggregate,
  getRecordAggregate,
  getLedger,
  getDayPlan,
  getRecallCard,
  getCandidates,
  getTicker,
} from "./queries";
import type { CachedHomeSections, HomeEdition, HomeEditionParams } from "./types";

export * from "./types";

/**
 * Content fingerprint across the three source tables for this user: row
 * count + max(updatedAt) each. Cheaper than hashing rows, and changes the
 * moment any bookmark/todo/TIL write touches this user's data — so the
 * cache below never needs write-path invalidation hooks, just a fingerprint
 * comparison on read. See TODOS.md-style precedent in constellation_layouts.
 */
async function computeFingerprint(userId: string): Promise<string> {
  const [[b], [t], [til]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int`, maxUpdated: sql<string>`coalesce(max(${bookmarks.updatedAt}), 'epoch')::text` })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int`, maxUpdated: sql<string>`coalesce(max(${todos.updatedAt}), 'epoch')::text` })
      .from(todos)
      .where(eq(todos.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int`, maxUpdated: sql<string>`coalesce(max(${tilEntries.updatedAt}), 'epoch')::text` })
      .from(tilEntries)
      .where(eq(tilEntries.userId, userId)),
  ]);

  const raw = `b:${b.count}:${b.maxUpdated}|t:${t.count}:${t.maxUpdated}|til:${til.count}:${til.maxUpdated}`;
  return crypto.createHash("sha1").update(raw).digest("hex");
}

async function computeSections(userId: string, timezone: string): Promise<CachedHomeSections> {
  const [queue, agenda, streak] = await Promise.all([
    getQueueAggregate(userId),
    getAgendaAggregate(userId, timezone),
    getTilStreak(userId, timezone),
  ]);
  const record = await getRecordAggregate(userId, timezone);
  const [ledger, day, recall, ticker] = await Promise.all([
    getLedger(userId, timezone, record.dischargeRate, record.monthCount),
    getDayPlan(userId, timezone),
    getRecallCard(userId),
    getTicker(userId, queue, agenda, record, streak.currentStreak),
  ]);

  const netDebtHours = Math.round(((queue.owedMinutes + agenda.workMinutes) / 60) * 10) / 10;

  return {
    masthead: {
      savedTotal: queue.savedTotal,
      unread: queue.unread,
      openTodos: agenda.open,
      tilStreak: streak.currentStreak,
      netDebtHours,
      freeMinutesToday: day.freeMinutes,
    },
    ticker,
    queue: {
      unread: queue.unread,
      owedMinutes: queue.owedMinutes,
      addedThisWeek: queue.addedThisWeek,
      burndownMonths: queue.burndownMonths,
      entries: queue.entries,
    },
    agenda,
    record: {
      streak: streak.currentStreak,
      monthCount: record.monthCount,
      dischargeRate: record.dischargeRate,
      last14: record.last14,
      entries: record.entries,
    },
    ledger,
    day,
    recall,
  };
}

/**
 * Single entry point for the home edition — one round trip from the
 * caller's perspective (HOME.md §3). Everything except `candidates` is
 * cached for the user's local day behind a content fingerprint; candidates
 * are cheap and always computed fresh since they represent current open
 * work, not a historical aggregate.
 */
export async function getHomeEdition(
  userId: string,
  params: HomeEditionParams
): Promise<HomeEdition> {
  const timezone = await getUserTimezone(userId);
  const today = getLoggedForDate(timezone);
  const fingerprint = await computeFingerprint(userId);

  const [cached] = await db
    .select()
    .from(homeEditionCache)
    .where(eq(homeEditionCache.userId, userId))
    .limit(1);

  let sections: CachedHomeSections;

  if (cached && cached.cacheKey === fingerprint && cached.cachedDate === today) {
    sections = cached.payload as unknown as CachedHomeSections;
  } else {
    sections = await computeSections(userId, timezone);
    await db
      .insert(homeEditionCache)
      .values({ userId, cacheKey: fingerprint, cachedDate: today, payload: sections, computedAt: new Date() })
      .onConflictDoUpdate({
        target: homeEditionCache.userId,
        set: { cacheKey: fingerprint, cachedDate: today, payload: sections, computedAt: new Date() },
      });
  }

  const candidates = await getCandidates(userId, timezone, params.context);

  return { ...sections, candidates };
}
