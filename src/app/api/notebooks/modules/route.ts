import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { createModule } from "@/lib/dal/notebooks";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const courseId = body.courseId;
    const title = (body.title || "").trim();
    const targetPosition = typeof body.targetPosition === "number" ? body.targetPosition : undefined;

    if (!courseId || !title) {
      return NextResponse.json({ error: "courseId and title are required" }, { status: 400 });
    }

    const newModule = await createModule(userId, courseId, title, targetPosition);
    if (!newModule) {
      return NextResponse.json({ error: "Course not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ module: newModule });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/notebooks/modules] Error:", err);
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}
