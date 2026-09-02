import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  saveLessonBlocks,
  updateLesson,
  deleteLesson,
  toggleLessonWatched,
  clearLessonBlocks,
} from "@/lib/dal/notebooks";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json();

    // 1. Saving blocks (hot path for debounced note editor)
    if (body.blocks !== undefined) {
      const result = await saveLessonBlocks(userId, id, body.blocks, body.expectedUpdatedAt);
      if (result.conflict) {
        return NextResponse.json(
          { error: "conflict", wordCount: result.wordCount, updatedAt: result.updatedAt },
          { status: 409 }
        );
      }
      if (!result.success) {
        return NextResponse.json({ error: "Lesson not found or unauthorized" }, { status: 404 });
      }
      return NextResponse.json({ success: true, wordCount: result.wordCount, updatedAt: result.updatedAt });
    }

    // 2. Clearing all blocks
    if (body.clearNotes === true) {
      const success = await clearLessonBlocks(userId, id);
      return NextResponse.json({ success });
    }

    // 3. Toggling watched
    if (body.toggleWatched === true) {
      const success = await toggleLessonWatched(userId, id, body.watched);
      return NextResponse.json({ success, watched: success });
    }

    // 4. Updating metadata (title, gaps, etc.)
    const success = await updateLesson(userId, id, {
      title: body.title,
      gap: body.gap,
      lessonUrl: body.lessonUrl,
      coverUrl: body.coverUrl,
      icon: body.icon,
      watched: body.watched,
    });

    if (!success) {
      return NextResponse.json({ error: "Lesson not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/notebooks/lessons/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const success = await deleteLesson(userId, id);
    if (!success) {
      return NextResponse.json({ error: "Lesson not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/notebooks/lessons/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 });
  }
}
