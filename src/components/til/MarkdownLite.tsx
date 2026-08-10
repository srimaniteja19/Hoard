import React from "react";

interface MarkdownLiteProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders markdown-lite content safely into React elements.
 * Supports:
 * - Inline code: `code`
 * - Bold: **text**
 * - Italic: *text*
 * - Links: [title](url)
 *
 * Sanitized by design: plain text is rendered as React children (no dangerouslySetInnerHTML).
 */
export const MarkdownLite: React.FC<MarkdownLiteProps> = ({ content, className, style }) => {
  if (!content) return null;

  // Split content by inline code blocks first to protect code contents from bold/italic/link parsing
  const codeParts = content.split(/(`[^`]+`)/g);

  const renderTextSegment = (text: string, keyPrefix: string): React.ReactNode[] => {
    // Regex matching [title](url), **bold**, *italic*
    const combinedRegex = /(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
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
