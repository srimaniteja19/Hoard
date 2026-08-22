import { NextResponse } from "next/server";
import { applyStationPatch } from "@/lib/atlas/apply";
import { nextStatusAfterCheck } from "@/lib/atlas/progress";
import { getAtlas, saveAtlas } from "@/lib/dal/atlas";
import { AuthError, requireUserId } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; stationId: string }> },
) {
  try {
    const userId = await requireUserId(req);
    const { id, stationId } = await params;
    const atlas = await getAtlas(userId, id);
    if (!atlas) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody: unknown = await req.json();
    const body = rawBody !== null && typeof rawBody === "object" && !Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>)
      : {};

    const patch: { state?: "OPEN" | "DONE"; note?: string | null } = {};
    if (body.state === "OPEN" || body.state === "DONE") {
      patch.state = body.state;
    } else if (body.state !== undefined) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    if (body.note === null || typeof body.note === "string") {
      patch.note = body.note;
    } else if (body.note !== undefined) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const before = atlas.syllabus.stations.find((s) => s.id === stationId);
    const next = applyStationPatch(atlas.syllabus, stationId, patch, new Date().toISOString());
    if (!next) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const after = next.stations.find((s) => s.id === stationId);
    const becameDone = before?.state !== "DONE" && after?.state === "DONE";
    const saved = await saveAtlas(userId, id, {
      syllabus: next,
      ...(becameDone ? { status: nextStatusAfterCheck(atlas.status) } : {}),
    });
    if (!saved) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ atlas: saved });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/atlas/[id]/stations/[stationId]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
