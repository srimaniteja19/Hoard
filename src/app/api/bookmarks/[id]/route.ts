import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { KindType } from "@/types";

type Params = { params: Promise<{ id: string }> };

// ─── PATCH /api/bookmarks/[id] ───────────────────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const numId = parseInt(id, 10);
    const body = await req.json();

    const updates: Partial<typeof bookmarks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof body.unread    === "boolean") updates.unread       = body.unread;
    if (typeof body.note      === "string")  updates.note         = body.note;
    if (typeof body.coll      === "string")  updates.collectionId = body.coll;
    if (typeof body.title     === "string")  updates.title        = body.title;
    if (typeof body.tag       === "string")  updates.tag          = body.tag;
    if (typeof body.ty        === "string")  updates.type         = body.ty as KindType;

    await db
      .update(bookmarks)
      .set(updates)
      .where(and(eq(bookmarks.id, numId), eq(bookmarks.userId, userId)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[PATCH /api/bookmarks/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/bookmarks/[id] ──────────────────────────────────────────────

export async function DELETE(req: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const numId = parseInt(id, 10);

    await db
      .update(bookmarks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(bookmarks.id, numId), eq(bookmarks.userId, userId)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[DELETE /api/bookmarks/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
