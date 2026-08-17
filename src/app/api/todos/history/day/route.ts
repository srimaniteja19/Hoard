import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getDayRecord } from "@/lib/dal/todos";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── GET /api/todos/history/day?date=YYYY-MM-DD ─────────────────────────────

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: "Invalid or missing date" }, { status: 400 });
    }

    const record = await getDayRecord(userId, date);
    return NextResponse.json(record);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos/history/day]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
