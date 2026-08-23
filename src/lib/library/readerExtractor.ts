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
 * Strips noise, script tags, style blocks, navbars, ads, and extracts formatted article text.
 */
export function extractArticleText(html: string, fallbackTitle?: string): ParsedArticle {
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
    // Clean common suffixes like " | Hacker News", " - Medium", etc.
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

  // 3. Remove non-content blocks
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // 4. Format headings, blockquotes, code blocks, lists, and paragraphs
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

  // 5. Strip all remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");

  // 6. Decode common HTML entities
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

  // 7. Clean up whitespace and empty lines
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
  const words = content.split(/\s+/).filter(Boolean);
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
