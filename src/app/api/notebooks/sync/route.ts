import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { syncLocalCoursesToDb } from "@/lib/dal/notebooks";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const courses = body.courses || [];
    const collisions = body.collisions;

    const savedCourses = await syncLocalCoursesToDb(userId, courses, collisions);

    return NextResponse.json({ success: true, courses: savedCourses });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/notebooks/sync] Error:", err);
    return NextResponse.json({ error: "Failed to sync notebooks" }, { status: 500 });
  }
}
