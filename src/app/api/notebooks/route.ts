import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getOrSeedUserNotebookCourses, createCourse } from "@/lib/dal/notebooks";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const data = await getOrSeedUserNotebookCourses(userId);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/notebooks] Error:", err);
    return NextResponse.json({ error: "Failed to fetch notebooks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const course = await createCourse(userId, {
      title,
      provider: body.provider,
      accent: body.accent,
      accentFg: body.accentFg,
      init: body.init,
      url: body.url,
    });

    return NextResponse.json({ course });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/notebooks] Error:", err);
    return NextResponse.json({ error: "Failed to create notebook course" }, { status: 500 });
  }
}
