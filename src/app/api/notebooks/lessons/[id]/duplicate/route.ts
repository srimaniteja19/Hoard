import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { duplicateLesson } from "@/lib/dal/notebooks";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const lesson = await duplicateLesson(userId, id);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lesson });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/notebooks/lessons/[id]/duplicate] Error:", err);
    return NextResponse.json({ error: "Failed to duplicate lesson" }, { status: 500 });
  }
}
