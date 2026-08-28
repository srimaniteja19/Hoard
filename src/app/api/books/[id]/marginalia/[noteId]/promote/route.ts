import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { promoteMarginaliaToTil, promoteMarginaliaToTodo } from "@/lib/dal/marginalia";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { noteId } = await params;
    const body = await req.json().catch(() => ({}));

    const target = body.target || "TIL";

    if (target === "TODO") {
      const result = await promoteMarginaliaToTodo(userId, noteId);
      return NextResponse.json(result);
    }

    const result = await promoteMarginaliaToTil(userId, noteId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/books/:id/marginalia/:noteId/promote]", e);
    return NextResponse.json({ error: "Failed to promote marginalia" }, { status: 500 });
  }
}
