import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { weldScraps } from "@/lib/dal/scratch";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json();

    const summary = body.sourceId || body.summary || "earlier collision";
    const result = await weldScraps(userId, id, summary);
    if (!result) {
      return NextResponse.json({ error: "Scrap not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch/:id/weld]", e);
    return NextResponse.json({ error: "Failed to weld scrap" }, { status: 500 });
  }
}
