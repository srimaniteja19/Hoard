import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserTimezone, getTilHeatmap } from "@/lib/dal/til";

export async function GET() {
  try {
    const userId = await requireUserId();
    const timezone = await getUserTimezone(userId);

    const heatmap = await getTilHeatmap(userId, timezone);

    return NextResponse.json(heatmap, {
      headers: {
        "Cache-Control": "private, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/heatmap]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
