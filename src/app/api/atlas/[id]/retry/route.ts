import { NextResponse } from "next/server";
import { atlasNdjsonResponse, parsedFromAtlas, persistAtlasStream } from "@/lib/atlas/generate";
import { getAtlas } from "@/lib/dal/atlas";
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

    const parsed = parsedFromAtlas(atlas);
    return atlasNdjsonResponse(async (write) => {
      await persistAtlasStream({
        userId,
        row: atlas,
        parsed,
        prompt: atlas.prompt,
        existing: atlas.syllabus,
        write,
      });
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/atlas/[id]/retry]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
