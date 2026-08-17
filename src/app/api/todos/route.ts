import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, todoSubtasks, todoTags, tags as tagsTable } from "@/db/schema";
import { eq, and, ne, inArray, asc, sql } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { createTodoSchema } from "@/lib/validations/todos";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";
import { zonedTimeToUtc } from "@/lib/dal/todos";
import { parseTodo } from "@/lib/todos/parse";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function attachSubtasksAndTags(todoIds: string[]) {
  if (todoIds.length === 0) return { subtasksByTodo: new Map(), tagsByTodo: new Map() };

  const [subtaskRows, tagRows] = await Promise.all([
    db
      .select()
      .from(todoSubtasks)
      .where(inArray(todoSubtasks.todoId, todoIds))
      .orderBy(asc(todoSubtasks.position)),
    db
      .select({ todoId: todoTags.todoId, tagName: tagsTable.name })
      .from(todoTags)
      .innerJoin(tagsTable, eq(todoTags.tagId, tagsTable.id))
      .where(inArray(todoTags.todoId, todoIds)),
  ]);

  const subtasksByTodo = new Map<string, typeof subtaskRows>();
  for (const s of subtaskRows) {
    const list = subtasksByTodo.get(s.todoId) || [];
    list.push(s);
    subtasksByTodo.set(s.todoId, list);
  }

  const tagsByTodo = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = tagsByTodo.get(t.todoId) || [];
    list.push(t.tagName);
    tagsByTodo.set(t.todoId, list);
  }

  return { subtasksByTodo, tagsByTodo };
}

// ─── GET /api/todos ─────────────────────────────────────────────────────────
// Core listing only — sectioning (Overdue/Today/This week/...), the time
// slider, and energy-chip filtering are TODOS.md Phase 4. This returns every
// non-terminal-but-hidden todo (everything except GRAVEYARD) so the client
// can group and filter it.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const graveyard = searchParams.get("graveyard") === "true";

    // Graveyard todos are excluded from every default view and count
    // (TODOS.md §4) — they only ever show up here when explicitly asked for.
    const rows = await db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.userId, userId),
          graveyard ? eq(todos.state, "GRAVEYARD") : ne(todos.state, "GRAVEYARD")
        )
      )
      .orderBy(sql`${todos.dueDate} IS NULL, ${todos.dueDate} ASC`, asc(todos.sortOrder));

    const ids = rows.map((r) => r.id);
    const { subtasksByTodo, tagsByTodo } = await attachSubtasksAndTags(ids);

    const items = rows.map((t) => ({
      ...t,
      remindAt: t.remindAt ? t.remindAt.toISOString() : null,
      remindSentAt: t.remindSentAt ? t.remindSentAt.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
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
        ...inserted,
        remindAt: inserted.remindAt ? inserted.remindAt.toISOString() : null,
        remindSentAt: null,
        completedAt: null,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
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
