import { NextResponse } from "next/server";
import { listForDesk } from "@/lib/atlas/apply";
import {
  ATLAS_MODEL,
  atlasNdjsonResponse,
  emptyAtlasSyllabus,
  persistAtlasStream,
} from "@/lib/atlas/generate";
import { parseAtlas } from "@/lib/atlas/parse";
import type { AtlasCadence, AtlasDepth } from "@/lib/atlas/types";
import { insertDraft, listAtlases } from "@/lib/dal/atlas";
import { AuthError, requireUserId } from "@/lib/session";

export const maxDuration = 60;

const DEPTHS = new Set<AtlasDepth>(["tourist", "working", "dangerous"]);
const CADENCES = new Set<AtlasCadence>(["weeknights", "weekends", "daily"]);

function chipsFromBody(body: Record<string, unknown>): {
  depth?: AtlasDepth;
  cadence?: AtlasCadence;
  antiScope?: string;
} {
  const chips: { depth?: AtlasDepth; cadence?: AtlasCadence; antiScope?: string } = {};
  if (typeof body.depth === "string" && DEPTHS.has(body.depth as AtlasDepth)) {
    chips.depth = body.depth as AtlasDepth;
  }
  if (typeof body.cadence === "string" && CADENCES.has(body.cadence as AtlasCadence)) {
    chips.cadence = body.cadence as AtlasCadence;
  }
  if (typeof body.antiScope === "string") {
    chips.antiScope = body.antiScope;
  } else if (Array.isArray(body.antiScope)) {
    chips.antiScope = body.antiScope.filter((part): part is string => typeof part === "string").join(",");
  }
  return chips;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const archived = searchParams.get("archived") === "1";
    const rows = await listAtlases(userId, archived);
    return NextResponse.json({ atlases: listForDesk(rows, archived) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/atlas]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rawBody: unknown = await req.json();
    const body = rawBody !== null && typeof rawBody === "object" && !Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>)
      : {};

    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Say what you want to learn." }, { status: 422 });
    }

    const parsed = parseAtlas(prompt, chipsFromBody(body));
    if (parsed.topic === "") {
      return NextResponse.json({ error: "Say what you want to learn." }, { status: 422 });
    }

    const atlas = await insertDraft({
      userId,
      parsed,
      prompt,
      syllabus: emptyAtlasSyllabus(parsed),
      model: ATLAS_MODEL,
    });

    return atlasNdjsonResponse(async (write) => {
      write({ type: "row", id: atlas.id, serial: atlas.serial });
      await persistAtlasStream({
        userId,
        row: atlas,
        parsed,
        prompt,
        write,
      });
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/atlas]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
