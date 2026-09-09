import { ReaderBlock, ReaderDensity, ReaderIssueStatus } from "@/types/reader";

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
 * Derives the issue status.
 * STATUS IS DERIVED, NEVER STORED AS AN ARBITRARY FLAG:
 * - unread: never closed / opened
 * - skimmed: closed at density 1 (skim) with 0 keeps
 * - kept: keptCount > 0
 * - nothing: closed at density 2/3 with 0 keeps ("Read, kept nothing")
 */
export function deriveIssueStatus(params: {
  keptCount: number;
  density?: ReaderDensity;
  wasClosed: boolean;
  currentStatus?: ReaderIssueStatus;
}): ReaderIssueStatus {
  if (params.keptCount > 0) {
    return "kept";
  }
  if (!params.wasClosed) {
    return params.currentStatus === "unread" || !params.currentStatus
      ? "unread"
      : params.currentStatus;
  }
  if (params.density === "skim") {
    return "skimmed";
  }
  return "nothing";
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
