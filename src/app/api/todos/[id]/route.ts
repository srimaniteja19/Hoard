import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, todoSubtasks, todoTags, tags as tagsTable } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { updateTodoSchema } from "@/lib/validations/todos";
import { getLoggedForDate, getUserTimezone } from "@/lib/dal/shared";
import { remindAtOnDate, serializeTodoTimestamps, attachSubtasksAndTags, upsertTagsForTodo } from "@/lib/dal/todos";
import { buildSuccessorFields } from "@/lib/todos/recurrence";
import crypto from "crypto";

async function resolveTagNames(todoId: string): Promise<string[]> {
  const rows = await db
    .select({ name: tagsTable.name })
    .from(todoTags)
    .innerJoin(tagsTable, eq(todoTags.tagId, tagsTable.id))
    .where(eq(todoTags.todoId, todoId));
  return rows.map((r) => r.name);
}

/**
 * On completing a recurring todo, generates exactly one successor row —
 * never ahead of time (TODOS.md §5). Template fields (title/note/energy/
 * estimatedMinutes/recurrenceRule/tags) come from the series' ROOT row's
 * *current* values, not from the instance being completed — that's what
 * makes "this and future" edits on the root actually take effect on later
 * instances, while a "this one" edit on a single instance doesn't leak into
 * the next one.
 */
async function generateSuccessorIfRecurring(
  userId: string,
  completedInstance: typeof todos.$inferSelect
) {
  if (!completedInstance.recurrenceRule) return null;

  const rootId = completedInstance.recurrenceParentId ?? completedInstance.id;
  const [root] =
    rootId === completedInstance.id
      ? [completedInstance]
      : await db.select().from(todos).where(and(eq(todos.id, rootId), eq(todos.userId, userId))).limit(1);

  if (!root) return null;

  const fields = buildSuccessorFields(root, completedInstance);
  if (!fields) return null;

  // Reminder is a template field: same local time on the next due date,
  // remindSentAt left null so it can fire again. Read from the root so a
  // "this one" reminder edit on the completed instance doesn't leak.
  let remindAt: Date | null = null;
  if (root.remindAt) {
    const timezone = await getUserTimezone(userId);
    remindAt = remindAtOnDate(root.remindAt, fields.dueDate, timezone);
  }

  const newId = crypto.randomUUID();
  const [inserted] = await db
    .insert(todos)
    .values({
      id: newId,
      userId,
      ...fields,
      remindAt,
      rolloverCount: 0,
      state: "OPEN",
    })
    .returning();

  const rootTagRows = await db
    .select({ tagId: todoTags.tagId })
    .from(todoTags)
    .where(eq(todoTags.todoId, rootId));
  if (rootTagRows.length > 0) {
    await db.insert(todoTags).values(rootTagRows.map((r) => ({ todoId: newId, tagId: r.tagId }))).onConflictDoNothing();
  }

  return { ...inserted, tags: await resolveTagNames(newId) };
}

// ─── PATCH /api/todos/:id ───────────────────────────────────────────────────
// Generic field updates, plus:
//   - Completion: transitioning `state` to DONE sets completedAt/completedOn
//     server-side from the user's timezone (never trust a client-computed
//     value for either — §2). Transitioning away from DONE clears both, so
//     completion is reversible. If the completed todo recurs, exactly one
//     successor is generated (see generateSuccessorIfRecurring above).
//   - Edit scope: applyToFutureInstances propagates title/note/energy/
//     estimatedMinutes/recurrenceRule to the series' root row too — see §5.
//
// Rollover (the → push action) is Phase 5, handled by POST .../push.

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const [row] = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const { subtasksByTodo, tagsByTodo } = await attachSubtasksAndTags([id]);
    return NextResponse.json({
      ...serializeTodoTimestamps(row),
      subtasks: subtasksByTodo.get(id) || [],
      tags: tagsByTodo.get(id) || [],
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const existingRows = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }
    const existing = existingRows[0];

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

    let completingNow = false;
    if (data.state !== undefined) {
      updatePayload.state = data.state;
      if (data.state === "DONE" && existing.state !== "DONE") {
        completingNow = true;
        const timezone = await getUserTimezone(userId);
        const now = new Date();
        updatePayload.completedAt = now;
        updatePayload.completedOn = getLoggedForDate(timezone, now);
      } else if (data.state !== "DONE" && existing.state === "DONE") {
        updatePayload.completedAt = null;
        updatePayload.completedOn = null;
      }
    }

    // "This and future" eligibility, computed once — both the scalar-field
    // propagation below and the tag propagation further down need the same
    // rootId and the same "is there even a root to propagate to" check.
    const rootId = existing.recurrenceParentId ?? existing.id;
    const propagateToRoot = Boolean(
      data.applyToFutureInstances && (existing.recurrenceRule || existing.recurrenceParentId) && rootId !== id
    );

    // "This and future": apply the same template fields to the series root,
    // before completion reads it for successor generation below.
    if (propagateToRoot) {
      const rootPayload: Partial<typeof todos.$inferInsert> = { updatedAt: new Date() };
      if (data.title !== undefined) rootPayload.title = data.title;
      if (data.note !== undefined) rootPayload.note = data.note;
      if (data.energy !== undefined) rootPayload.energy = data.energy;
      if (data.estimatedMinutes !== undefined) rootPayload.estimatedMinutes = data.estimatedMinutes;
      if (data.recurrenceRule !== undefined) rootPayload.recurrenceRule = data.recurrenceRule;
      if (data.remindAt !== undefined) rootPayload.remindAt = data.remindAt ? new Date(data.remindAt) : null;
      await db.update(todos).set(rootPayload).where(and(eq(todos.id, rootId), eq(todos.userId, userId)));
    }

    const [updated] = await db
      .update(todos)
      .set(updatePayload)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();

    let tagNames: string[];
    if (data.tags !== undefined) {
      await db.delete(todoTags).where(eq(todoTags.todoId, id));
      tagNames = await upsertTagsForTodo(userId, id, data.tags);

      // "This and future" — tags are a template field (§5). Copy the set
      // we just wrote onto the root so later instances pick them up.
      if (propagateToRoot) {
        await db.delete(todoTags).where(eq(todoTags.todoId, rootId));
        const instanceTagRows = await db.select({ tagId: todoTags.tagId }).from(todoTags).where(eq(todoTags.todoId, id));
        if (instanceTagRows.length > 0) {
          await db.insert(todoTags).values(instanceTagRows.map((r) => ({ todoId: rootId, tagId: r.tagId }))).onConflictDoNothing();
        }
      }
    } else {
      tagNames = await resolveTagNames(id);
    }

    const subtasks = await db
      .select()
      .from(todoSubtasks)
      .where(eq(todoSubtasks.todoId, id))
      .orderBy(asc(todoSubtasks.position));

    const nextInstance = completingNow ? await generateSuccessorIfRecurring(userId, updated) : null;

    return NextResponse.json({
      ...serializeTodoTimestamps(updated),
      subtasks,
      tags: tagNames,
      nextInstance: nextInstance
        ? {
            ...serializeTodoTimestamps(nextInstance),
            subtasks: [],
          }
        : null,
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
