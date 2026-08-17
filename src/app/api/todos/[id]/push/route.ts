import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, rolloverEvents } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";

// ─── POST /api/todos/:id/push ───────────────────────────────────────────────
// The → action — TODOS.md §4/§7. Pushes an OPEN todo's dueDate to tomorrow
// (server-computed from the account's timezone, never trusted from the
// client) and increments rolloverCount by exactly one.
//
// This is the ONLY place rolloverCount can change — updateTodoSchema doesn't
// expose it as a field, so the generic PATCH /api/todos/:id can't touch it.
// That's what keeps rolloverCount an honest record of explicit pushes: there
// is no other code path, cron or otherwise, that can move it.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const existing = await db
      .select({ id: todos.id, state: todos.state })
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }
    if (existing[0].state !== "OPEN") {
      return NextResponse.json({ error: "Only open todos can be pushed" }, { status: 400 });
    }

    const timezone = await getUserTimezone(userId);
    const now = new Date();
    const today = getLoggedForDate(timezone, now);
    const tomorrow = getLoggedForDate(timezone, new Date(now.getTime() + 24 * 60 * 60 * 1000));

    const [updated] = await db
      .update(todos)
      .set({
        dueDate: tomorrow,
        rolloverCount: sql`${todos.rolloverCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();

    // The history calendar (§8) needs to know *which* day something rolled
    // on, not just the running total — this is that trail.
    await db.insert(rolloverEvents).values({ userId, todoId: id, occurredOn: today });

    return NextResponse.json({
      ...updated,
      remindAt: updated.remindAt ? updated.remindAt.toISOString() : null,
      remindSentAt: updated.remindSentAt ? updated.remindSentAt.toISOString() : null,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/todos/[id]/push]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
