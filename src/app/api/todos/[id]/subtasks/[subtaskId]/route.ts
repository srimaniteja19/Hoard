import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, todoSubtasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { updateSubtaskSchema } from "@/lib/validations/todos";

async function ownedSubtask(userId: string, todoId: string, subtaskId: string) {
  const rows = await db
    .select({ id: todoSubtasks.id })
    .from(todoSubtasks)
    .innerJoin(todos, eq(todoSubtasks.todoId, todos.id))
    .where(and(eq(todoSubtasks.id, subtaskId), eq(todoSubtasks.todoId, todoId), eq(todos.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

// ─── PATCH /api/todos/:id/subtasks/:subtaskId ───────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id, subtaskId } = await params;
    const rawBody = await req.json();

    const parseResult = updateSubtaskSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    if (!(await ownedSubtask(userId, id, subtaskId))) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const updatePayload: Partial<typeof todoSubtasks.$inferInsert> = {};
    if (parseResult.data.title !== undefined) updatePayload.title = parseResult.data.title;
    if (parseResult.data.done !== undefined) updatePayload.done = parseResult.data.done;

    const [updated] = await db
      .update(todoSubtasks)
      .set(updatePayload)
      .where(eq(todoSubtasks.id, subtaskId))
      .returning();

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/todos/[id]/subtasks/[subtaskId]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/todos/:id/subtasks/:subtaskId ──────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id, subtaskId } = await params;

    if (!(await ownedSubtask(userId, id, subtaskId))) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    await db.delete(todoSubtasks).where(eq(todoSubtasks.id, subtaskId));

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/todos/[id]/subtasks/[subtaskId]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
