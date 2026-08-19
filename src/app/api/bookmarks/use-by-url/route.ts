import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { recordUse } from "@/lib/library/recordUse";

// ─── POST /api/bookmarks/use-by-url ──────────────────────────────────────────
// Records a "use" by URL rather than id — for callers (the extension's "MY
// HOARD" tab) that only have a locally-cached item without a real DB id.
// No-ops (still 200) when no match is found; this must never surface an
// error to a caller that's just trying to open a link.

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const url = typeof body.url === "string" ? body.url : "";

    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const [row] = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.url, url), isNull(bookmarks.deletedAt)))
      .limit(1);

    if (row) {
      await recordUse(row.id, userId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/bookmarks/use-by-url]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
