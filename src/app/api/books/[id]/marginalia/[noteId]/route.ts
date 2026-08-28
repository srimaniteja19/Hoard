import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { updateMarginaliaNote, deleteMarginaliaNote } from "@/lib/dal/marginalia";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { noteId } = await params;
    const body = await req.json();

    const updated = await updateMarginaliaNote(userId, noteId, body);
    if (!updated) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/books/:id/marginalia/:noteId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { noteId } = await params;

    const success = await deleteMarginaliaNote(userId, noteId);
    if (!success) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/books/:id/marginalia/:noteId]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
