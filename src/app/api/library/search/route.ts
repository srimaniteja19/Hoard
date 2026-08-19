import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { searchLibrary } from "@/lib/library/searchLibrary";

// ─── GET /api/library/search ──────────────────────────────────────────────
// The single ranked full-text search endpoint (LIBRARY.md §4) — shared by
// the web ⌘K palette and the extension's popup search. Do not build a
// second search implementation; extend this one.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    if (!q) {
      return NextResponse.json([]);
    }

    const results = await searchLibrary(userId, q, limit);
    return NextResponse.json(results);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[GET /api/library/search]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
