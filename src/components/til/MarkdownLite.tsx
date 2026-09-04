import React from "react";

interface MarkdownLiteProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  validHashes?: Set<string> | string[];
  as?: "span" | "div";
}

/**
 * Renders markdown-lite content safely into React elements.
 * Supports:
 * - Bulleted lists: lines starting with *, -, •, or multiple bullet points
 * - Numbered lists: lines starting with 1., 2., etc.
 * - Inline code: `code`
 * - Bold: **text**
 * - Italic: *text* (word-bounded, does not greedily span across lines or bullet marks)
 * - Links: [title](url)
 * - Cross-references: #a3f9 (rendered as anchor links if hash is in validHashes, otherwise plain text)
 *
 * Sanitized by design: plain text is rendered as React children (no dangerouslySetInnerHTML).
 */
export const MarkdownLite: React.FC<MarkdownLiteProps> = ({
  content,
  className,
  style,
  validHashes,
  as,
}) => {
  const validHashSet = React.useMemo(() => {
    if (!validHashes) return new Set<string>();
    if (validHashes instanceof Set) return validHashes;
    return new Set(validHashes.map((h) => h.toLowerCase()));
  }, [validHashes]);

  if (!content) return null;

  // Helper for inline text segments (links, bold, italic, cross-refs)
  const renderTextSegment = (text: string, keyPrefix: string): React.ReactNode[] => {
    // Matches: [title](url), **bold**, *italic* (non-greedy, non-newline, not surrounded by spaces), #hash
    // Italic only matches when preceded by start of line or space or punctuation, and followed by space or punctuation or end
    const combinedRegex = /(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|\*\*[^*\n]+\*\*|(?<=\s|^|\W)\*[^*\s\n][^*\n]*?[^*\s\n]\*(?=\s|\W|$)|(?<=\s|^|\W)\*[^*\s\n]\*(?=\s|\W|$)|#[0-9a-fA-F]{4}\b)/g;
    const parts = text.split(combinedRegex);

    return parts.map((part, idx) => {
      const key = `${keyPrefix}-${idx}`;

      // Link: [title](url)
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)$/);
      if (linkMatch) {
        const [, title, url] = linkMatch;
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="til-markdown-link"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: "var(--accent, #00F0FF)",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >
            {title}
          </a>
        );
      }

      // Bold: **text**
      const boldMatch = part.match(/^\*\*([^*\n]+)\*\*$/);
      if (boldMatch) {
        return <strong key={key} style={{ fontWeight: 800 }}>{boldMatch[1]}</strong>;
      }

      // Italic: *text*
      const italicMatch = part.match(/^\*([^*\s\n][^*\n]*?[^*\s\n]|[^*\s\n])\*$/);
      if (italicMatch) {
        return <em key={key} style={{ fontStyle: "italic" }}>{italicMatch[1]}</em>;
      }

      // Cross-reference #hash (e.g. #a3f9)
      const hashMatch = part.match(/^#([0-9a-fA-F]{4})$/);
      if (hashMatch) {
        const hash = hashMatch[1].toLowerCase();
        if (validHashSet.has(hash)) {
          return (
            <a
              key={key}
              href={`#til-${hash}`}
              className="til-crossref-link"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: "var(--mono)",
                fontWeight: 800,
                color: "var(--ink)",
                textDecoration: "underline",
                background: "rgba(0, 240, 255, 0.2)",
                padding: "0 3px",
                border: "1px solid var(--ink)",
                borderRadius: "2px",
              }}
              title={`Jump to TIL #${hash}`}
            >
              #{hash}
            </a>
          );
        }
        return <React.Fragment key={key}>{`#${hash}`}</React.Fragment>;
      }

      // Plain text
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  };

  // Helper for inline rendering (code blocks + text segments)
  const renderInline = (lineContent: string, prefix: string): React.ReactNode[] => {
    const codeParts = lineContent.split(/(`[^`\n]+`)/g);

    return codeParts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        const codeContent = part.slice(1, -1);
        return (
          <code
            key={`${prefix}-code-${index}`}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.88em",
              background: "rgba(0, 0, 0, 0.15)",
              padding: "2px 5px",
              border: "1px solid var(--ink)",
              borderRadius: "2px",
              color: "var(--ink)",
            }}
          >
            {codeContent}
          </code>
        );
      }
      return renderTextSegment(part, `${prefix}-seg-${index}`);
    });
  };

  // Check if content contains list items or multiline structures
  const hasBullets = /(?:^|\n|\s)[*•-]\s+/.test(content);
  const hasNumbered = /(?:^|\n)\d+\.\s+/.test(content);
  const lines = content.split("\n");

  // If no bullet markers and only 1 line, render simple inline span
  if (!hasBullets && !hasNumbered && lines.length <= 1) {
    return (
      <span className={className} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", ...style }}>
        {renderInline(content, "root")}
      </span>
    );
  }

  // Block-level parsing: collect paragraphs, bullet lists, and numbered lists
  type Block =
    | { type: "paragraph"; text: string }
    | { type: "bullet-list"; items: string[] }
    | { type: "numbered-list"; items: string[] };

  const blocks: Block[] = [];
  let currentBulletList: string[] | null = null;
  let currentNumberedList: string[] | null = null;

  const flushLists = () => {
    if (currentBulletList && currentBulletList.length > 0) {
      blocks.push({ type: "bullet-list", items: currentBulletList });
      currentBulletList = null;
    }
    if (currentNumberedList && currentNumberedList.length > 0) {
      blocks.push({ type: "numbered-list", items: currentNumberedList });
      currentNumberedList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushLists();
      continue;
    }

    // Check if line contains inline multiple bullets, e.g. "* item 1 * item 2"
    const inlineBulletMatches = (trimmed.match(/(?:^|\s)[*•-]\s+/g) || []).length;
    if (inlineBulletMatches > 1) {
      flushLists();
      const parts = trimmed.split(/(?:^|\s)[*•-]\s+/).map((p) => p.trim()).filter(Boolean);
      blocks.push({ type: "bullet-list", items: parts });
      continue;
    }

    // Check single bullet line
    const bulletMatch = trimmed.match(/^[-*•]\s+([\s\S]*)$/);
    if (bulletMatch) {
      if (currentNumberedList) flushLists();
      if (!currentBulletList) currentBulletList = [];
      currentBulletList.push(bulletMatch[1].trim());
      continue;
    }

    // Check numbered list line
    const numberedMatch = trimmed.match(/^\d+\.\s+([\s\S]*)$/);
    if (numberedMatch) {
      if (currentBulletList) flushLists();
      if (!currentNumberedList) currentNumberedList = [];
      currentNumberedList.push(numberedMatch[1].trim());
      continue;
    }

    // Regular line
    flushLists();
    blocks.push({ type: "paragraph", text: trimmed });
  }
  flushLists();

  const Container = as === "span" ? "span" : "div";

  return (
    <Container className={className} style={{ wordBreak: "break-word", ...style }}>
      {blocks.map((block, bIdx) => {
        if (block.type === "bullet-list") {
          return (
            <ul key={`b-${bIdx}`} className="til-bullet-list">
              {block.items.map((item, itemIdx) => (
                <li key={`b-${bIdx}-${itemIdx}`} className="til-bullet-item">
                  <span className="til-bullet-pip" aria-hidden="true" />
                  <span className="til-bullet-text">
                    {renderInline(item, `b-${bIdx}-${itemIdx}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered-list") {
          return (
            <ol key={`b-${bIdx}`} className="til-numbered-list" style={{ paddingLeft: "20px", margin: "0 0 12px 0" }}>
              {block.items.map((item, itemIdx) => (
                <li key={`b-${bIdx}-${itemIdx}`} style={{ marginBottom: "6px", lineHeight: 1.45 }}>
                  {renderInline(item, `b-${bIdx}-${itemIdx}`)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <div key={`b-${bIdx}`} style={{ whiteSpace: "pre-wrap", marginBottom: bIdx < blocks.length - 1 ? "10px" : "0" }}>
            {renderInline(block.text, `b-${bIdx}`)}
          </div>
        );
      })}
    </Container>
  );
};
