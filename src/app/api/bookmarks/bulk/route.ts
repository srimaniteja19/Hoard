import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";

// ─── PATCH /api/bookmarks/bulk  (mark read) ──────────────────────────────────
// Body: { ids: number[], unread: boolean }

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const { ids, unread } = await req.json() as { ids: number[]; unread: boolean };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    await db
      .update(bookmarks)
      .set({ unread, updatedAt: new Date() })
      .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.id, ids)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[PATCH /api/bookmarks/bulk]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/bookmarks/bulk (bulk soft-delete) ───────────────────────────
// Body: { ids: number[] }

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { ids } = await req.json() as { ids: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    await db
      .update(bookmarks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.id, ids)));

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[DELETE /api/bookmarks/bulk]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
