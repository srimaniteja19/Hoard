/**
 * Reader extraction and formatting utilities for HOARD Ghost Reader.
 */

export interface ParsedArticle {
  title?: string;
  byline?: string;
  content: string;
  wordCount: number;
  readMins: number;
  excerpt: string;
}

/**
 * Resolves relative image sources to absolute URLs and filters out tracker beacons/icons.
 */
export function resolveImageUrl(rawSrc: string, baseUrl?: string): string | null {
  if (!rawSrc || typeof rawSrc !== "string") return null;
  const src = rawSrc.trim();

  // Ignore 1x1 tracker pixels, common analytics, and avatar icons
  if (
    src.includes("1x1") ||
    src.includes("tracker") ||
    src.includes("pixel") ||
    src.includes("gravatar.com") ||
    src.includes("avatar") ||
    src.includes("favicon") ||
    src.includes("badge")
  ) {
    return null;
  }

  // Base64 data images or SVGs
  if (src.startsWith("data:image/")) {
    return src;
  }

  // Absolute URLs
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Protocol-relative URLs
  if (src.startsWith("//")) {
    return `https:${src}`;
  }

  // Relative URLs resolved against baseUrl
  if (baseUrl) {
    try {
      return new URL(src, baseUrl).href;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Sanitizes an inline SVG string for safe data:image/svg+xml embedding.
 */
export function sanitizeSvgToDataUri(svgContent: string): string | null {
  if (!svgContent || typeof svgContent !== "string") return null;

  // Ensure it's a meaningful graphic (not an icon or empty container)
  if (!svgContent.includes("<path") && !svgContent.includes("<circle") && !svgContent.includes("<rect") && !svgContent.includes("<g") && !svgContent.includes("<line")) {
    return null;
  }

  // Remove scripts, dangerous attributes
  const cleanSvg = svgContent
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .trim();

  if (!cleanSvg.startsWith("<svg")) return null;

  // Add xmlns if missing
  let withXmlns = cleanSvg;
  if (!withXmlns.includes('xmlns="http://www.w3.org/2000/svg"')) {
    withXmlns = withXmlns.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(withXmlns)}`;
}

/**
 * Extracts candidate image URL from an HTML snippet (checking src, data-src, srcset, data-lazy-src).
 */
function extractBestImageSrc(htmlSnippet: string): { src: string; alt: string } | null {
  // Check for picture/source srcset
  const srcsetMatch = htmlSnippet.match(/srcset=["']([^"'\s,]+)/i);
  const srcMatch =
    htmlSnippet.match(/(?:data-src|data-original|data-lazy-src|src)=["']([^"']+)["']/i) ||
    srcsetMatch;

  if (!srcMatch || !srcMatch[1]) return null;

  const altMatch = htmlSnippet.match(/alt=["']([^"']+)["']/i);
  const alt = altMatch && altMatch[1] ? altMatch[1].trim() : "";

  return {
    src: srcMatch[1].trim(),
    alt,
  };
}

/**
 * Strips noise, script tags, style blocks, navbars, ads, and extracts formatted article text,
 * illustrations, graphics, SVG diagrams, and interactive simulation widgets.
 */
export function extractArticleText(
  html: string,
  fallbackTitle?: string,
  baseUrl?: string
): ParsedArticle {
  if (!html || typeof html !== "string") {
    return {
      title: fallbackTitle || "Untitled Article",
      content: "No readable content found.",
      wordCount: 0,
      readMins: 1,
      excerpt: "",
    };
  }

  // 1. Extract Title if available
  let title = fallbackTitle;
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const rawTitle = titleMatch[1].trim();
    title = rawTitle.split(/\s+[-|–—]\s+/)[0] || rawTitle;
  }

  // 2. Extract Author / Byline
  let byline: string | undefined;
  const authorMatch =
    html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i) ||
    html.match(/class=["'][^"']*(?:author|byline)[^"']*["'][^>]*>([^<]+)</i);
  if (authorMatch && authorMatch[1]) {
    byline = authorMatch[1].trim();
  }

  // 3. Remove scripts and styles first (but keep SVGs and figures intact for graphics extraction)
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // 4. Capture <picture> elements
  clean = clean.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, (_match, pictureInner) => {
    const imgInfo = extractBestImageSrc(pictureInner);
    if (!imgInfo) return "";
    const resolved = resolveImageUrl(imgInfo.src, baseUrl);
    if (!resolved) return "";
    return `\n\n![${imgInfo.alt}](${resolved})\n\n`;
  });

  // 5. Capture <figure> elements (Handles images, SVGs, and interactive simulations/demos)
  clean = clean.replace(/<figure([^>]*)>([\s\S]*?)<\/figure>/gi, (_match, figureAttrs, figureInner) => {
    const captionMatch = figureInner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    const caption = captionMatch && captionMatch[1] ? captionMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    // Check for image inside figure
    const imgInfo = extractBestImageSrc(figureInner);
    if (imgInfo) {
      const resolved = resolveImageUrl(imgInfo.src, baseUrl);
      if (resolved) {
        const alt = caption || imgInfo.alt || "Article Illustration";
        return `\n\n![${alt}](${resolved})\n\n`;
      }
    }

    // Check for inline <svg> inside figure
    const svgMatch = figureInner.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      const svgUri = sanitizeSvgToDataUri(svgMatch[0]);
      if (svgUri) {
        const alt = caption || "Vector Diagram";
        return `\n\n![${alt}](${svgUri})\n\n`;
      }
    }

    // Check for interactive demo/widget/canvas (e.g. <figure class="article-demo ...">)
    const isInteractiveDemo =
      /class=["'][^"']*(?:demo|canvas|interactive|simulation|widget|chart|graph|elevator)[^"']*["']/i.test(figureAttrs) ||
      figureInner.includes("<canvas") ||
      figureInner.includes("article-demo");

    if (isInteractiveDemo) {
      const demoTitle = caption || "Interactive Simulation & Visual Demo";
      const targetUrl = baseUrl || "#";
      return `\n\n![Interactive Demo: ${demoTitle}](${targetUrl})\n\n`;
    }

    return "";
  });

  // 6. Capture standalone body SVGs (if they are diagrams, not tiny icons)
  clean = clean.replace(/<svg([^>]*)>([\s\S]*?)<\/svg>/gi, (fullSvg, svgAttrs) => {
    // Skip tiny 16px/24px button icons
    if (/width=["'](?:1\d|2[0-4])["']|height=["'](?:1\d|2[0-4])["']/i.test(svgAttrs)) {
      return " ";
    }
    const svgUri = sanitizeSvgToDataUri(fullSvg);
    if (svgUri) {
      return `\n\n![Vector Graphic](${svgUri})\n\n`;
    }
    return " ";
  });

  // 7. Capture standalone <img> elements
  clean = clean.replace(/<img([^>]+)>/gi, (_match, imgAttrs) => {
    // Skip if marked as tracking/avatar/tiny
    if (/width=["']1["']|height=["']1["']/i.test(imgAttrs)) return "";
    const imgInfo = extractBestImageSrc(imgAttrs);
    if (!imgInfo) return "";
    const resolved = resolveImageUrl(imgInfo.src, baseUrl);
    if (!resolved) return "";
    return `\n\n![${imgInfo.alt || "Article Image"}](${resolved})\n\n`;
  });

  // 8. Format headings, blockquotes, code blocks, lists, and paragraphs
  clean = clean
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, "\n\n#### $1\n\n")
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n\n```\n$1\n```\n\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n\n> $1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // 9. Strip all remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");

  // 10. Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#8217;/gi, "’")
    .replace(/&#8216;/gi, "‘")
    .replace(/&#8220;/gi, "“")
    .replace(/&#8221;/gi, "”")
    .replace(/&#8212;/gi, "—")
    .replace(/&#8211;/gi, "–");

  // 11. Clean up whitespace and empty lines
  const lines = clean.split("\n").map((l) => l.trim());
  const formattedParagraphs: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      formattedParagraphs.push(line);
      continue;
    }
    if (inCodeBlock) {
      formattedParagraphs.push(line);
      continue;
    }
    if (!line) continue;
    formattedParagraphs.push(line);
  }

  const content = formattedParagraphs.join("\n\n").trim();
  const words = content.replace(/!\[.*?\]\(.*?\)/g, "").split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readMins = Math.max(1, Math.round(wordCount / 200));
  const excerpt = words.slice(0, 40).join(" ") + (words.length > 40 ? "..." : "");

  return {
    title,
    byline,
    content: content || "No readable content could be extracted from this page.",
    wordCount,
    readMins,
    excerpt,
  };
}

/**
 * Formats a selected quote string into a clean Markdown blockquote for export or TIL creation.
 */
export function formatQuoteMarkdown(
  quoteText: string,
  title?: string,
  source?: string,
  url?: string
): string {
  const cleanQuote = quoteText.trim().replace(/^>\s*/, "");
  const attribution = source ? ` — ${source}` : title ? ` — ${title}` : "";
  const link = url ? ` (${url})` : "";

  return `> "${cleanQuote}"\n\n${attribution}${link}`.trim();
}
