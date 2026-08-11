import { KindType } from "@/types";

function hostnameOf(url: string): string {
  try {
    const withProto = url.startsWith("http") ? url : `https://${url}`;
    return new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Pass 1: URL-pattern classification. Only returns a kind when the URL
 * itself is a reliable signal (a known streaming host, a repo path, a docs
 * subdomain, an article/publishing site or post slug, ...) — returns null rather than guessing,
 * so callers can fall back to page metadata instead of forcing a wrong kind.
 */
export function detectKindFromUrl(url: string): KindType | null {
  const urlLower = url.toLowerCase().trim();
  if (!urlLower) return null;

  const hostname = hostnameOf(urlLower);

  if (/youtube\.com\/playlist/.test(urlLower)) return "PLY";
  if (hostname === "youtube.com" || hostname === "youtu.be") return "VID";
  if (hostname === "open.spotify.com" || hostname === "music.apple.com") return "PLY";
  if (/github\.com\/[\w.-]+\/[\w.-]+/.test(urlLower)) return "GIT";
  if (hostname === "arxiv.org" || /\.acm\.org$/.test(hostname) || /\.ieee\.org$/.test(hostname) || hostname === "ieee.org") return "PPR";
  if (
    hostname === "raycast.com" ||
    hostname === "warp.dev" ||
    hostname === "excalidraw.com" ||
    hostname === "apps.apple.com" ||
    hostname === "play.google.com"
  ) {
    return "APP";
  }
  if (hostname.startsWith("docs.") || hostname.startsWith("developer.") || /\/docs\//.test(urlLower)) return "DOC";

  // Known Article & Publishing Hosts
  const isPublishingHost =
    hostname === "lithub.com" ||
    hostname === "medium.com" ||
    hostname.endsWith(".medium.com") ||
    hostname === "substack.com" ||
    hostname.endsWith(".substack.com") ||
    hostname === "dev.to" ||
    hostname === "hashnode.com" ||
    hostname.endsWith(".hashnode.dev") ||
    hostname === "wordpress.com" ||
    hostname.endsWith(".wordpress.com") ||
    hostname.endsWith(".ghost.io") ||
    hostname === "theverge.com" ||
    hostname === "techcrunch.com" ||
    hostname === "wired.com" ||
    hostname === "arstechnica.com" ||
    hostname === "paulgraham.com" ||
    hostname === "hbr.org" ||
    hostname === "quantamagazine.org" ||
    hostname === "aeon.co" ||
    hostname.startsWith("blog.") ||
    hostname.startsWith("posts.");

  // Path-based article indicators (/posts/, /blog/, /article/, /story/, /essay/, date paths like /2026/08/)
  const hasArticlePath =
    /\/(?:posts?|blogs?|articles?|stories?|essays?|writing|notes|entry|read)\//i.test(urlLower) ||
    /\/\d{4}\/\d{2}\//.test(urlLower);

  // Check for multi-hyphen slug segment (e.g. /what-we-talk-about-when-we-talk-about-the-weather/)
  let hasHyphenatedSlug = false;
  try {
    const withProto = urlLower.startsWith("http") ? urlLower : `https://${urlLower}`;
    const pathname = new URL(withProto).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const lastSeg = segments[segments.length - 1] || "";
    // If the last path segment has 2 or more hyphens (3+ words) and isn't a file extension or query
    if (lastSeg.includes("-") && lastSeg.split("-").length >= 3 && !/\.(html?|php|png|jpg|json|css|js)$/i.test(lastSeg)) {
      hasHyphenatedSlug = true;
    }
  } catch {
    // ignore
  }

  if (isPublishingHost || hasArticlePath || hasHyphenatedSlug) {
    return "ART";
  }

  return null;
}

/**
 * Pass 2: og:type-informed fallback for anything pass 1 couldn't confidently
 * classify from the URL alone.
 */
export function detectKindFromMetadata(ogType: string | null | undefined): KindType {
  const t = (ogType || "").toLowerCase().trim();
  if (t.startsWith("video")) return "VID";
  if (t.startsWith("music")) return "PLY";
  if (t === "article" || t === "book" || t === "blog" || t === "news" || t === "post") return "ART";
  return "APP";
}

/**
 * Full two-pass classification: URL first, og:type second.
 */
export function detectKind(url: string, ogType?: string | null): KindType {
  return detectKindFromUrl(url) ?? detectKindFromMetadata(ogType);
}
