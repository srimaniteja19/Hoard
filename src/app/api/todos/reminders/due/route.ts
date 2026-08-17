import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq, and, lte, isNull, sql } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";

// ─── GET /api/todos/reminders/due ───────────────────────────────────────────
// TODOS.md §9, in-app phase: a polled query for remindAt <= now AND
// remindSentAt IS NULL, surfaced as a toast + badge client-side.
//
// remindSentAt is set atomically in the same UPDATE...RETURNING that selects
// the due rows — not a separate read-then-write — so two overlapping polls
// (or two open tabs) can never both claim the same reminder. That's what
// "no double-fire" actually rests on here, not client-side dedup.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const now = new Date();

    const due = await db
      .update(todos)
      .set({ remindSentAt: now })
      .where(
        and(
          eq(todos.userId, userId),
          eq(todos.state, "OPEN"),
          lte(todos.remindAt, now),
          isNull(todos.remindSentAt),
          sql`${todos.remindAt} IS NOT NULL`
        )
      )
      .returning({ id: todos.id, title: todos.title, dueDate: todos.dueDate, estimatedMinutes: todos.estimatedMinutes });

    return NextResponse.json({ items: due });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos/reminders/due]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
