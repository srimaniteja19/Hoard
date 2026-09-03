import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { updateCourse, deleteCourse } from "@/lib/dal/notebooks";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const success = await updateCourse(userId, id, {
      title: body.title,
      provider: body.provider,
      accent: body.accent,
      accentFg: body.accentFg,
      init: body.init,
      url: body.url,
    });

    if (!success) {
      return NextResponse.json({ error: "Course not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/notebooks/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const success = await deleteCourse(userId, id);
    if (!success) {
      return NextResponse.json({ error: "Course not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/notebooks/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
