import { NextResponse } from "next/server";
import { AuthError, requireUserId } from "@/lib/session";
import { parseStatsRange } from "@/lib/stats/computeStats";
import { getStatsOverview } from "@/lib/stats/queries";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const range = parseStatsRange(searchParams.get("range"));

    const data = await getStatsOverview(userId, range);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/stats]", e);
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }
}
