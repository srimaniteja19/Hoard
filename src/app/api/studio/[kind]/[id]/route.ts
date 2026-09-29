import { NextResponse } from "next/server";
import { AuthError, requireUserId } from "@/lib/session";
import { deleteStudioItem, StudioRefError, updateStudioItem } from "@/lib/dal/studio";
import { isStudioKind, patchSchemas } from "@/lib/studio/validate";

type Ctx = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { kind, id } = await params;
    if (!isStudioKind(kind)) return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    const parsed = patchSchemas[kind].safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
    }
    const item = await updateStudioItem(userId, kind, id, parsed.data);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof StudioRefError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[PATCH /api/studio/[kind]/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { kind, id } = await params;
    if (!isStudioKind(kind)) return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    const ok = await deleteStudioItem(userId, kind, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[DELETE /api/studio/[kind]/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
