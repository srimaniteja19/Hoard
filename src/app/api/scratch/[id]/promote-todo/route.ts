import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { promoteScrapToTodo } from "@/lib/dal/scratch";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const result = await promoteScrapToTodo(userId, id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch/:id/promote-todo]", e);
    return NextResponse.json({ error: "Failed to promote scrap to Todo" }, { status: 500 });
  }
}
