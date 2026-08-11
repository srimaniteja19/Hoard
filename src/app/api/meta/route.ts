import { NextResponse } from "next/server";
import { fetchMetaForUrl } from "@/lib/fetchMeta";

/**
 * GET /api/meta?url=<encoded-url>
 * Server-side metadata fetcher endpoint.
 */
export async function GET(req: Request) {
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
}
