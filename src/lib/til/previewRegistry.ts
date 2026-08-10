import { LinkPreview } from "@/db/schema";
import { validateUrlForSsrf, fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";
import { enrichRepoCoverData } from "@/lib/cover-data";

export interface PreviewProvider {
  providerName: LinkPreview["provider"];
  defaultDensity: "inline" | "card" | "quote" | "full";
  matches(url: URL): boolean;
  fetch(url: URL): Promise<LinkPreview>;
}

// ─── String Sanitizer ────────────────────────────────────────────────────────
function sanitizeString(str?: string | null, maxLength = 300): string | undefined {
  if (!str) return undefined;
  const clean = str
    .replace(/<[^>]+>/g, "") // Strip HTML tags
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
  return clean ? clean.slice(0, maxLength) : undefined;
}

// ─── 1. YouTube Provider ─────────────────────────────────────────────────────
export const youtubeProvider: PreviewProvider = {
  providerName: "YOUTUBE",
  defaultDensity: "full",
  matches(url: URL) {
    const host = url.hostname.toLowerCase();
    return host.includes("youtube.com") || host.includes("youtu.be");
  },
  async fetch(url: URL): Promise<LinkPreview> {
    const targetUrlStr = url.toString();
    const fetchedAt = new Date().toISOString();

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrlStr)}&format=json`;
      const ssrfCheck = await validateUrlForSsrf(oembedUrl);
      if (!ssrfCheck.allowed) throw new Error("SSRF check blocked YouTube oEmbed");

      const res = await fetchWithSsrfGuard(oembedUrl);
      if (!res.ok) throw new Error("YouTube oEmbed request failed");

      const data = JSON.parse(res.text);
      const title = sanitizeString(data.title) || targetUrlStr;
      const author = sanitizeString(data.author_name);

      let durationSec: number | undefined;
      // Extract video ID for YouTube Data API duration lookup if key is present
      const videoId =
        url.searchParams.get("v") || (url.hostname.includes("youtu.be") ? url.pathname.slice(1) : undefined);

      if (videoId && process.env.YOUTUBE_API_KEY) {
        try {
          const apiRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${process.env.YOUTUBE_API_KEY}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            const durationIso = apiData.items?.[0]?.contentDetails?.duration;
            if (durationIso) {
              const match = durationIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (match) {
                const hours = parseInt(match[1] || "0", 10);
                const mins = parseInt(match[2] || "0", 10);
                const secs = parseInt(match[3] || "0", 10);
                durationSec = hours * 3600 + mins * 60 + secs;
              }
            }
          }
        } catch {
          // ignore API error fallback
        }
      }

      return {
        provider: "YOUTUBE",
        kind: "video",
        url: targetUrlStr,
        canonicalUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : targetUrlStr,
        title,
        description: author ? `By ${author}` : undefined,
        host: "youtube.com",
        durationSec,
        author,
        meta: {
          videoId: videoId || "",
        },
        fetchedAt,
      };
    } catch {
      return {
        provider: "YOUTUBE",
        kind: "video",
        url: targetUrlStr,
        title: targetUrlStr,
        host: "youtube.com",
        fetchedAt,
        failed: true,
        meta: {},
      };
    }
  },
};

// ─── 2. GitHub Provider ──────────────────────────────────────────────────────
export const githubProvider: PreviewProvider = {
  providerName: "GITHUB",
  defaultDensity: "card",
  matches(url: URL) {
    return url.hostname.toLowerCase().includes("github.com");
  },
  async fetch(url: URL): Promise<LinkPreview> {
    const targetUrlStr = url.toString();
    const fetchedAt = new Date().toISOString();

    const match = targetUrlStr.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (!match) {
      return {
        provider: "GITHUB",
        kind: "repo",
        url: targetUrlStr,
        title: targetUrlStr,
        host: "github.com",
        fetchedAt,
        failed: true,
        meta: {},
      };
    }

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "").replace(/#.*$/, "").replace(/\?.*$/, "");

    try {
      // Reuse existing GitHub fetch logic from cover-data.ts
      const coverData = await enrichRepoCoverData(targetUrlStr);

      const primaryLang =
        coverData.kind === "REPO" && coverData.languages?.[0]?.[0]
          ? coverData.languages[0][0]
          : "Code";

      return {
        provider: "GITHUB",
        kind: "repo",
        url: targetUrlStr,
        canonicalUrl: `https://github.com/${owner}/${repo}`,
        title: `${owner}/${repo}`,
        description: `GitHub repository: ${primaryLang}`,
        host: "github.com",
        author: owner,
        meta: {
          owner,
          repo,
          language: primaryLang,
          pushedDaysAgo: coverData.kind === "REPO" ? coverData.pushedDaysAgo : 1,
        },
        fetchedAt,
      };
    } catch {
      return {
        provider: "GITHUB",
        kind: "repo",
        url: targetUrlStr,
        title: `${owner}/${repo}`,
        host: "github.com",
        fetchedAt,
        failed: true,
        meta: {},
      };
    }
  },
};

// ─── 3. arXiv Provider ──────────────────────────────────────────────────────
export const arxivProvider: PreviewProvider = {
  providerName: "ARXIV",
  defaultDensity: "card",
  matches(url: URL) {
    return url.hostname.toLowerCase().includes("arxiv.org");
  },
  async fetch(url: URL): Promise<LinkPreview> {
    const targetUrlStr = url.toString();
    const fetchedAt = new Date().toISOString();

    const idMatch = targetUrlStr.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+|[a-z\-]+(?:\.[A-Z]+)?\/[0-9]+)/i);
    const arxivId = idMatch ? idMatch[1].replace(/\.pdf$/, "") : null;

    if (!arxivId) {
      return {
        provider: "ARXIV",
        kind: "paper",
        url: targetUrlStr,
        title: targetUrlStr,
        host: "arxiv.org",
        fetchedAt,
        failed: true,
        meta: {},
      };
    }

    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
      const ssrfCheck = await validateUrlForSsrf(apiUrl);
      if (!ssrfCheck.allowed) throw new Error("SSRF check blocked arXiv API");

      const res = await fetchWithSsrfGuard(apiUrl);
      if (!res.ok) throw new Error("arXiv API failed");

      const xml = res.text;
      const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/gi);
      const title = titleMatch && titleMatch[1] ? sanitizeString(titleMatch[1].replace(/<title>|<\/title>/gi, "")) : `arXiv:${arxivId}`;

      const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/i);
      const description = summaryMatch ? sanitizeString(summaryMatch[1], 250) : undefined;

      const authorMatches = Array.from(xml.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>/gi)).map((m) => m[1]);
      const author = authorMatches.slice(0, 3).join(", ") + (authorMatches.length > 3 ? " et al." : "");

      const publishedMatch = xml.match(/<published>(\d{4})/);
      const year = publishedMatch ? parseInt(publishedMatch[1], 10) : new Date().getFullYear();

      return {
        provider: "ARXIV",
        kind: "paper",
        url: targetUrlStr,
        canonicalUrl: `https://arxiv.org/abs/${arxivId}`,
        title: title || `arXiv:${arxivId}`,
        description,
        host: "arxiv.org",
        author,
        meta: {
          arxivId,
          year,
          authorsCount: authorMatches.length,
        },
        fetchedAt,
      };
    } catch {
      return {
        provider: "ARXIV",
        kind: "paper",
        url: targetUrlStr,
        title: `arXiv:${arxivId}`,
        host: "arxiv.org",
        fetchedAt,
        failed: true,
        meta: {},
      };
    }
  },
};

// ─── 4. X (Twitter) Provider ────────────────────────────────────────────────
export const xProvider: PreviewProvider = {
  providerName: "X",
  defaultDensity: "quote",
  matches(url: URL) {
    const host = url.hostname.toLowerCase();
    return host.includes("x.com") || host.includes("twitter.com");
  },
  async fetch(url: URL): Promise<LinkPreview> {
    const targetUrlStr = url.toString();
    const fetchedAt = new Date().toISOString();

    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(targetUrlStr)}`;
      const ssrfCheck = await validateUrlForSsrf(oembedUrl);
      if (!ssrfCheck.allowed) throw new Error("SSRF check blocked X oEmbed");

      const res = await fetchWithSsrfGuard(oembedUrl);
      if (!res.ok) throw new Error("X oEmbed request failed");

      const data = JSON.parse(res.text);
      const author = sanitizeString(data.author_name);

      // Strip HTML tags from oembed html to get post text
      const htmlText = data.html ? sanitizeString(data.html, 280) : undefined;

      return {
        provider: "X",
        kind: "post",
        url: targetUrlStr,
        title: author ? `Post by ${author}` : "X Post",
        description: htmlText,
        host: "x.com",
        author,
        meta: {},
        fetchedAt,
      };
    } catch {
      return {
        provider: "X",
        kind: "post",
        url: targetUrlStr,
        title: targetUrlStr,
        host: "x.com",
        fetchedAt,
        failed: true,
        meta: {},
      };
    }
  },
};

// ─── 5. Generic Provider ─────────────────────────────────────────────────────
export const genericProvider: PreviewProvider = {
  providerName: "GENERIC",
  defaultDensity: "card",
  matches() {
    return true; // Fallback for all URLs
  },
  async fetch(url: URL): Promise<LinkPreview> {
    const targetUrlStr = url.toString();
    const fetchedAt = new Date().toISOString();
    const host = url.hostname.replace(/^www\./, "");

    try {
      const ssrfCheck = await validateUrlForSsrf(targetUrlStr);
      if (!ssrfCheck.allowed) throw new Error("SSRF check failed for target URL");

      const res = await fetchWithSsrfGuard(targetUrlStr);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const html = res.text;

      // Extract og:title or <title>
      const ogTitle =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
      const metaTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
      const title = sanitizeString(ogTitle || metaTitle) || host;

      // Extract og:description or description
      const ogDescription =
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
      const description = sanitizeString(ogDescription, 200);

      // Estimate read time (words / 200)
      const cleanText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const words = cleanText.split(" ").length;
      const readMins = Math.max(1, Math.round(words / 200));

      return {
        provider: "GENERIC",
        kind: "article",
        url: targetUrlStr,
        title,
        description,
        host,
        durationSec: readMins * 60,
        meta: {
          readMins,
        },
        fetchedAt,
      };
    } catch {
      return {
        provider: "GENERIC",
        kind: "article",
        url: targetUrlStr,
        title: targetUrlStr,
        host,
        fetchedAt,
        failed: true,
        meta: {},
      };
    }
  },
};

// ─── Provider Registry Router ────────────────────────────────────────────────
const PROVIDERS: PreviewProvider[] = [
  youtubeProvider,
  githubProvider,
  arxivProvider,
  xProvider,
  genericProvider,
];

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return {
      provider: "GENERIC",
      kind: "article",
      url: rawUrl,
      title: rawUrl,
      host: "invalid-url",
      fetchedAt: new Date().toISOString(),
      failed: true,
      meta: {},
    };
  }

  const provider = PROVIDERS.find((p) => p.matches(parsedUrl)) || genericProvider;
  return provider.fetch(parsedUrl);
}
