import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, busyBlocks } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { getLoggedForDate, getUserTimezone, getMinutesSinceMidnight, getLocalDayOfWeek } from "@/lib/dal/shared";
import { withCalibrationPadding } from "@/lib/dal/todos";
import { computeDayPlan } from "@/lib/todos/dayplan";

// ─── GET /api/todos/day-plan ─────────────────────────────────────────────────
// TODOS.md §7 — busy blocks, gaps, and today's open todos packed into them by
// greedy-descending fill. computeDayPlan() itself is pure and just takes
// `busy: {start,end,title}[]`; this route is the only place that touches the
// DB, so a calendar adapter can later replace the busyBlocks query without
// touching the packing logic at all.
//
// Open overdue tasks are packed too — they're work that belongs to today,
// and leaving them out would let the plan claim a day is free when it isn't
// (decision 4). Someday (null dueDate) stays out.
//
// Estimates are padded at read time when the calibration toggle is on
// (TODOS.md §6) — stored rows are never rewritten.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const timezone = await getUserTimezone(userId);
    const today = getLoggedForDate(timezone);
    const dayOfWeek = getLocalDayOfWeek(timezone);
    const nowMinutes = getMinutesSinceMidnight(timezone);

    const [busyRows, dueOpen] = await Promise.all([
      db
        .select({ start: busyBlocks.startTime, end: busyBlocks.endTime, title: busyBlocks.title })
        .from(busyBlocks)
        .where(and(eq(busyBlocks.userId, userId), eq(busyBlocks.dayOfWeek, dayOfWeek))),
      db
        .select({ id: todos.id, title: todos.title, estimatedMinutes: todos.estimatedMinutes, energy: todos.energy })
        .from(todos)
        .where(and(eq(todos.userId, userId), eq(todos.state, "OPEN"), lte(todos.dueDate, today))),
    ]);

    const paddedTasks = await withCalibrationPadding(userId, dueOpen);
    const plan = computeDayPlan(busyRows, paddedTasks, nowMinutes);

    return NextResponse.json({ busy: busyRows, ...plan });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos/day-plan]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
