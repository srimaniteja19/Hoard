import { NextResponse } from "next/server";
import { cleanTitle } from "@/lib/cleanTitle";

/**
 * GET /api/meta?url=<encoded-url>
 * Fetches og:title, og:description, and <title> from a given URL
 * by proxy-fetching the HTML server-side (avoids CORS on the client).
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
    new URL(targetUrl); // validate
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HoardBot/1.0; +https://hoard.app) Googlebot/2.1",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ title: null, description: null }, { status: 200 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      return NextResponse.json({ title: null, description: null }, { status: 200 });
    }

    // Read first 32 KB — enough to capture <head> meta tags without full body
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let html = "";
    if (reader) {
      let totalBytes = 0;
      while (totalBytes < 32768) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: !done });
        totalBytes += value.byteLength;
      }
      reader.cancel();
    }

    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];

    const metaTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

    const ogDescription = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]
      ?? html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];

    const rawTitle = ogTitle || metaTitle || null;
    const title = cleanTitle(rawTitle, targetUrl);
    const description = ogDescription ? ogDescription.trim().replace(/\s+/g, " ").slice(0, 400) : null;

    return NextResponse.json({ title, description }, { status: 200 });
  } catch {
    // Timeout or network error — return null so caller falls back gracefully
    return NextResponse.json({ title: null, description: null }, { status: 200 });
  }
}
