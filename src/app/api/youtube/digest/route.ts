import { NextResponse } from "next/server";
import { streamYouTubeDigest, generateYouTubeDigest } from "@/lib/youtube/digest";
import { requireUserId, AuthError } from "@/lib/session";
import { gatewayErrorMessage } from "@/lib/ai/models";

export const maxDuration = 60; // Allow up to 60s for live stream

export async function POST(req: Request) {
  try {
    await requireUserId(req);
    const body = await req.json();
    const { url, videoId, lang, format } = body || {};

    const target = url || videoId;
    if (!target || typeof target !== "string") {
      return NextResponse.json(
        { error: "Missing required 'url' or 'videoId' field" },
        { status: 400 }
      );
    }

    if (format === "json") {
      const digest = await generateYouTubeDigest(target, { lang });
      return NextResponse.json(digest);
    }

    // Default: Stream the AI summary in real-time
    const { stream, meta } = await streamYouTubeDigest(target, { lang });

    return stream.toTextStreamResponse({
      headers: {
        "X-Video-Id": meta.videoId,
        "X-Video-Title": encodeURIComponent(meta.title),
        "X-Video-Author": encodeURIComponent(meta.author),
        "X-Video-Duration": String(meta.durationSec),
        "X-Video-Cues": String(meta.cuesCount),
        "X-Video-Words": String(meta.wordCount),
        "X-Has-Cues": String(meta.hasCues),
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[POST /api/youtube/digest]", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || err?.message || "Failed to generate YouTube digest" },
      { status: 500 }
    );
  }
}
