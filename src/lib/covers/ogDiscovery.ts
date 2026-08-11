/**
 * OG Image Discovery Module (§3.1)
 * Discovers the best candidate OG image URL from page HTML.
 */

export interface OgImageCandidate {
  url: string;
  width?: number;
  height?: number;
}

function resolveUrl(candidate: string | null | undefined, base: string): string | null {
  if (!candidate || !candidate.trim()) return null;
  try {
    const resolved = new URL(candidate.trim(), base);
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function getMetaContent(html: string, propName: string): string | null {
  const r1 = new RegExp(`<meta[^>]+(?:property|name)=["']?${propName}["']?[^>]+content=["']([^"']+)["']`, "i");
  const m1 = html.match(r1);
  if (m1 && m1[1]) return m1[1];

  const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']?${propName}["']?`, "i");
  const m2 = html.match(r2);
  if (m2 && m2[1]) return m2[1];

  return null;
}

/**
 * Parses HTML to discover candidate OG image in priority order:
 * 1. og:image:secure_url -> 2. og:image -> 3. twitter:image -> 4. link[rel=image_src] ->
 * 5. first <img> in body >= 400x200 -> 6. null.
 */
export function discoverOgImageCandidate(html: string, baseUrl: string): OgImageCandidate | null {
  if (!html || !html.trim()) return null;

  // 1. og:image:secure_url
  const ogSecure = getMetaContent(html, "og:image:secure_url");
  let resolved = resolveUrl(ogSecure, baseUrl);
  if (resolved) return buildCandidate(resolved, html);

  // 2. og:image
  const ogImg = getMetaContent(html, "og:image") || getMetaContent(html, "og:image:url") || getMetaContent(html, "og:image:src");
  resolved = resolveUrl(ogImg, baseUrl);
  if (resolved) return buildCandidate(resolved, html);

  // 3. twitter:image
  const twImg = getMetaContent(html, "twitter:image") || getMetaContent(html, "twitter:image:src");
  resolved = resolveUrl(twImg, baseUrl);
  if (resolved) return buildCandidate(resolved, html);

  // 4. link[rel=image_src]
  const linkMatch = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
                    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);
  if (linkMatch && linkMatch[1]) {
    resolved = resolveUrl(linkMatch[1], baseUrl);
    if (resolved) return buildCandidate(resolved, html);
  }

  // 5. First <img> in article body >= 400x200 if specified
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const m of imgMatches) {
    const src = m[1];
    const fullTag = m[0];

    const wMatch = fullTag.match(/\bwidth=["']?(\d+)["']?/i);
    const hMatch = fullTag.match(/\bheight=["']?(\d+)["']?/i);

    const width = wMatch ? parseInt(wMatch[1], 10) : undefined;
    const height = hMatch ? parseInt(hMatch[1], 10) : undefined;

    if (width !== undefined && height !== undefined) {
      if (width < 400 || height < 200) continue;
    }

    resolved = resolveUrl(src, baseUrl);
    if (resolved && !resolved.endsWith(".svg")) {
      return { url: resolved, width, height };
    }
  }

  return null;
}

function buildCandidate(url: string, html: string): OgImageCandidate {
  const wStr = getMetaContent(html, "og:image:width");
  const hStr = getMetaContent(html, "og:image:height");

  const width = wStr && !isNaN(parseInt(wStr, 10)) ? parseInt(wStr, 10) : undefined;
  const height = hStr && !isNaN(parseInt(hStr, 10)) ? parseInt(hStr, 10) : undefined;

  return { url, width, height };
}
