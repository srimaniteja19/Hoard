import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { reorderLessons } from "@/lib/dal/notebooks";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const { courseId, sourceModuleId, targetModuleId, lessonId, newIndex } = body;

    if (!courseId || !sourceModuleId || !targetModuleId || !lessonId || typeof newIndex !== "number") {
      return NextResponse.json({ error: "Missing reorder parameters" }, { status: 400 });
    }

    const result = await reorderLessons(
      userId,
      courseId,
      sourceModuleId,
      targetModuleId,
      lessonId,
      newIndex
    );

    if (!result.success) {
      return NextResponse.json({ error: "Failed to reorder lessons" }, { status: 400 });
    }

    return NextResponse.json({ success: true, courses: result.courses });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/notebooks/lessons/reorder] Error:", err);
    return NextResponse.json({ error: "Failed to reorder lessons" }, { status: 500 });
  }
}
