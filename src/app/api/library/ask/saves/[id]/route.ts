import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { askSaves } from "@/db/schema";
import { AuthError, requireUserId } from "@/lib/session";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const [deleted] = await db
      .delete(askSaves)
      .where(and(eq(askSaves.id, id), eq(askSaves.userId, userId)))
      .returning({ id: askSaves.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/library/ask/saves/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
