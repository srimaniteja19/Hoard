import { ReaderBlock, ReaderDensity, ReaderIssueStatus, ReaderLink } from "@/types/reader";

/**
 * Splits a paragraph into lede (first sentence) and rest (subsequent sentences).
 * The p/lede/rest split is what allows SKIM density to hide .rest via CSS.
 */
export function splitLedeAndRest(text: string): { lede: string; rest: string } {
  const clean = text.trim();
  if (!clean) return { lede: "", rest: "" };

  // Match period, question mark, or exclamation mark followed by optional closing tags and whitespace/end
  const sentenceEndPattern = /([.?!])((?:<\/[a-z0-9]+>)*)(?:\s+|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = sentenceEndPattern.exec(clean)) !== null) {
    const candidateIdx = match.index + match[1].length + (match[2] ? match[2].length : 0);
    const prefix = clean.slice(0, candidateIdx);

    // Skip common abbreviations like e.g., i.e., vs., etc.
    const textWithoutTags = prefix.replace(/<[^>]*>/g, "");
    if (/(?:e\.g|i\.e|vs|etc|dr|mr|mrs|prof)\.$/i.test(textWithoutTags)) {
      continue;
    }

    const lede = clean.slice(0, candidateIdx).trim();
    const rest = clean.slice(candidateIdx); // Keep rest
    return { lede, rest };
  }

  return { lede: clean, rest: "" };
}

/**
 * Estimates read minutes from word count.
 * Standard average reading speed: ~220 words per minute.
 */
export function estimateReadMinutes(wordCount: number): number {
  if (!wordCount || wordCount <= 0) return 1;
  return Math.max(1, Math.round(wordCount / 220));
}

/**
 * Counts words in a string, stripping out any HTML tags.
 */
export function countWords(content: string): number {
  const textOnly = content.replace(/<[^>]*>/g, " ").trim();
  if (!textOnly) return 0;
  return textOnly.split(/\s+/).filter(Boolean).length;
}

/**
 * Status is derived, never a column:
 * function status(i: Issue) {
 *   if (!i.closedAt) return "unread";
 *   if (i.keeps.length) return "kept";
 *   if (i.density === "skim") return "skimmed";
 *   return "nothing";
 * }
 */
export function status(i: {
  closedAt?: Date | string | null;
  keeps?: Array<unknown> | null;
  keptCount?: number | null;
  density?: string | null;
}): ReaderIssueStatus {
  if (!i.closedAt) return "unread";
  const hasKeeps =
    (Array.isArray(i.keeps) && i.keeps.length > 0) ||
    (typeof i.keptCount === "number" && i.keptCount > 0);
  if (hasKeeps) return "kept";
  if (i.density === "skim") return "skimmed";
  return "nothing";
}

/**
 * Derives the issue status.
 * STATUS IS DERIVED, NEVER STORED AS A MUTABLE ARBITRARY FLAG:
 * - unread: never closed / opened
 * - skimmed: closed at density 1 (skim) with 0 keeps
 * - kept: keptCount > 0 or keeps.length > 0
 * - nothing: closed at density 2/3 with 0 keeps ("Read, kept nothing")
 */
export function deriveIssueStatus(i: {
  closedAt?: Date | string | null;
  keeps?: Array<unknown> | null;
  keptCount?: number | null;
  density?: ReaderDensity | string | null;
  wasClosed?: boolean;
  currentStatus?: ReaderIssueStatus;
}): ReaderIssueStatus {
  const hasKeeps =
    (Array.isArray(i.keeps) && i.keeps.length > 0) ||
    (typeof i.keptCount === "number" && i.keptCount > 0);

  if (hasKeeps) {
    return "kept";
  }

  const isClosed = Boolean(i.closedAt || i.wasClosed);
  if (!isClosed) {
    return i.currentStatus === "unread" || !i.currentStatus ? "unread" : i.currentStatus;
  }

  if (i.density === "skim") {
    return "skimmed";
  }
  return "nothing";
}

export interface ParsedNewsletter {
  blocks: ReaderBlock[] | null;
  links: ReaderLink[];
  wordCount: number;
  readMinutes: number;
  dek: string | null;
  title?: string | null;
}

/**
 * Parses a newsletter into Block[] JSON using @mozilla/readability and linkedom.
 * Strips table scaffolding, extracts links, computes wordCount, splits paragraphs
 * at first sentence into lede / rest.
 * Store blocks: null when parsing fails so reader enters preview-only state.
 */
export function parseNewsletter(raw: string): ParsedNewsletter {
  if (!raw || !raw.trim()) {
    return { blocks: null, links: [], wordCount: 0, readMinutes: 0, dek: null };
  }

  let html = raw.trim();
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!isHtml) {
    html = `<!DOCTYPE html><html><head><title>Email</title></head><body>${html
      .split(/\n\s*\n/)
      .map((p) => `<p>${p}</p>`)
      .join("")}</body></html>`;
  }

  try {
    // Dynamic import / require of linkedom and Readability
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseHTML } = require("linkedom");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Readability } = require("@mozilla/readability");

    const { document } = parseHTML(html);
    const reader = new Readability(document, { charThreshold: 20 });
    const article = reader.parse();

    if (!article || !article.content) {
      return { blocks: null, links: [], wordCount: 0, readMinutes: 0, dek: null };
    }

    const contentDom = parseHTML(`<!DOCTYPE html><html><body>${article.content}</body></html>`);

    // Extract links
    const links: ReaderLink[] = [];
    const linkEls = contentDom.document.querySelectorAll("a[href]");
    for (const a of linkEls) {
      const href = a.getAttribute("href");
      const title = a.textContent?.trim();
      if (href && title && !href.startsWith("#") && !href.startsWith("mailto:")) {
        if (/unsubscribe|preferences|manage-subscription/i.test(href) || /unsubscribe/i.test(title)) {
          continue;
        }
        let source = "LINK";
        try {
          const u = new URL(href);
          source = u.hostname.replace(/^www\./, "").toUpperCase().split(".")[0];
        } catch {}
        if (!links.some((l) => l.url === href)) {
          links.push({ title, source, url: href });
        }
      }
    }

    // Walk surviving DOM nodes
    const blocks: ReaderBlock[] = [];
    let figCounter = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any) {
      for (const child of node.children) {
        const tag = child.tagName?.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
          const text = child.textContent?.trim();
          if (text) blocks.push({ type: "h", text });
        } else if (tag === "p" || tag === "blockquote") {
          const text = child.textContent?.trim();
          if (text && text.length > 2) {
            const { lede, rest } = splitLedeAndRest(text);
            blocks.push({ type: "p", lede, rest });
          }
        } else if (tag === "ul" || tag === "ol") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = Array.from(child.querySelectorAll("li"))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((li: any) => li.textContent?.trim())
            .filter(Boolean);
          if (items.length) blocks.push({ type: "ul", items });
        } else if (tag === "figure") {
          const figCap = child.querySelector("figcaption");
          const caption = figCap ? figCap.textContent?.trim() : "";
          const figureId = child.getAttribute("id") || `fig-${figCounter++}`;
          blocks.push({ type: "fig", figureId, caption });
        } else if (child.children?.length > 0) {
          walk(child);
        }
      }
    }

    const root = contentDom.document.querySelector("#readability-page-1") || contentDom.document.body;
    walk(root);

    if (blocks.length === 0) {
      return { blocks: null, links: [], wordCount: 0, readMinutes: 0, dek: null };
    }

    let wordCount = 0;
    for (const b of blocks) {
      if (b.type === "p") {
        wordCount += (b.lede + " " + b.rest).split(/\s+/).filter(Boolean).length;
      } else if (b.type === "h") {
        wordCount += b.text.split(/\s+/).filter(Boolean).length;
      } else if (b.type === "ul") {
        wordCount += b.items.join(" ").split(/\s+/).filter(Boolean).length;
      }
    }

    const readMinutes = Math.max(1, Math.round(wordCount / 220));
    const dek = article.excerpt?.trim() || null;

    return { blocks, links, wordCount, readMinutes, dek, title: article.title || null };
  } catch (err) {
    console.error("parseNewsletter error:", err);
    return { blocks: null, links: [], wordCount: 0, readMinutes: 0, dek: null };
  }
}

/**
 * Parses raw HTML / newsletter body into structured Block[] JSON.
 * Body is a Block[] JSON array, never an HTML string.
 */
export function parseHtmlToBlocks(html: string): ReaderBlock[] {
  if (!html || !html.trim()) return [];

  const blocks: ReaderBlock[] = [];

  // Remove script and style tags completely
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Match top-level blocks: h1-h6, p, ul, ol, figure, blockquote
  const blockRegex =
    /<(h[1-6]|p|ul|ol|figure|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(sanitized)) !== null) {
    lastIndex = blockRegex.lastIndex;
    const tag = match[1].toLowerCase();
    const content = match[2].trim();

    if (!content) continue;

    if (tag.startsWith("h")) {
      const headingText = content.replace(/<[^>]*>/g, "").trim();
      if (headingText) {
        blocks.push({ type: "h", text: headingText });
      }
    } else if (tag === "ul" || tag === "ol") {
      const liMatches = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      const items = liMatches
        .map((li) => li.replace(/<\/?li[^>]*>/gi, "").trim())
        .filter(Boolean);
      if (items.length > 0) {
        blocks.push({ type: "ul", items });
      }
    } else if (tag === "figure") {
      const figCapMatch = content.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
      const caption = figCapMatch ? figCapMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      const figIdMatch = content.match(/id=["']([^"']+)["']/i);
      const figureId = figIdMatch ? figIdMatch[1] : "figure";
      blocks.push({ type: "fig", figureId, caption });
    } else {
      // p or blockquote
      const { lede, rest } = splitLedeAndRest(content);
      if (lede) {
        blocks.push({ type: "p", lede, rest });
      }
    }
  }

  // If no HTML block tags were matched, split text by double newlines into paragraphs
  if (blocks.length === 0) {
    const rawParagraphs = sanitized
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const para of rawParagraphs) {
      if (para.startsWith("#")) {
        const text = para.replace(/^#+\s*/, "").trim();
        blocks.push({ type: "h", text });
      } else if (para.startsWith("- ") || para.startsWith("* ")) {
        const items = para
          .split(/\n/)
          .map((line) => line.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean);
        blocks.push({ type: "ul", items });
      } else {
        const { lede, rest } = splitLedeAndRest(para);
        if (lede) {
          blocks.push({ type: "p", lede, rest });
        }
      }
    }
  }

  return blocks;
}
