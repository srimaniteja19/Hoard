import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, busyBlocks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { getLoggedForDate, getUserTimezone, getMinutesSinceMidnight, getLocalDayOfWeek } from "@/lib/dal/shared";
import { computeDayPlan } from "@/lib/todos/dayplan";

// ─── GET /api/todos/day-plan ─────────────────────────────────────────────────
// TODOS.md §7 — busy blocks, gaps, and today's open todos packed into them by
// greedy-descending fill. computeDayPlan() itself is pure and just takes
// `busy: {start,end,title}[]`; this route is the only place that touches the
// DB, so a calendar adapter can later replace the busyBlocks query without
// touching the packing logic at all.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const timezone = await getUserTimezone(userId);
    const today = getLoggedForDate(timezone);
    const dayOfWeek = getLocalDayOfWeek(timezone);
    const nowMinutes = getMinutesSinceMidnight(timezone);

    const [busyRows, dueTodayOpen] = await Promise.all([
      db
        .select({ start: busyBlocks.startTime, end: busyBlocks.endTime, title: busyBlocks.title })
        .from(busyBlocks)
        .where(and(eq(busyBlocks.userId, userId), eq(busyBlocks.dayOfWeek, dayOfWeek))),
      db
        .select({ id: todos.id, title: todos.title, estimatedMinutes: todos.estimatedMinutes })
        .from(todos)
        .where(and(eq(todos.userId, userId), eq(todos.state, "OPEN"), eq(todos.dueDate, today))),
    ]);

    const plan = computeDayPlan(busyRows, dueTodayOpen, nowMinutes);

    return NextResponse.json({ busy: busyRows, ...plan });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos/day-plan]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
