import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getSavedDigest, saveDigest, getAllSavedDigests, deleteSavedDigest } from "@/lib/dal/digests";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url") || searchParams.get("videoId");

    if (url) {
      const digest = await getSavedDigest(userId, url);
      return NextResponse.json({
        saved: Boolean(digest),
        digest: digest || null,
      });
    }

    const all = await getAllSavedDigests(userId);
    return NextResponse.json({
      items: all,
      videoIds: all.map((d) => d.videoId),
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const { url, videoId, title, author, content } = body || {};

    if (!url || !content) {
      return NextResponse.json(
        { error: "Missing required fields 'url' and 'content'" },
        { status: 400 }
      );
    }

    const saved = await saveDigest(userId, {
      url,
      videoId,
      title: title || "YouTube Digest",
      author,
      content,
    });

    return NextResponse.json({
      success: true,
      saved: true,
      digest: saved,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId") || searchParams.get("url");

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId parameter" }, { status: 400 });
    }

    await deleteSavedDigest(userId, videoId);
    return NextResponse.json({ success: true, saved: false });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
