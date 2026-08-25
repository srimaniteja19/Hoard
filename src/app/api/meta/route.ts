import { NextResponse } from "next/server";
import { fetchMetaForUrl } from "@/lib/fetchMeta";
import { requireUserId, AuthError } from "@/lib/session";

/**
 * GET /api/meta?url=<encoded-url>
 * Server-side metadata fetcher endpoint.
 */
export async function GET(req: Request) {
  try {
    await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let targetUrl: string;
    try {
      targetUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const meta = await fetchMetaForUrl(targetUrl);
    return NextResponse.json({
      title: meta.title,
      description: meta.description,
      image: meta.image,
      ogType: meta.ogType,
    }, { status: 200 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[GET /api/meta]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
