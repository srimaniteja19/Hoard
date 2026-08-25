import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getRandomBuriedScrap } from "@/lib/dal/scratch";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const scrap = await getRandomBuriedScrap(userId);
    return NextResponse.json({ scrap });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/scratch/seance]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
