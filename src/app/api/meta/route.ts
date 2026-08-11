import { NextResponse } from "next/server";
import { cleanTitle, decodeHtmlEntities, extractYouTubeVideoId } from "@/lib/cleanTitle";

function resolveUrl(candidate: string | null | undefined, base: string): string | null {
  if (!candidate) return null;
  try {
    const resolved = new URL(candidate.trim(), base);
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * GET /api/meta?url=<encoded-url>
 * Server-side metadata fetcher for YouTube, X (Twitter), GitHub, arXiv, and generic web pages.
 * Handles CORS avoidance, oEmbed APIs, high-res thumbnails, and stream buffering up to 512 KB.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let targetUrl: string;
  let urlObj: URL;
  try {
    targetUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    urlObj = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");

  // ─── 1. YouTube Specific Handling (oEmbed + Thumbnail fallback) ──────────────
  const ytVideoId = extractYouTubeVideoId(urlObj);
  if (ytVideoId || host.includes("youtube.com") || host.includes("youtu.be")) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
      const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        const rawTitle = data.title ? String(data.title) : null;
        const title = cleanTitle(rawTitle, targetUrl);
        const author = data.author_name ? String(data.author_name).trim() : null;
        const description = author ? `By ${author}` : null;
        const image = (data.thumbnail_url as string) || (ytVideoId ? `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg` : null);

        return NextResponse.json({
          title,
          description,
          image,
          ogType: "video.other",
        });
      }
    } catch {
      // Fall through to thumbnail fallback
    }

    if (ytVideoId) {
      return NextResponse.json({
        title: "YouTube Video",
        description: null,
        image: `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`,
        ogType: "video.other",
      });
    }
  }

  // ─── 2. X / Twitter Specific Handling (oEmbed) ──────────────────────────────
  if (host.includes("x.com") || host.includes("twitter.com")) {
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        const author = data.author_name ? String(data.author_name).trim() : null;
        const title = author ? `Post by ${author}` : "X Post";
        const description = data.html ? stripTags(decodeHtmlEntities(String(data.html))).slice(0, 300) : null;

        return NextResponse.json({
          title,
          description,
          image: null,
          ogType: "article",
        });
      }
    } catch {
      // Fall through to generic
    }
  }

  // ─── 3. GitHub Specific Handling (OpenGraph Asset Image) ───────────────────
  if (host.includes("github.com")) {
    const match = urlObj.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, "");
      const repoTitle = `${owner}/${repo}`;
      const ogImage = `https://opengraph.githubassets.com/1/${owner}/${repo}`;
      return NextResponse.json({
        title: repoTitle,
        description: `GitHub Repository: ${repoTitle}`,
        image: ogImage,
        ogType: "website",
      });
    }
  }

  // ─── 4. arXiv Specific Handling ────────────────────────────────────────────
  if (host.includes("arxiv.org")) {
    const match = urlObj.pathname.match(/\/(?:abs|pdf)\/([0-9]+\.[0-9]+|[a-z\-]+(?:\.[A-Z]+)?\/[0-9]+)/i);
    if (match) {
      const arxivId = match[1].replace(/\.pdf$/, "");
      try {
        const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const xml = await res.text();
          const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/gi);
          const rawTitle = titleMatch && titleMatch[1] ? stripTags(titleMatch[1]) : `arXiv:${arxivId}`;
          const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/i);
          const description = summaryMatch ? stripTags(decodeHtmlEntities(summaryMatch[1])).slice(0, 300) : null;

          return NextResponse.json({
            title: cleanTitle(rawTitle, targetUrl),
            description,
            image: null,
            ogType: "article",
          });
        }
      } catch {
        // Fall through
      }
    }
  }

  // ─── 5. Generic Web Scraper (HTML Head parsing with 512KB buffer) ───────────
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 HOARD/2.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ title: cleanTitle(null, targetUrl), description: null, image: null, ogType: null });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("xml")) {
      return NextResponse.json({ title: cleanTitle(null, targetUrl), description: null, image: null, ogType: null });
    }

    // Buffer up to 512 KB of head/HTML to avoid cutoff on heavy SSR pages
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let html = "";
    if (reader) {
      let totalBytes = 0;
      while (totalBytes < 524288) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: !done });
        totalBytes += value.byteLength;
        if (html.includes("</head>") || html.includes("</HEAD>")) break;
      }
      reader.cancel();
    }

    // Flexible meta tag property / content extractor
    const getMetaContent = (namesOrProps: string[]): string | null => {
      for (const key of namesOrProps) {
        // match property="key" content="val" OR content="val" property="key"
        const r1 = new RegExp(`<meta[^>]+(?:property|name)=["']?${key}["']?[^>]+content=["']([^"']+)["']`, "i");
        const m1 = html.match(r1);
        if (m1 && m1[1]) return m1[1];

        const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']?${key}["']?`, "i");
        const m2 = html.match(r2);
        if (m2 && m2[1]) return m2[1];
      }
      return null;
    };

    const ogTitle = getMetaContent(["og:title", "twitter:title", "title"]);
    const metaTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const rawTitle = ogTitle || metaTitle || null;
    const title = cleanTitle(rawTitle, targetUrl);

    const ogDescRaw = getMetaContent(["og:description", "twitter:description", "description"]);
    const description = ogDescRaw
      ? decodeHtmlEntities(stripTags(ogDescRaw)).slice(0, 400)
      : null;

    const ogType = getMetaContent(["og:type"]) || null;

    const ogImageRaw =
      getMetaContent(["og:image", "og:image:src", "og:image:url", "twitter:image", "twitter:image:src"]) ||
      html.match(/<link[^>]+rel=["'](?:apple-touch-icon|shortcut icon|icon)["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
      null;

    const image = resolveUrl(ogImageRaw, targetUrl);

    return NextResponse.json({ title, description, image, ogType }, { status: 200 });
  } catch {
    return NextResponse.json({
      title: cleanTitle(null, targetUrl),
      description: null,
      image: null,
      ogType: null,
    });
  }
}
