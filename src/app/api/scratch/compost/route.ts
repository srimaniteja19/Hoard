import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { buryScraps, keepScraps } from "@/lib/dal/scratch";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const { action, ids } = body;

    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ error: "No scrap IDs provided" }, { status: 400 });
    }

    if (action === "keep") {
      const count = await keepScraps(userId, ids);
      return NextResponse.json({ success: true, count });
    } else {
      const count = await buryScraps(userId, ids);
      return NextResponse.json({ success: true, count });
    }
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch/compost]", e);
    return NextResponse.json({ error: "Failed to process compost action" }, { status: 500 });
  }
}
