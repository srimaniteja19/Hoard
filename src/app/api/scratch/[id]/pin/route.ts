import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { togglePinScrap } from "@/lib/dal/scratch";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const updated = await togglePinScrap(userId, id);
    if (!updated) {
      return NextResponse.json({ error: "Scrap not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch/:id/pin]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
