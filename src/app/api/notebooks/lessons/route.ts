import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { createLesson } from "@/lib/dal/notebooks";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json().catch(() => ({}));

    const moduleId = body.moduleId;
    const title = (body.title || "").trim();
    const targetPosition = typeof body.targetPosition === "number" ? body.targetPosition : undefined;

    if (!moduleId || !title) {
      return NextResponse.json({ error: "moduleId and title are required" }, { status: 400 });
    }

    const lesson = await createLesson(userId, moduleId, title, body.blocks, targetPosition, {
      id: body.id,
      coverUrl: body.coverUrl,
      icon: body.icon,
      lessonUrl: body.lessonUrl,
    });
    if (!lesson) {
      return NextResponse.json({ error: "Module not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/notebooks/lessons] Error:", err);
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
  }
}
