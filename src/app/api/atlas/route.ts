import { NextResponse } from "next/server";
import { listForDesk } from "@/lib/atlas/apply";
import { parseAtlas } from "@/lib/atlas/parse";
import type { AtlasCadence, AtlasDepth, AtlasStationDraft, AtlasWeekDraft, ParsedAtlas } from "@/lib/atlas/types";
import { validateSyllabus, weeklyBudgetMinutes } from "@/lib/atlas/validate";
import { insertDraft, listAtlases } from "@/lib/dal/atlas";
import { AuthError, requireUserId } from "@/lib/session";

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

function draftFromClientSyllabus(raw: unknown, parsed: ParsedAtlas): {
  title: string;
  brief: string;
  antiScope: string[];
  weeks: AtlasWeekDraft[];
  stations: AtlasStationDraft[];
} | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    title: typeof o.title === "string" ? o.title : "Filing…",
    brief: typeof o.brief === "string" ? o.brief : "",
    antiScope: Array.isArray(o.antiScope)
      ? o.antiScope.filter((part): part is string => typeof part === "string")
      : parsed.antiScope,
    weeks: Array.isArray(o.weeks) ? (o.weeks as AtlasWeekDraft[]) : [],
    stations: Array.isArray(o.stations) ? (o.stations as AtlasStationDraft[]) : [],
  };
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

    let title: string | undefined;
    let brief: string | undefined;
    let syllabus;

    if (body.syllabus !== undefined) {
      const draft = draftFromClientSyllabus(body.syllabus, parsed);
      if (!draft) {
        return NextResponse.json({ error: "Validation error" }, { status: 400 });
      }
      syllabus = validateSyllabus(draft, parsed.cadence, parsed.minutesPerSession);
      title = draft.title;
      brief = draft.brief;
    } else {
      syllabus = {
        thin: false,
        hoursPerWeek: weeklyBudgetMinutes(parsed.minutesPerSession, parsed.cadence) / 60,
        weeks: [],
        stations: [],
      };
    }

    const atlas = await insertDraft({
      userId,
      parsed,
      prompt,
      syllabus,
      model: "",
      title,
      brief,
    });

    return NextResponse.json({ atlas }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/atlas]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
