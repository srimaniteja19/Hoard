import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, todoSubtasks, todoTags, tags as tagsTable } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { updateTodoSchema } from "@/lib/validations/todos";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";

// ─── PATCH /api/todos/:id ───────────────────────────────────────────────────
// Generic field updates, plus completion: transitioning `state` to DONE sets
// completedAt/completedOn server-side from the user's timezone (never
// trust a client-computed value for either — TODOS.md §2). Transitioning
// away from DONE clears both, so completion is reversible.
//
// Rollover (the → push action) and recurrence (next-instance-on-completion)
// are TODOS.md Phases 5 and 6 — not handled here yet.

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const rawBody = await req.json();

    const parseResult = updateTodoSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    const existing = await db
      .select({ id: todos.id, state: todos.state })
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const updatePayload: Partial<typeof todos.$inferInsert> = { updatedAt: new Date() };

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.note !== undefined) updatePayload.note = data.note;
    if (data.energy !== undefined) updatePayload.energy = data.energy;
    if (data.estimatedMinutes !== undefined) updatePayload.estimatedMinutes = data.estimatedMinutes;
    if (data.actualMinutes !== undefined) updatePayload.actualMinutes = data.actualMinutes;
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate;
    if (data.remindAt !== undefined) updatePayload.remindAt = data.remindAt ? new Date(data.remindAt) : null;
    if (data.recurrenceRule !== undefined) updatePayload.recurrenceRule = data.recurrenceRule;
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;

    if (data.state !== undefined) {
      updatePayload.state = data.state;
      if (data.state === "DONE" && existing[0].state !== "DONE") {
        const timezone = await getUserTimezone(userId);
        const now = new Date();
        updatePayload.completedAt = now;
        updatePayload.completedOn = getLoggedForDate(timezone, now);
      } else if (data.state !== "DONE" && existing[0].state === "DONE") {
        updatePayload.completedAt = null;
        updatePayload.completedOn = null;
      }
    }

    const [updated] = await db
      .update(todos)
      .set(updatePayload)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();

    let tagNames: string[];
    if (data.tags !== undefined) {
      await db.delete(todoTags).where(eq(todoTags.todoId, id));
      tagNames = [];
      for (const rawTag of data.tags) {
        const tagName = rawTag.trim().toLowerCase();
        if (!tagName) continue;

        const existingTag = await db
          .select({ id: tagsTable.id })
          .from(tagsTable)
          .where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, tagName)));

        const tagId =
          existingTag[0]?.id ??
          (
            await db.insert(tagsTable).values({ userId, name: tagName, color: "#00F0FF" }).returning({ id: tagsTable.id })
          )[0].id;

        await db.insert(todoTags).values({ todoId: id, tagId }).onConflictDoNothing();
        tagNames.push(tagName);
      }
    } else {
      const tagRows = await db
        .select({ name: tagsTable.name })
        .from(todoTags)
        .innerJoin(tagsTable, eq(todoTags.tagId, tagsTable.id))
        .where(eq(todoTags.todoId, id));
      tagNames = tagRows.map((r) => r.name);
    }

    const subtasks = await db
      .select()
      .from(todoSubtasks)
      .where(eq(todoSubtasks.todoId, id))
      .orderBy(asc(todoSubtasks.position));

    return NextResponse.json({
      ...updated,
      remindAt: updated.remindAt ? updated.remindAt.toISOString() : null,
      remindSentAt: updated.remindSentAt ? updated.remindSentAt.toISOString() : null,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      subtasks,
      tags: tagNames,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/todos/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/todos/:id ──────────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await db
      .select({ id: todos.id })
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/todos/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
