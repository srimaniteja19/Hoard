import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { gatewayErrorMessage } from "@/lib/ai/models";
import { resolveAuthenticChapters } from "@/lib/marginalia/chapterExtractor";

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const body = await req.json();
    const { title, author } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const result = await resolveAuthenticChapters(title.trim(), author?.trim() || undefined);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
