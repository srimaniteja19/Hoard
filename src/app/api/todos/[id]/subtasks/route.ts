import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, todoSubtasks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { createSubtaskSchema } from "@/lib/validations/todos";

// ─── POST /api/todos/:id/subtasks ───────────────────────────────────────────

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const rawBody = await req.json();

    const parseResult = createSubtaskSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const owned = await db
      .select({ id: todos.id })
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);

    if (owned.length === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const [{ nextPosition }] = await db
      .select({ nextPosition: sql<number>`coalesce(max(${todoSubtasks.position}), -1) + 1` })
      .from(todoSubtasks)
      .where(eq(todoSubtasks.todoId, id));

    const [inserted] = await db
      .insert(todoSubtasks)
      .values({ todoId: id, title: parseResult.data.title, position: nextPosition })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/todos/[id]/subtasks]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
