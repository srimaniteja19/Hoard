import { db } from "@/db";
import { bookmarks, todos, tilEntries, busyBlocks, TodoState } from "@/db/schema";
import { and, eq, gte, lte, isNull, desc, asc, sql, inArray } from "drizzle-orm";
import { getLoggedForDate, getMinutesSinceMidnight, getLocalDayOfWeek } from "@/lib/dal/shared";
import { withCalibrationPadding, getCalibrationSamples } from "@/lib/dal/todos";
import { computeDayPlan } from "@/lib/todos/dayplan";
import { confidence, confidenceSql } from "@/lib/til/confidence";
import { CTX } from "@/data/initialBookmarks";
import type { ContextType, KindType } from "@/types";
import type { ColumnEntry, DayBlock, LeadCandidate, RecallCard, TickerItem } from "./types";

const MS_PER_DAY = 86_400_000;
const OPEN_STATES: TodoState[] = ["OPEN"];

function daysAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - n * MS_PER_DAY);
}

// ─── Queue (bookmarks) ────────────────────────────────────────────────────

export async function getQueueAggregate(userId: string) {
  const [[{ savedTotal }], [{ unread }], [{ owedMinutes }], [{ addedThisWeek }], [{ readLast30 }]] =
    await Promise.all([
      db
        .select({ savedTotal: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt))),
      db
        .select({ unread: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt), eq(bookmarks.unread, true))),
      db
        .select({ owedMinutes: sql<number>`coalesce(sum(${bookmarks.mins}), 0)::int` })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt), eq(bookmarks.unread, true))),
      db
        .select({ addedThisWeek: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            isNull(bookmarks.deletedAt),
            gte(bookmarks.createdAt, daysAgo(7))
          )
        ),
      // Proxy for "read in the last 30 days" — the schema has no dedicated
      // read-event log, so this reads unread=false rows touched in the
      // window. Editing a note on an already-read bookmark would also bump
      // updatedAt, so this can overcount slightly; it's the best signal
      // available without adding a read-event table.
      db
        .select({ readLast30: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            isNull(bookmarks.deletedAt),
            eq(bookmarks.unread, false),
            gte(bookmarks.updatedAt, daysAgo(30))
          )
        ),
    ]);

  const oldestUnread = await db
    .select({ id: bookmarks.id, title: bookmarks.title, mins: bookmarks.mins, createdAt: bookmarks.createdAt })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt), eq(bookmarks.unread, true)))
    .orderBy(asc(bookmarks.createdAt))
    .limit(3);

  const entries: ColumnEntry[] = oldestUnread.map((b) => ({
    id: String(b.id),
    title: b.title,
    meta: `${b.mins} min`,
  }));

  const burndownMonths =
    readLast30 > 0 ? Math.round((unread / (readLast30 / 1)) * 10) / 10 : null;

  return {
    unread,
    owedMinutes,
    addedThisWeek,
    burndownMonths,
    entries,
    savedTotal,
    readLast30,
  };
}

// ─── Agenda (todos) ───────────────────────────────────────────────────────

export async function getAgendaAggregate(userId: string, timezone: string) {
  const today = getLoggedForDate(timezone);

  const [[{ open }], [{ workMinutes }], [{ doneToday }], [{ staleCount }]] = await Promise.all([
    db
      .select({ open: sql<number>`count(*)::int` })
      .from(todos)
      .where(and(eq(todos.userId, userId), inArray(todos.state, OPEN_STATES))),
    db
      .select({ workMinutes: sql<number>`coalesce(sum(${todos.estimatedMinutes}), 0)::int` })
      .from(todos)
      .where(and(eq(todos.userId, userId), inArray(todos.state, OPEN_STATES))),
    db
      .select({ doneToday: sql<number>`count(*)::int` })
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.state, "DONE"), eq(todos.completedOn, today))),
    db
      .select({ staleCount: sql<number>`count(*)::int` })
      .from(todos)
      .where(and(eq(todos.userId, userId), inArray(todos.state, OPEN_STATES), gte(todos.rolloverCount, 3))),
  ]);

  const upcoming = await db
    .select({ id: todos.id, title: todos.title, estimatedMinutes: todos.estimatedMinutes, dueDate: todos.dueDate, rolloverCount: todos.rolloverCount })
    .from(todos)
    .where(and(eq(todos.userId, userId), inArray(todos.state, OPEN_STATES)))
    .orderBy(sql`${todos.dueDate} IS NULL, ${todos.dueDate} ASC`)
    .limit(3);

  const entries: ColumnEntry[] = upcoming.map((t) => ({
    id: t.id,
    title: t.title,
    meta: t.dueDate
      ? `${t.estimatedMinutes} min · due ${t.dueDate}`
      : `${t.estimatedMinutes} min · someday`,
  }));

  return { open, workMinutes, doneToday, staleCount, entries };
}

// ─── Record (TIL) ─────────────────────────────────────────────────────────

export async function getRecordAggregate(userId: string, timezone: string) {
  const startDate = daysAgo(14);
  const startDateStr = getLoggedForDate(timezone, startDate);

  const rows = await db
    .select({ day: tilEntries.loggedFor, count: sql<number>`count(*)::int` })
    .from(tilEntries)
    .where(and(eq(tilEntries.userId, userId), gte(tilEntries.loggedFor, startDateStr)))
    .groupBy(tilEntries.loggedFor);

  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const last14: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = getLoggedForDate(timezone, daysAgo(i));
    last14.push(byDay.get(d) ?? 0);
  }

  const monthCount = await monthCountForUser(userId, timezone);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(tilEntries)
    .where(eq(tilEntries.userId, userId));
  const [{ discharged }] = await db
    .select({ discharged: sql<number>`count(*)::int` })
    .from(tilEntries)
    .where(and(eq(tilEntries.userId, userId), sql`${tilEntries.dischargesBookmarkId} IS NOT NULL`));
  const dischargeRate = total > 0 ? Math.round((discharged / total) * 100) : 0;

  const recent = await db
    .select({ id: tilEntries.id, body: tilEntries.body, loggedFor: tilEntries.loggedFor })
    .from(tilEntries)
    .where(eq(tilEntries.userId, userId))
    .orderBy(desc(tilEntries.loggedFor), desc(tilEntries.createdAt))
    .limit(3);

  const entries: ColumnEntry[] = recent.map((r) => ({
    id: r.id,
    title: (r.body ?? "").slice(0, 80),
    meta: r.loggedFor ?? "",
  }));

  return { monthCount, dischargeRate, last14, entries, totalTil: total, dischargedTil: discharged };
}

async function monthCountForUser(userId: string, timezone: string): Promise<number> {
  const startDateStr = getLoggedForDate(timezone, daysAgo(30));
  const [{ monthCount }] = await db
    .select({ monthCount: sql<number>`count(*)::int` })
    .from(tilEntries)
    .where(and(eq(tilEntries.userId, userId), gte(tilEntries.loggedFor, startDateStr)));
  return monthCount;
}

// ─── Ledger ───────────────────────────────────────────────────────────────

export async function getLedger(
  userId: string,
  timezone: string,
  dischargeRate: number,
  learnedCount: number
) {
  const windowStart = daysAgo(30);
  const windowStartDateStr = getLoggedForDate(timezone, daysAgo(30));

  const [[{ tookOnMinutes }], [{ clearedBookmarkMinutes }], clearedTodoRows] = await Promise.all([
    db
      .select({ tookOnMinutes: sql<number>`coalesce(sum(${bookmarks.mins}), 0)::int` })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt), gte(bookmarks.createdAt, windowStart))),
    db
      .select({ clearedBookmarkMinutes: sql<number>`coalesce(sum(${bookmarks.mins}), 0)::int` })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          isNull(bookmarks.deletedAt),
          eq(bookmarks.unread, false),
          gte(bookmarks.updatedAt, windowStart)
        )
      ),
    db
      .select({ estimatedMinutes: todos.estimatedMinutes, actualMinutes: todos.actualMinutes })
      .from(todos)
      .where(
        and(eq(todos.userId, userId), eq(todos.state, "DONE"), gte(todos.completedOn, windowStartDateStr))
      ),
  ]);

  const clearedTodoMinutes = clearedTodoRows.reduce(
    (sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes),
    0
  );

  const tookOnHours = Math.round((tookOnMinutes / 60) * 10) / 10;
  const clearedHours = Math.round(((clearedBookmarkMinutes + clearedTodoMinutes) / 60) * 10) / 10;
  const netHours = Math.round((clearedHours - tookOnHours) * 10) / 10;
  const ratio = tookOnHours > 0 ? Math.round((clearedHours / tookOnHours) * 100) / 100 : null;

  // Calibration error, all-time, below the same 30-sample floor
  // lib/todos/calibration.ts uses — a mean *absolute* percentage error
  // ("how far off, regardless of direction"), a different question from
  // calibration()'s signed multiplier ("pad estimates by this much"), so
  // it keeps its own formula here. The sample set is identical to
  // calibration()'s, though, so it's fetched via the same DAL helper
  // rather than re-querying it.
  const allCompletedWithActual = await getCalibrationSamples(userId);

  const estimateError =
    allCompletedWithActual.length >= 30
      ? Math.round(
          (allCompletedWithActual.reduce(
            (sum, t) => sum + Math.abs(t.estimated - t.actual) / t.estimated,
            0
          ) /
            allCompletedWithActual.length) *
            1000
        ) / 1000
      : null;

  return { tookOnHours, clearedHours, learnedCount, netHours, ratio, dischargeRate, estimateError };
}

// ─── Day plan ──────────────────────────────────────────────────────────────

export async function getDayPlan(userId: string, timezone: string) {
  const minutesSinceMidnight = getMinutesSinceMidnight(timezone);
  const today = getLoggedForDate(timezone);
  const dayOfWeek = getLocalDayOfWeek(timezone);

  const [dueOpen, busyRows] = await Promise.all([
    db
      .select({ id: todos.id, title: todos.title, estimatedMinutes: todos.estimatedMinutes, energy: todos.energy })
      .from(todos)
      .where(and(eq(todos.userId, userId), inArray(todos.state, OPEN_STATES), lte(todos.dueDate, today)))
      .orderBy(desc(todos.estimatedMinutes)),
    db
      .select({ start: busyBlocks.startTime, end: busyBlocks.endTime, title: busyBlocks.title })
      .from(busyBlocks)
      .where(and(eq(busyBlocks.userId, userId), eq(busyBlocks.dayOfWeek, dayOfWeek))),
  ]);

  // Padding — TODOS.md §6: default off, one toggle, only applied once a
  // multiplier exists (30+ overall samples, 15+ for that energy class).
  // Overdue open tasks are packed too — they're work that belongs to today.
  const paddedTasks = await withCalibrationPadding(userId, dueOpen);

  const plan = computeDayPlan(busyRows, paddedTasks, minutesSinceMidnight);

  const blocks: DayBlock[] = busyRows;
  const nowPercent = Math.round((minutesSinceMidnight / (24 * 60)) * 100);
  const unfittedMinutes = plan.unfitted.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return {
    blocks,
    nowPercent,
    freeMinutes: plan.freeMinutes,
    unfittedCount: plan.unfitted.length,
    unfittedMinutes,
  };
}

// ─── Recall ───────────────────────────────────────────────────────────────

export async function getRecallCard(userId: string): Promise<RecallCard> {
  const rows = await db
    .select()
    .from(tilEntries)
    .where(and(eq(tilEntries.userId, userId), isNull(tilEntries.supersededById)))
    .orderBy(asc(confidenceSql), asc(tilEntries.createdAt))
    .limit(1);

  const entry = rows[0];
  if (!entry) return null;

  const stability = entry.stability ?? 1;
  const lastReviewedAt = entry.lastReviewedAt ?? entry.createdAt;
  const ageDays = Math.floor((Date.now() - entry.createdAt.getTime()) / MS_PER_DAY);

  return {
    id: entry.id,
    hash: entry.shortHash,
    text: (entry.body ?? "").slice(0, 200),
    ageDays,
    confidence: confidence(stability, lastReviewedAt),
  };
}

// ─── Candidates (lead + up-next pool; scoring itself is Phase 5) ──────────

export async function getCandidates(
  userId: string,
  timezone: string,
  context: ContextType
): Promise<LeadCandidate[]> {
  const today = getLoggedForDate(timezone);
  const allowedKinds = new Set(CTX[context]);

  const [openTodos, unreadBookmarks] = await Promise.all([
    db
      .select({
        id: todos.id,
        title: todos.title,
        estimatedMinutes: todos.estimatedMinutes,
        energy: todos.energy,
        dueDate: todos.dueDate,
        rolloverCount: todos.rolloverCount,
        createdAt: todos.createdAt,
      })
      .from(todos)
      .where(and(eq(todos.userId, userId), inArray(todos.state, OPEN_STATES)))
      .limit(75),
    db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        mins: bookmarks.mins,
        type: bookmarks.type,
        createdAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt), eq(bookmarks.unread, true)))
      .orderBy(asc(bookmarks.createdAt))
      .limit(75),
  ]);

  const now = Date.now();
  const todoCandidates: LeadCandidate[] = openTodos.map((t) => {
    const overdueDays = t.dueDate && t.dueDate < today ? dateDiffDays(t.dueDate, today) : null;
    return {
      source: "todo",
      id: t.id,
      title: t.title,
      estimatedMinutes: t.estimatedMinutes,
      kind: null,
      energy: t.energy,
      overdueDays,
      dueToday: t.dueDate === today,
      rolloverCount: t.rolloverCount,
      ageDays: Math.floor((now - t.createdAt.getTime()) / MS_PER_DAY),
      unread: null,
    };
  });

  const bookmarkCandidates: LeadCandidate[] = unreadBookmarks
    .filter((b) => allowedKinds.has(b.type as KindType))
    .map((b) => ({
      source: "bookmark",
      id: String(b.id),
      title: b.title,
      estimatedMinutes: b.mins,
      kind: b.type as LeadCandidate["kind"],
      energy: null,
      overdueDays: null,
      dueToday: false,
      rolloverCount: null,
      ageDays: Math.floor((now - b.createdAt.getTime()) / MS_PER_DAY),
      unread: true,
    }));

  return [...todoCandidates, ...bookmarkCandidates];
}

function dateDiffDays(fromDateStr: string, toDateStr: string): number {
  const from = new Date(`${fromDateStr}T00:00:00Z`);
  const to = new Date(`${toDateStr}T00:00:00Z`);
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / MS_PER_DAY));
}

// ─── Ticker ─────────────────────────────────────────────────────────────

export async function getTicker(
  userId: string,
  queue: Awaited<ReturnType<typeof getQueueAggregate>>,
  agenda: Awaited<ReturnType<typeof getAgendaAggregate>>,
  record: Awaited<ReturnType<typeof getRecordAggregate>>,
  tilStreak: number
): Promise<TickerItem[]> {
  const [{ addedPriorWeek }] = await db
    .select({ addedPriorWeek: sql<number>`count(*)::int` })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        isNull(bookmarks.deletedAt),
        gte(bookmarks.createdAt, daysAgo(14)),
        lte(bookmarks.createdAt, daysAgo(7))
      )
    );

  const savedDelta = queue.addedThisWeek - addedPriorWeek;

  return [
    { label: "SAVED", value: String(queue.addedThisWeek), delta: fmtDelta(savedDelta), dir: dirOf(savedDelta) },
    { label: "UNREAD", value: String(queue.unread), dir: "flat" },
    { label: "OPEN TODOS", value: String(agenda.open), dir: "flat" },
    { label: "TIL STREAK", value: String(tilStreak), dir: "flat" },
    { label: "DISCHARGE RATE", value: `${record.dischargeRate}%`, dir: "flat" },
    { label: "STALE TASKS", value: String(agenda.staleCount), dir: agenda.staleCount > 0 ? "up" : "flat" },
  ];
}

function fmtDelta(n: number): string {
  if (n === 0) return "±0";
  return n > 0 ? `+${n}` : String(n);
}

function dirOf(n: number): "up" | "down" | "flat" {
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
}
