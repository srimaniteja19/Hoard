import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { recordUse } from "@/lib/library/recordUse";

type Params = { params: Promise<{ id: string }> };

// ─── POST /api/bookmarks/[id]/use ────────────────────────────────────────────
// Records a "use" (LIBRARY.md §2) — called from every real open-source-URL
// action in the web app.

export async function POST(req: Request, { params }: Params) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const numId = parseInt(id, 10);

    await recordUse(numId, userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/bookmarks/[id]/use]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
