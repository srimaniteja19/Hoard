import { NextResponse } from "next/server";
import { fetchYouTubeTranscript } from "@/lib/youtube/transcript";
import { requireUserId, AuthError } from "@/lib/session";

export async function POST(req: Request) {
  try {
    await requireUserId(req);
    const body = await req.json();
    const { url, videoId, lang } = body || {};

    const target = url || videoId;
    if (!target) {
      return NextResponse.json(
        { error: "Missing required 'url' or 'videoId'" },
        { status: 400 }
      );
    }

    const transcript = await fetchYouTubeTranscript(target, { lang });
    if (!transcript) {
      return NextResponse.json(
        { error: "No captions or transcript found for this video" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, transcript });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[POST /api/youtube/transcript]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to extract transcript" },
      { status: 500 }
    );
  }
}
