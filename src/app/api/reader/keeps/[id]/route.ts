import { NextRequest, NextResponse } from "next/server";
import { getReaderUserId } from "@/lib/reader/sessionUser";
import { deleteReaderKeep } from "@/lib/dal/reader";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keepId } = await context.params;
    const userId = await getReaderUserId(req);

    const success = await deleteReaderKeep(userId, keepId);
    if (!success) {
      return NextResponse.json({ error: "Keep not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/reader/keeps/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete keep" }, { status: 500 });
  }
}
