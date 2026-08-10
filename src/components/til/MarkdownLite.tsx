import React from "react";

interface MarkdownLiteProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  validHashes?: Set<string> | string[];
}

/**
 * Renders markdown-lite content safely into React elements.
 * Supports:
 * - Inline code: `code`
 * - Bold: **text**
 * - Italic: *text*
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
}) => {
  const validHashSet = React.useMemo(() => {
    if (!validHashes) return new Set<string>();
    if (validHashes instanceof Set) return validHashes;
    return new Set(validHashes.map((h) => h.toLowerCase()));
  }, [validHashes]);

  if (!content) return null;

  // Split content by inline code blocks first to protect code contents from markdown parsing
  const codeParts = content.split(/(`[^`]+`)/g);

  const renderTextSegment = (text: string, keyPrefix: string): React.ReactNode[] => {
    // Combined regex for links [title](url), **bold**, *italic*, and #hash refs (#a3f9)
    const combinedRegex = /(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|#[0-9a-fA-F]{4}\b)/g;
    const parts = text.split(combinedRegex);

    return parts.map((part, idx) => {
      const key = `${keyPrefix}-${idx}`;

      // Check for link: [title](url)
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

      // Check for bold: **text**
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return <strong key={key} style={{ fontWeight: 800 }}>{boldMatch[1]}</strong>;
      }

      // Check for italic: *text*
      const italicMatch = part.match(/^\*([^*]+)\*$/);
      if (italicMatch) {
        return <em key={key} style={{ fontStyle: "italic" }}>{italicMatch[1]}</em>;
      }

      // Check for cross-reference #hash (e.g. #a3f9)
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
        // Unresolvable hash renders as plain text
        return <React.Fragment key={key}>#{part}</React.Fragment>;
      }

      // Plain text
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  };

  const renderedElements = codeParts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const codeContent = part.slice(1, -1);
      return (
        <code
          key={`code-${index}`}
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

    return renderTextSegment(part, `seg-${index}`);
  });

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", ...style }}>
      {renderedElements}
    </span>
  );
};
