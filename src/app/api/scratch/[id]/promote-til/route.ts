import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { promoteScrapToTil } from "@/lib/dal/scratch";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const result = await promoteScrapToTil(userId, id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch/:id/promote-til]", e);
    return NextResponse.json({ error: "Failed to promote scrap to TIL" }, { status: 500 });
  }
}
