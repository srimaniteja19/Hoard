import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getWeekBounds, computePostcardData } from "@/lib/scratch/postcard";
import {
  getSavedPostcard,
  savePostcard,
  getWeekScraps,
  getWeekTotal,
  getCurrentStreak,
} from "@/lib/dal/postcards";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json().catch(() => ({}));

    const targetDate = body.weekStart ? new Date(body.weekStart + "T12:00:00") : new Date();
    const { weekStart, weekEnd } = getWeekBounds(targetDate);

    const existing = await getSavedPostcard(userId, weekStart);
    if (existing) {
      return NextResponse.json(existing);
    }

    const weekScraps = await getWeekScraps(userId, weekStart, weekEnd);
    const data = computePostcardData(weekScraps);

    const prevTargetDate = new Date(weekStart + "T12:00:00");
    prevTargetDate.setDate(prevTargetDate.getDate() - 7);
    const prevBounds = getWeekBounds(prevTargetDate);
    const previousWeekTotal = await getWeekTotal(userId, prevBounds.weekStart, prevBounds.weekEnd);

    const today = new Date().toISOString().slice(0, 10);
    const streakAsOf = weekEnd < today ? weekEnd : today;
    const currentStreak = await getCurrentStreak(userId, streakAsOf);

    const created = await savePostcard({
      userId,
      weekStart,
      weekEnd,
      kindTallies: data.kindTallies,
      totalCount: data.totalCount,
      daysLogged: data.daysLogged,
      previousWeekTotal,
      currentStreak,
      highlightScrapId: data.highlight?.scrapId || null,
      highlightContent: data.highlight?.content || null,
      highlightKind: data.highlight?.kind || null,
    });

    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch/postcard]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
