import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getMonthHistory } from "@/lib/dal/todos";

// ─── GET /api/todos/history?year=&month= ────────────────────────────────────
// TODOS.md §8 — one grouped query for the month (see getMonthHistory),
// cached for the day so repeat visits to the same month don't re-run it.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const year = Number(searchParams.get("year")) || now.getFullYear();
    const month = Number(searchParams.get("month")) || now.getMonth() + 1;

    if (year < 2000 || year > 2100 || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const byDay = await getMonthHistory(userId, year, month);

    return NextResponse.json(
      { days: Array.from(byDay.values()) },
      // Same 5-minute private cache as /api/til/heatmap and
      // /api/todos/calibration — a full day's Cache-Control would show
      // stale data for the rest of the day after completing something.
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos/history]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
