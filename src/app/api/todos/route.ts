import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, todoTags, tags as tagsTable } from "@/db/schema";
import { eq, and, ne, asc, sql, ilike } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { createTodoSchema } from "@/lib/validations/todos";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";
import { zonedTimeToUtc, attachSubtasksAndTags, serializeTodoTimestamps } from "@/lib/dal/todos";
import { parseTodo } from "@/lib/todos/parse";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// ─── GET /api/todos ─────────────────────────────────────────────────────────
// Core listing only — sectioning (Overdue/Today/This week/...), the time
// slider, and energy-chip filtering are TODOS.md Phase 4. This returns every
// non-terminal-but-hidden todo (everything except GRAVEYARD) so the client
// can group and filter it.
//
// `?q=` searches titles. Combined with `?graveyard=true` that's how
// graveyard tasks "stay searchable" (TODOS.md §4) without appearing in
// default views.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const graveyard = searchParams.get("graveyard") === "true";
    const q = searchParams.get("q")?.trim().slice(0, 100) ?? "";
    const search = q ? q.replace(/[%_]/g, "") : "";

    // Graveyard todos are excluded from every default view and count
    // (TODOS.md §4) — they only ever show up here when explicitly asked for.
    const conditions = [
      eq(todos.userId, userId),
      graveyard ? eq(todos.state, "GRAVEYARD") : ne(todos.state, "GRAVEYARD"),
    ];
    if (search) conditions.push(ilike(todos.title, `%${search}%`));

    const rows = await db
      .select()
      .from(todos)
      .where(and(...conditions))
      .orderBy(sql`${todos.dueDate} IS NULL, ${todos.dueDate} ASC`, asc(todos.sortOrder));

    const ids = rows.map((r) => r.id);
    const { subtasksByTodo, tagsByTodo } = await attachSubtasksAndTags(ids);

    const items = rows.map((t) => ({
      ...serializeTodoTimestamps(t),
      subtasks: subtasksByTodo.get(t.id) || [],
      tags: tagsByTodo.get(t.id) || [],
    }));

    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/todos ────────────────────────────────────────────────────────
// The client only ever sends the raw captured text — the server re-parses it
// authoritatively via the same pure parseTodo() the capture bar's live
// preview uses, so a stale or tampered client can't submit a due date /
// estimate the server didn't independently derive from the text.

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rawBody = await req.json();

    const parseResult = createTodoSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const timezone = await getUserTimezone(userId);
    const now = new Date();
    const parsed = parseTodo(parseResult.data.text, now, timezone);

    const dueDate = parsed.dueOffsetDays !== null ? getLoggedForDate(timezone, addDays(now, parsed.dueOffsetDays)) : null;
    const remindAt = parsed.remindAtLocal
      ? zonedTimeToUtc(dueDate ?? getLoggedForDate(timezone, now), parsed.remindAtLocal, timezone)
      : null;

    const [inserted] = await db
      .insert(todos)
      .values({
        userId,
        title: parsed.title || parseResult.data.text.trim(),
        energy: parsed.energy,
        estimatedMinutes: parsed.estimatedMinutes,
        dueDate,
        originalDueDate: dueDate,
        remindAt,
        recurrenceRule: parsed.recurrenceRule,
        seriesPosition: parsed.recurrenceRule ? 1 : null,
        state: "OPEN",
      })
      .returning();

    const createdTagNames: string[] = [];
    for (const rawTag of parsed.tags) {
      const tagName = rawTag.trim().toLowerCase();
      if (!tagName) continue;

      const existing = await db
        .select({ id: tagsTable.id })
        .from(tagsTable)
        .where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, tagName)));

      const tagId =
        existing[0]?.id ??
        (
          await db
            .insert(tagsTable)
            .values({ userId, name: tagName, color: "#00F0FF" })
            .returning({ id: tagsTable.id })
        )[0].id;

      await db.insert(todoTags).values({ todoId: inserted.id, tagId }).onConflictDoNothing();
      createdTagNames.push(tagName);
    }

    return NextResponse.json(
      {
        ...serializeTodoTimestamps(inserted),
        subtasks: [],
        tags: createdTagNames,
        matched: parsed.matched,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/todos]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
