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
 * subdomain, ...) — returns null rather than guessing, so callers can fall
 * back to page metadata instead of forcing a wrong kind.
 *
 * Host checks are exact-hostname matches, not substring tests: a `.test()`
 * against the raw URL for "spotify" also matches a marketing page hosted at
 * `xirp.spotify.com`, which is not a music link.
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

  return null;
}

/**
 * Pass 2: og:type-informed fallback for anything pass 1 couldn't confidently
 * classify from the URL alone. Defaults to APP rather than ART — an
 * unrecognized site (a SaaS tool, a dashboard, a marketing page) is far more
 * often a "tool/app" than a long-form article, and ART carries specific UI
 * implications (word count, reading time estimate) that actively mislead for
 * a tool.
 */
export function detectKindFromMetadata(ogType: string | null | undefined): KindType {
  const t = (ogType || "").toLowerCase().trim();
  if (t.startsWith("video")) return "VID";
  if (t.startsWith("music")) return "PLY";
  if (t === "article" || t === "book") return "ART";
  return "APP";
}

/**
 * Full two-pass classification: URL first, og:type second. `ogType` may be
 * omitted when metadata hasn't been fetched yet (e.g. a live preview while
 * the user is still typing a URL) — the result is then whatever pass 1 found,
 * or APP as the safe default.
 */
export function detectKind(url: string, ogType?: string | null): KindType {
  return detectKindFromUrl(url) ?? detectKindFromMetadata(ogType);
}
