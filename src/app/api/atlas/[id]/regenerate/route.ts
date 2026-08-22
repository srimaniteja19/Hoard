import { NextResponse } from "next/server";
import { canRegenerate } from "@/lib/atlas/apply";
import {
  ATLAS_MODEL,
  atlasNdjsonResponse,
  emptyAtlasSyllabus,
  parsedFromAtlas,
  persistAtlasStream,
} from "@/lib/atlas/generate";
import { getAtlas, saveAtlas } from "@/lib/dal/atlas";
import { AuthError, requireUserId } from "@/lib/session";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const atlas = await getAtlas(userId, id);
    if (!atlas) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canRegenerate(atlas.status)) {
      return NextResponse.json({ error: "Fork it." }, { status: 409 });
    }

    const parsed = parsedFromAtlas(atlas);
    const wiped = await saveAtlas(userId, id, {
      title: "Filing…",
      brief: "",
      currentWeekId: null,
      model: ATLAS_MODEL,
      syllabus: emptyAtlasSyllabus(parsed),
    });
    if (!wiped) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return atlasNdjsonResponse(async (write) => {
      await persistAtlasStream({
        userId,
        row: wiped,
        parsed,
        prompt: atlas.prompt,
        write,
      });
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/atlas/[id]/regenerate]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
