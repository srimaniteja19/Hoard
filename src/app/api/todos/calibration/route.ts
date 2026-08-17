import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserCalibration, getCalibrationSamples } from "@/lib/dal/todos";
import { calibration } from "@/lib/todos/calibration";

const SCATTER_POINT_CAP = 500;

// ─── GET /api/todos/calibration ─────────────────────────────────────────────
// TODOS.md §6 — returns null (not a fabricated number) below the sample
// floors calibration() enforces. Used by the settings toggle, the day-plan
// padding it feeds, and (with ?points=true) the history page's calibration
// scatter (§8), which needs the raw estimate/actual pairs, not just the
// aggregate multiplier.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const wantPoints = searchParams.get("points") === "true";

    if (wantPoints) {
      const samples = await getCalibrationSamples(userId);
      const result = calibration(samples);
      return NextResponse.json(
        { ...result, points: samples.slice(-SCATTER_POINT_CAP) },
        { headers: { "Cache-Control": "private, max-age=300" } }
      );
    }

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
