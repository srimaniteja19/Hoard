import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserCalibration } from "@/lib/dal/todos";

// ─── GET /api/todos/calibration ─────────────────────────────────────────────
// TODOS.md §6 — returns null (not a fabricated number) below the sample
// floors calibration() enforces. Used by the settings toggle and by the
// day-plan padding it feeds.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const result = await getUserCalibration(userId);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/todos/calibration]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
