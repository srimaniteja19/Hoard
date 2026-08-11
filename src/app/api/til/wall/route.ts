import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserTimezone, getTilWallAggregate } from "@/lib/dal/til";
import { encodeWallAggregate } from "@/lib/til/wallWireFormat";

// ─── GET /api/til/wall ───────────────────────────────────────────────────────
//
// One row per active day over a rolling year, as a compact date-keyed map of
// [count, typeCode] tuples (see lib/til/wallWireFormat.ts) — this is the entire
// data cost of the Year Wall in rhythm/composition mode, no entry bodies are
// ever fetched here (SPECTACLE.md §2). Cached the same way the sibling
// /api/til/heatmap route is: a short private TTL, since this data only needs
// to be fresh within a few minutes of a write, not instantly.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const timezone = await getUserTimezone(userId);

    const days = await getTilWallAggregate(userId, timezone);

    return NextResponse.json(encodeWallAggregate(days), {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/wall]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
