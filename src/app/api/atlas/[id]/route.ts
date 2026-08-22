import { NextResponse } from "next/server";
import { applyArchive, applyPin, applyRestore } from "@/lib/atlas/apply";
import { deleteAtlas, getAtlas, saveAtlas } from "@/lib/dal/atlas";
import { AuthError, requireUserId } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const atlas = await getAtlas(userId, id);
    if (!atlas) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ atlas });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/atlas/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const atlas = await getAtlas(userId, id);
    if (!atlas) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody: unknown = await req.json();
    const body = rawBody !== null && typeof rawBody === "object" && !Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>)
      : {};

    if (body.status === "drop") {
      if (atlas.status === "walking") {
        return NextResponse.json({ error: "Cannot drop a walking atlas." }, { status: 409 });
      }
      await deleteAtlas(userId, id);
      return new NextResponse(null, { status: 204 });
    }

    if (body.status === "archived") {
      const saved = await saveAtlas(userId, id, { status: applyArchive(atlas.status) });
      if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ atlas: saved });
    }

    if (body.status === "restore") {
      const saved = await saveAtlas(userId, id, { status: applyRestore(atlas.status, atlas.syllabus) });
      if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ atlas: saved });
    }

    if (body.status !== undefined) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    if (body.currentWeekId !== undefined) {
      if (typeof body.currentWeekId !== "string") {
        return NextResponse.json({ error: "Validation error" }, { status: 400 });
      }
      const pinned = applyPin(body.currentWeekId, atlas.syllabus);
      if (!pinned) {
        return NextResponse.json({ error: "Week not found." }, { status: 400 });
      }
      const saved = await saveAtlas(userId, id, { currentWeekId: pinned });
      if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ atlas: saved });
    }

    return NextResponse.json({ atlas });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/atlas/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
