import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserTimezone, getTilStreak } from "@/lib/dal/til";

export async function GET() {
  try {
    const userId = await requireUserId();
    const timezone = await getUserTimezone(userId);

    const streak = await getTilStreak(userId, timezone);

    return NextResponse.json(streak);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/streak]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
