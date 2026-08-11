/**
 * Smart Link & Bookmark Title Extraction / Cleaning Utility for HOARD
 */

// Decode HTML entities
export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Check if a title is generic or unhelpful
export function isGenericTitle(title?: string | null): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();

  if (!t || t.length === 0) return true;

  const genericTerms = new Set([
    "new bookmark",
    "untitled",
    "home",
    "home page",
    "index",
    "index of /",
    "404",
    "404 not found",
    "403 forbidden",
    "access denied",
    "just a moment...",
    "cloudflare",
    "attention required! | cloudflare",
    "login",
    "sign in",
    "error",
    "page not found",
    "security check",
    "null",
    "undefined",
    "imported link",
    "imported bookmark",
    "link",
    "bookmark",
  ]);

  if (genericTerms.has(t)) return true;

  // Starts with raw URL or www
  if (/^https?:\/\//i.test(t) || /^www\./i.test(t)) return true;

  return false;
}

// Strip query parameters and excess site branding from raw title
export function sanitizeTitleText(title: string): string {
  if (!title) return "";

  let cleaned = decodeHtmlEntities(title);

  // Strip query parameters accidentally attached to titles
  // e.g. "How the heck do solar panels work?utm source=substack&utm medium=email"
  cleaned = cleaned.replace(/\?(utm[ _]|ref=|fbclid=|gclid=|source=|mc_cid=).*/i, "");
  cleaned = cleaned.replace(/\b(utm_source|utm_medium|utm_campaign|utm_term|utm_content|fbclid|gclid)=[^&\s]*/gi, "");

  // Collapse excess whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Strip trailing site name suffix branding if title text is substantial
  // E.g., "Article Title | Substack" -> "Article Title"
  // E.g., "Article Title - YouTube" -> "Article Title"
  const suffixMatch = cleaned.match(/^(.+?)\s+[\-|•|—|\|]\s+(Substack|YouTube|Medium|GitHub|Dev\.to|Hashnode|Twitter|X)$/i);
  if (suffixMatch && suffixMatch[1].trim().length >= 5) {
    cleaned = suffixMatch[1].trim();
  }

  return cleaned;
}

// Extract YouTube video ID from various YouTube URL formats (watch?v=, youtu.be/, shorts/, embed/, v/)
export function extractYouTubeVideoId(rawUrl: string | URL): string | null {
  if (!rawUrl) return null;
  try {
    const urlObj = typeof rawUrl === "string"
      ? new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`)
      : rawUrl;

    const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes("youtube.com") && !host.includes("youtu.be")) {
      return null;
    }

    // 1. youtu.be/<id>
    if (host.includes("youtu.be")) {
      const id = urlObj.pathname.slice(1).split("/")[0].split("?")[0].split("#")[0];
      if (id && id.length >= 5) return id;
    }

    // 2. youtube.com/watch?v=<id>
    const vParam = urlObj.searchParams.get("v");
    if (vParam) return vParam.split("?")[0].split("&")[0];

    // 3. youtube.com/shorts/<id>, youtube.com/embed/<id>, youtube.com/v/<id>
    const match = urlObj.pathname.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

// Extract a clean human-friendly title from a URL when meta title is generic or missing
export function extractTitleFromUrl(rawUrl: string): string {
  if (!rawUrl) return "Untitled Link";

  try {
    const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const urlObj = new URL(fullUrl);
    const host = urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname;

    // 1. GitHub URLs (github.com/owner/repo)
    if (host.includes("github.com")) {
      const match = pathname.match(/^\/([^\/]+)\/([^\/]+)/);
      if (match) {
        const owner = match[1];
        const repo = match[2].replace(/\.git$/, "");
        return `${owner}/${repo}`;
      }
    }

    // 2. arXiv URLs (arxiv.org/abs/2005.11401)
    if (host.includes("arxiv.org")) {
      const match = pathname.match(/\/(?:abs|pdf)\/([0-9]+\.[0-9]+|[a-z\-]+(?:\.[A-Z]+)?\/[0-9]+)/i);
      if (match) {
        return `arXiv:${match[1].replace(/\.pdf$/, "")}`;
      }
    }

    // 3. YouTube URLs (youtube.com/watch?v=..., youtu.be/..., shorts/...)
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const ytId = extractYouTubeVideoId(fullUrl);
      if (ytId) return "YouTube Video";
    }

    // 4. Path-based slug extraction
    // Clean query parameters and hash fragments from URL pathname before splitting
    const segments = pathname
      .split("/")
      .map((s) => s.replace(/\?.*$/, "").replace(/#.*$/, ""))
      .filter((s) => Boolean(s) && !["p", "posts", "blog", "article", "entry", "index.html"].includes(s.toLowerCase()));

    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      const cleanSegment = lastSegment
        .replace(/\.(html?|php|md|pdf|aspx?)$/i, "")
        .replace(/[-_]/g, " ")
        .trim();

      if (cleanSegment && cleanSegment.length > 2 && !/^\d+$/.test(cleanSegment)) {
        // Capitalize words nicely
        return cleanSegment
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    // 5. Host domain fallback
    const domainName = host.split(".")[0];
    if (domainName) {
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }
    return host;
  } catch {
    return rawUrl.split("?")[0].split("/").pop() || "Untitled Link";
  }
}

/**
 * Main function: cleans raw title or extracts clean title from URL if missing or generic.
 */
export function cleanTitle(rawTitle?: string | null, rawUrl?: string | null): string {
  let title = rawTitle ? sanitizeTitleText(rawTitle) : "";

  if (!title || isGenericTitle(title)) {
    if (rawUrl) {
      title = extractTitleFromUrl(rawUrl);
    }
  }

  if (!title || title.trim().length === 0) {
    title = rawUrl ? extractTitleFromUrl(rawUrl) : "Untitled Link";
  }

  return title;
}
