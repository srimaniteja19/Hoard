import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getTilEntriesByDateRange } from "@/lib/dal/til";
import { confidence } from "@/lib/til/confidence";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── GET /api/til/wall/entries?from=YYYY-MM-DD&to=YYYY-MM-DD ────────────────
//
// Entry bodies for a date range, fetched only when the Wall is in `content`
// mode and only for days in the current viewport (SPECTACLE.md §2). Never
// called in rhythm/composition mode — those only ever hit /api/til/wall.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
    }
    if (from > to) {
      return NextResponse.json({ error: "from must not be after to" }, { status: 400 });
    }

    const rows = await getTilEntriesByDateRange(userId, from, to);

    const items = rows.map((r) => {
      const stability = r.stability ?? 1;
      const lastReviewedAtDate = r.lastReviewedAt ?? r.createdAt;
      const confVal = confidence(stability, lastReviewedAtDate);

      return {
        ...r,
        stability,
        ease: r.ease ?? 2.5,
        reviewCount: r.reviewCount ?? 0,
        lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.toISOString() : null,
        nextReviewAt: r.nextReviewAt ? r.nextReviewAt.toISOString() : null,
        supersededById: r.supersededById || null,
        confidence: confVal,
        linkDensity: r.linkDensity || "card",
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/wall/entries]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
