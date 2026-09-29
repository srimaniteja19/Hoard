import { NextResponse } from "next/server";
import { AuthError, requireUserId } from "@/lib/session";
import { createStudioItem, getStudioData, StudioRefError } from "@/lib/dal/studio";
import { createSchemas, isStudioKind } from "@/lib/studio/validate";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    return NextResponse.json(await getStudioData(userId));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[GET /api/studio]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Body: { kind: "pieces" | "series" | "ideas", data: {...} } */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = (await req.json().catch(() => null)) as { kind?: unknown; data?: unknown } | null;
    const kind = typeof body?.kind === "string" ? body.kind : "";
    if (!isStudioKind(kind)) return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    const parsed = createSchemas[kind].safeParse(body?.data ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
    }
    const item = await createStudioItem(userId, kind, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof StudioRefError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[POST /api/studio]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
