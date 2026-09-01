"use client";

import React, { useState } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";
import {
  AlertTriangle,
  HelpCircle,
  Link as LinkIcon,
  CheckSquare,
  Square,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { InlineTextEditor, InlineEditorHandle } from "./InlineTextEditor";

interface BlockRendererProps {
  block: Block;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  onInsertBelow?: () => void;
  onSplitBlock?: (before: string, after: string) => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  onTransformBlock?: (props: Partial<Block>) => void;
  onSlashCommand?: (query: string, rect: DOMRect | null) => void;
  onSlashKeyDown?: (e: React.KeyboardEvent) => boolean;
  registerEditorHandle?: (handle: InlineEditorHandle | null) => void;
  readOnly?: boolean;
  accentColor?: string;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  onInsertBelow,
  onSplitBlock,
  onFocusPrevious,
  onFocusNext,
  onTransformBlock,
  onSlashCommand,
  onSlashKeyDown,
  registerEditorHandle,
  readOnly = false,
  accentColor = "#7B5CF0",
}) => {
  const [toggleOpen, setToggleOpen] = useState(false);
  const [imageSize, setImageSize] = useState<"compact" | "standard" | "full">("standard");

  // Render Loop diagram SVG if block is loop image
  const renderImageContent = (url: string, caption?: string) => {
    const sizeStyle = {
      compact: { maxWidth: "480px" },
      standard: { maxWidth: "760px" },
      full: { maxWidth: "100%" },
    }[imageSize];

    if (url.includes("loop-diagram") || url.includes("loop")) {
      return (
        <div
          style={{
            border: "3px solid #0A0A0A",
            boxShadow: "5px 5px 0 #0A0A0A",
            overflow: "hidden",
            background: "#FFFFFF",
            color: "#0A0A0A",
            margin: "16px 0",
            ...sizeStyle,
          }}
        >
          <div
            style={{
              aspectRatio: "16/7",
              background: "#EBE7DC",
              display: "grid",
              placeItems: "center",
              padding: "16px",
            }}
          >
            <svg viewBox="0 0 640 260" style={{ width: "100%", height: "100%", maxHeight: "240px", display: "block" }}>
              <rect x="256" y="90" width="126" height="62" fill="#FCE94F" opacity="0.45" />
              <g fill="none" stroke="#0A0A0A" strokeWidth="2.8" strokeLinejoin="round">
                <rect x="42" y="90" width="126" height="62" fill="#FFFFFF" />
                <rect x="256" y="90" width="126" height="62" fill="#FFF9C4" />
                <rect x="470" y="90" width="126" height="62" fill="#FFFFFF" />
                <path d="M168 121 L 252 121 M242 113 L 254 121 L 242 129" />
                <path d="M382 121 L 466 121 M456 113 L 468 121 L 456 129" />
                <path d="M319 152 C 319 214, 105 218, 105 156 M97 166 L 105 152 L 113 166" />
              </g>
              <g fontFamily="var(--mono, monospace)" fontSize="12" fontWeight="700" fill="#0A0A0A">
                <text x="66" y="126">GENERATE</text>
                <text x="288" y="126">CRITIQUE</text>
                <text x="500" y="126">REVISE</text>
              </g>
              <text x="140" y="202" fontFamily="var(--hand, cursive)" fontSize="20" fill="#FF2D8A">
                loop 1–2×, then stop
              </text>
              <text x="250" y="74" fontFamily="var(--hand, cursive)" fontSize="19" fill="#FF2D8A">
                needs outside evidence ↓
              </text>
            </svg>
          </div>
          {caption && (
            <div
              contentEditable={!!onUpdateBlock}
              suppressContentEditableWarning
              onBlur={(e) => {
                if (onUpdateBlock && block.type === "image") {
                  onUpdateBlock({ ...block, caption: e.currentTarget.innerText });
                }
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "8px 13px",
                borderTop: "2px solid rgba(10,10,10,0.14)",
                color: "#4A4A4A",
                outline: "none",
              }}
            >
              {caption}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          border: "3px solid #0A0A0A",
          boxShadow: "5px 5px 0 #0A0A0A",
          overflow: "hidden",
          background: "#FFFFFF",
          color: "#0A0A0A",
          margin: "16px 0",
          ...sizeStyle,
        }}
      >
        {/* Image Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 10px",
            background: "#EBE7DC",
            borderBottom: "2px solid #0A0A0A",
            fontFamily: "var(--mono, monospace)",
            fontSize: "8.5px",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setImageSize("compact")}
              style={{
                background: imageSize === "compact" ? "#0A0A0A" : "transparent",
                color: imageSize === "compact" ? "#FFFFFF" : "#0A0A0A",
                border: "1px solid #0A0A0A",
                padding: "2px 5px",
                cursor: "pointer",
                fontSize: "8px",
              }}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setImageSize("standard")}
              style={{
                background: imageSize === "standard" ? "#0A0A0A" : "transparent",
                color: imageSize === "standard" ? "#FFFFFF" : "#0A0A0A",
                border: "1px solid #0A0A0A",
                padding: "2px 5px",
                cursor: "pointer",
                fontSize: "8px",
              }}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => setImageSize("full")}
              style={{
                background: imageSize === "full" ? "#0A0A0A" : "transparent",
                color: imageSize === "full" ? "#FFFFFF" : "#0A0A0A",
                border: "1px solid #0A0A0A",
                padding: "2px 5px",
                cursor: "pointer",
                fontSize: "8px",
              }}
            >
              100%
            </button>
          </div>
          {onDeleteBlock && (
            <button
              type="button"
              onClick={onDeleteBlock}
              title="Delete image"
              style={{
                background: "transparent",
                border: "none",
                color: "#DC2626",
                cursor: "pointer",
                padding: "2px 4px",
                fontSize: "10px",
              }}
            >
              ✕
            </button>
          )}
        </div>

        <img src={url} alt={caption || "Pasted image"} style={{ width: "100%", display: "block" }} />

        <div
          contentEditable={!!onUpdateBlock}
          suppressContentEditableWarning
          onBlur={(e) => {
            if (onUpdateBlock && block.type === "image") {
              onUpdateBlock({ ...block, caption: e.currentTarget.innerText });
            }
          }}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "9.5px",
            fontWeight: 700,
            padding: "8px 13px",
            borderTop: "2px solid rgba(10,10,10,0.14)",
            opacity: 0.7,
            outline: "none",
          }}
        >
          {caption || "Click to add caption…"}
        </div>
      </div>
    );
  };

  /**
   * Helper that robustly parses both HTML tags (<strong>, <code>, <em>, <br>) and markdown (**bold**, `code`, *italic*)
   */
  const renderFormattedText = (text: string): React.ReactNode => {
    if (!text) return null;

    const tokenRegex = /(<strong>[\s\S]*?<\/strong>|<b>[\s\S]*?<\/b>|\*\*[\s\S]*?\*\*|<code>[\s\S]*?<\/code>|`[^`\n]+`|<em>[\s\S]*?<\/em>|\*[^*\n]+?\*|<mark[\s\S]*?<\/mark>)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;

      // HTML <strong> or <b>
      if (
        (part.startsWith("<strong>") && part.endsWith("</strong>")) ||
        (part.startsWith("<b>") && part.endsWith("</b>"))
      ) {
        const content = part.replace(/^<(strong|b)>/, "").replace(/<\/(strong|b)>$/, "");
        return (
          <strong
            key={idx}
            style={{
              fontWeight: 700,
              background: "#FCE94F",
              color: "#0A0A0A",
              padding: "0 4px",
              boxDecorationBreak: "clone",
            }}
          >
            {content}
          </strong>
        );
      }

      // Markdown **bold**
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        const content = part.slice(2, -2);
        return (
          <strong
            key={idx}
            style={{
              fontWeight: 700,
              background: "#FCE94F",
              color: "#0A0A0A",
              padding: "0 4px",
              boxDecorationBreak: "clone",
            }}
          >
            {content}
          </strong>
        );
      }

      // HTML <mark>
      if (part.startsWith("<mark") && part.endsWith("</mark>")) {
        const content = part.replace(/^<mark[^>]*>/, "").replace(/<\/mark>$/, "");
        return (
          <mark
            key={idx}
            style={{
              fontWeight: 700,
              background: "#FCE94F",
              color: "#0A0A0A",
              padding: "0 4px",
            }}
          >
            {content}
          </mark>
        );
      }

      // HTML <code>
      if (part.startsWith("<code>") && part.endsWith("</code>")) {
        const content = part.replace(/^<code>/, "").replace(/<\/code>$/, "");
        return (
          <code
            key={idx}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "0.88em",
              background: "#EBE7DC",
              border: "1.5px solid #0A0A0A",
              padding: "1px 5px",
              color: "#0A0A0A",
            }}
          >
            {content}
          </code>
        );
      }

      // Markdown `code`
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        const content = part.slice(1, -1);
        return (
          <code
            key={idx}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "0.88em",
              background: "#EBE7DC",
              border: "1.5px solid #0A0A0A",
              padding: "1px 5px",
              color: "#0A0A0A",
            }}
          >
            {content}
          </code>
        );
      }

      // HTML <em>
      if (part.startsWith("<em>") && part.endsWith("</em>")) {
        const content = part.replace(/^<em>/, "").replace(/<\/em>$/, "");
        return <em key={idx}>{content}</em>;
      }

      // Markdown *italic*
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        const content = part.slice(1, -1);
        return <em key={idx}>{content}</em>;
      }

      return part;
    });
  };

  switch (block.type) {
    case "paragraph": {
      return (
        <InlineTextEditor
          as="p"
          value={block.text}
          onChange={(nextText) => {
            if (onUpdateBlock) onUpdateBlock({ ...block, text: nextText });
          }}
          onInsertBelow={onInsertBelow}
          onSplitBlock={onSplitBlock}
          onDeleteBlock={onDeleteBlock}
          onFocusPrevious={onFocusPrevious}
          onFocusNext={onFocusNext}
          onTransformBlock={onTransformBlock}
          onSlashCommand={onSlashCommand}
          onSlashKeyDown={onSlashKeyDown}
          registerEditorHandle={registerEditorHandle}
          readOnly={readOnly}
          renderFormatted={renderFormattedText}
          style={{
            margin: "6px 0 14px",
            fontSize: "16.5px",
            lineHeight: "1.7",
            color: "inherit",
          }}
          placeholder="Type something, or press '/' for blocks…"
        />
      );
    }

    case "heading": {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
            margin: block.level === 2 ? "28px 0 10px" : "18px 0 8px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {block.ts && (
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                background: "#0A0A0A",
                color: "#FCE94F",
                padding: "3px 7px",
                cursor: "pointer",
                flex: "none",
              }}
            >
              {block.ts}
            </span>
          )}
          <div style={{ flex: "1 1 auto", minWidth: "200px" }}>
            <InlineTextEditor
              as={block.level === 2 ? "h2" : "h3"}
              value={block.text}
              onChange={(nextText) => {
                if (onUpdateBlock) onUpdateBlock({ ...block, text: nextText });
              }}
              onInsertBelow={onInsertBelow}
              onSplitBlock={onSplitBlock}
              onDeleteBlock={onDeleteBlock}
              onFocusPrevious={onFocusPrevious}
              onFocusNext={onFocusNext}
              onTransformBlock={onTransformBlock}
              onSlashCommand={onSlashCommand}
              onSlashKeyDown={onSlashKeyDown}
              registerEditorHandle={registerEditorHandle}
              readOnly={readOnly}
              renderFormatted={renderFormattedText}
              style={
                block.level === 2
                  ? {
                      margin: 0,
                      fontFamily: "var(--display, sans-serif)",
                      fontWeight: 800,
                      fontSize: "clamp(21px, 3.2vw, 29px)",
                      letterSpacing: "-0.04em",
                      lineHeight: "1.06",
                      color: "inherit",
                    }
                  : {
                      margin: 0,
                      fontFamily: "var(--display, sans-serif)",
                      fontWeight: 800,
                      fontSize: "clamp(17px, 2.6vw, 22px)",
                      letterSpacing: "-0.03em",
                      lineHeight: "1.15",
                      color: "inherit",
                    }
              }
              placeholder="Heading title…"
            />
          </div>
          <span style={{ flex: 1, height: "2px", background: "rgba(10,10,10,0.14)", minWidth: "20px" }} />
        </div>
      );
    }

    case "example": {
      return (
        <div
          style={{
            border: "3px solid #0A0A0A",
            background: "#FFFFFF",
            color: "#0A0A0A",
            boxShadow: "6px 6px 0 #0A0A0A",
            margin: "18px 0 22px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.17em",
              padding: "8px 14px",
              background: "#EBE7DC",
              borderBottom: "3px solid #0A0A0A",
            }}
          >
            <span
              contentEditable={!!onUpdateBlock}
              suppressContentEditableWarning
              onBlur={(e) => {
                if (onUpdateBlock) onUpdateBlock({ ...block, title: e.currentTarget.innerText });
              }}
              style={{ outline: "none" }}
            >
              {block.title || "THE EXAMPLE HE USED"}
            </span>
            {block.timestampRange && <span>{block.timestampRange}</span>}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 46px 1fr",
              alignItems: "stretch",
            }}
          >
            {/* Draft 1 */}
            <div style={{ padding: "15px 16px", borderRight: "2px solid rgba(10,10,10,0.14)" }}>
              <span
                contentEditable={!!onUpdateBlock}
                suppressContentEditableWarning
                onBlur={(e) => {
                  if (onUpdateBlock) onUpdateBlock({ ...block, v1Title: e.currentTarget.innerText });
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "8.5px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  padding: "2px 7px",
                  display: "inline-block",
                  marginBottom: "11px",
                  border: "2px solid #0A0A0A",
                  background: "#FFFFFF",
                  opacity: 0.7,
                  outline: "none",
                }}
              >
                {block.v1Title || "DRAFT 1 · TYPED FAST"}
              </span>
              <p
                contentEditable={!!onUpdateBlock}
                suppressContentEditableWarning
                onBlur={(e) => {
                  if (onUpdateBlock) onUpdateBlock({ ...block, v1Text: e.currentTarget.innerText });
                }}
                style={{
                  fontFamily: "var(--quote, Georgia, serif)",
                  fontSize: "16.5px",
                  lineHeight: "1.55",
                  margin: 0,
                  color: "#0A0A0A",
                  whiteSpace: "pre-wrap",
                  outline: "none",
                }}
              >
                {block.v1BadWords && block.v1BadWords.length > 0 ? (
                  block.v1Text.split(new RegExp(`(${block.v1BadWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')).map((seg, i) =>
                    block.v1BadWords?.includes(seg) ? (
                      <span key={i} style={{ background: "#FF2D8A", color: "#FFFFFF", padding: "0 3px" }}>
                        {seg}
                      </span>
                    ) : (
                      seg
                    )
                  )
                ) : (
                  block.v1Text
                )}
              </p>
            </div>

            {/* Arrow */}
            <div
              style={{
                display: "grid",
                placeItems: "center",
                borderLeft: "2px solid rgba(10,10,10,0.14)",
                borderRight: "2px solid rgba(10,10,10,0.14)",
                fontFamily: "var(--mono, monospace)",
                fontWeight: 700,
                fontSize: "16px",
                background: "#EBE7DC",
                color: "#0A0A0A",
              }}
            >
              →
            </div>

            {/* Draft 2 */}
            <div style={{ padding: "15px 16px" }}>
              <span
                contentEditable={!!onUpdateBlock}
                suppressContentEditableWarning
                onBlur={(e) => {
                  if (onUpdateBlock) onUpdateBlock({ ...block, v2Title: e.currentTarget.innerText });
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "8.5px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  padding: "2px 7px",
                  display: "inline-block",
                  marginBottom: "11px",
                  border: "2px solid #0A0A0A",
                  background: "#B8F04A",
                  color: "#0A0A0A",
                  outline: "none",
                }}
              >
                {block.v2Title || "DRAFT 2 · AFTER REREADING"}
              </span>
              <p
                contentEditable={!!onUpdateBlock}
                suppressContentEditableWarning
                onBlur={(e) => {
                  if (onUpdateBlock) onUpdateBlock({ ...block, v2Text: e.currentTarget.innerText });
                }}
                style={{
                  fontFamily: "var(--quote, Georgia, serif)",
                  fontSize: "16.5px",
                  lineHeight: "1.55",
                  margin: 0,
                  color: "#0A0A0A",
                  whiteSpace: "pre-wrap",
                  outline: "none",
                }}
              >
                {block.v2FixWords && block.v2FixWords.length > 0 ? (
                  block.v2Text.split(new RegExp(`(${block.v2FixWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')).map((seg, i) =>
                    block.v2FixWords?.includes(seg) ? (
                      <span key={i} style={{ background: "#B8F04A", color: "#0A0A0A", padding: "0 3px" }}>
                        {seg}
                      </span>
                    ) : (
                      seg
                    )
                  )
                ) : (
                  block.v2Text
                )}
              </p>
            </div>
          </div>

          {/* Footer Legend */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              padding: "10px 14px",
              borderTop: "2px solid rgba(10,10,10,0.14)",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              opacity: 0.65,
              background: "#FAFAFA",
            }}
          >
            <span>
              <i
                style={{
                  width: "9px",
                  height: "9px",
                  display: "inline-block",
                  marginRight: "6px",
                  verticalAlign: "-1px",
                  border: "2px solid #0A0A0A",
                  background: "#FF2D8A",
                }}
              />
              {block.caughtLegend || "WHAT THE REREAD CAUGHT"}
            </span>
            <span>
              <i
                style={{
                  width: "9px",
                  height: "9px",
                  display: "inline-block",
                  marginRight: "6px",
                  verticalAlign: "-1px",
                  border: "2px solid #0A0A0A",
                  background: "#B8F04A",
                }}
              />
              {block.fixedLegend || "WHAT THE REVISION FIXED"}
            </span>
            {block.summaryPill && (
              <span style={{ marginLeft: "auto", opacity: 0.9 }}>{block.summaryPill}</span>
            )}
          </div>
        </div>
      );
    }

    case "scale": {
      return (
        <div
          style={{
            border: "3px solid #0A0A0A",
            background: "#FFFFFF",
            color: "#0A0A0A",
            boxShadow: "5px 5px 0 #0A0A0A",
            margin: "18px 0 22px",
            overflow: "hidden",
          }}
        >
          <div
            contentEditable={!!onUpdateBlock}
            suppressContentEditableWarning
            onBlur={(e) => {
              if (onUpdateBlock) onUpdateBlock({ ...block, title: e.currentTarget.innerText });
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.17em",
              padding: "8px 14px",
              background: "#EBE7DC",
              borderBottom: "3px solid #0A0A0A",
              outline: "none",
            }}
          >
            {block.title || "HIS WORDS, NOT MEASUREMENTS"}
          </div>
          <div style={{ padding: "15px 14px 13px" }}>
            {block.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px minmax(0, 1fr)",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "9px",
                }}
              >
                <span
                  contentEditable={!!onUpdateBlock}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    if (onUpdateBlock) {
                      const nextItems = [...block.items];
                      nextItems[idx] = { ...nextItems[idx], name: e.currentTarget.innerText };
                      onUpdateBlock({ ...block, items: nextItems });
                    }
                  }}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    outline: "none",
                  }}
                >
                  {item.name}
                </span>
                <div
                  style={{
                    height: "20px",
                    border: "2px solid #0A0A0A",
                    background: "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${item.pct}%`,
                      background:
                        item.color === "lime"
                          ? "#B8F04A"
                          : item.color === "yellow"
                          ? "#FCE94F"
                          : item.color === "pink"
                          ? "#FF2D8A"
                          : "#EBE7DC",
                    }}
                  />
                </div>
              </div>
            ))}
            {block.footer && (
              <div
                contentEditable={!!onUpdateBlock}
                suppressContentEditableWarning
                onBlur={(e) => {
                  if (onUpdateBlock) onUpdateBlock({ ...block, footer: e.currentTarget.innerText });
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  letterSpacing: "0.07em",
                  opacity: 0.55,
                  paddingTop: "11px",
                  borderTop: "2px dashed rgba(10,10,10,0.14)",
                  lineHeight: 1.75,
                  marginTop: "6px",
                  outline: "none",
                }}
              >
                {block.footer}
              </div>
            )}
          </div>
        </div>
      );
    }

    case "anchors": {
      return (
        <div
          style={{
            border: "3px solid #0A0A0A",
            background: "#FFFFFF",
            color: "#0A0A0A",
            boxShadow: "5px 5px 0 #0A0A0A",
            margin: "28px 0 16px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.17em",
              padding: "9px 14px",
              background: "#EBE7DC",
              borderBottom: "3px solid #0A0A0A",
            }}
          >
            <span>{block.title || "THE LECTURE, INDEXED"}</span>
            {block.duration && <span>{block.duration}</span>}
          </div>
          <div>
            {block.items.map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "66px minmax(0, 1fr) auto",
                  gap: "13px",
                  alignItems: "center",
                  padding: "9px 14px",
                  borderBottom: idx === block.items.length - 1 ? "none" : "2px solid rgba(10,10,10,0.14)",
                  cursor: "pointer",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    background: "#0A0A0A",
                    color: "#FCE94F",
                    padding: "3px 6px",
                    textAlign: "center",
                  }}
                >
                  {row.timestamp}
                </span>
                <span style={{ fontSize: "15.5px", lineHeight: "1.35" }}>{row.label}</span>
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "8.5px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    padding: "2px 7px",
                    background: "#B8F04A",
                    whiteSpace: "nowrap",
                    color: "#0A0A0A",
                  }}
                >
                  {row.sectionTag}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "next": {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "13px",
            border: "3px solid #0A0A0A",
            background: "#FFFFFF",
            color: "#0A0A0A",
            boxShadow: "4px 4px 0 #0A0A0A",
            padding: "12px 15px",
            margin: "20px 0",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid #0A0A0A",
              background: accentColor,
              color: "#FFFFFF",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--display, sans-serif)",
              fontWeight: 800,
              fontSize: "16px",
              flex: "none",
            }}
          >
            {block.initial || "A"}
          </div>
          <div>
            <b style={{ display: "block", fontSize: "15px", fontWeight: 700 }}>{block.title}</b>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                opacity: 0.45,
              }}
            >
              {block.meta}
            </span>
          </div>
        </div>
      );
    }

    case "callout": {
      const config = {
        // fg is dark, not white: white-on-#FF2D8A is ~3.5:1 contrast, below the
        // WCAG AA 4.5:1 threshold for text — every other kind here already
        // uses dark text on its bright background, this one just didn't match.
        gotcha: { bg: "#FF2D8A", fg: "#0A0A0A", title: "GOTCHA", border: "#0A0A0A" },
        question: { bg: "#FCE94F", fg: "#0A0A0A", title: "QUESTION FOR ME", border: "#0A0A0A" },
        fact: { bg: "#B8F04A", fg: "#0A0A0A", title: "KEY TAKEAWAY", border: "#0A0A0A" },
        connects: { bg: "#7FE9F7", fg: "#0A0A0A", title: "CONNECTS TO", border: "#0A0A0A" },
      }[block.kind];

      return (
        <div
          style={{
            border: "3px solid #0A0A0A",
            background: "#FFFFFF",
            boxShadow: `5px 5px 0 ${config.bg}`,
            overflow: "hidden",
            margin: "12px 0",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              background: config.bg,
              color: config.fg,
              padding: "6px 13px",
              borderBottom: "3px solid #0A0A0A",
            }}
          >
            {config.title}
          </div>
          <div style={{ padding: "13px 15px" }}>
            <InlineTextEditor
              as="div"
              value={block.text}
              onChange={(nextText) => {
                if (onUpdateBlock) onUpdateBlock({ ...block, text: nextText });
              }}
              onInsertBelow={onInsertBelow}
              onSplitBlock={onSplitBlock}
              onDeleteBlock={onDeleteBlock}
              onFocusPrevious={onFocusPrevious}
              onFocusNext={onFocusNext}
              onTransformBlock={onTransformBlock}
              onSlashCommand={onSlashCommand}
              onSlashKeyDown={onSlashKeyDown}
              registerEditorHandle={registerEditorHandle}
              readOnly={readOnly}
              renderFormatted={renderFormattedText}
              style={{ fontSize: "16px", lineHeight: "1.6", color: "#0A0A0A" }}
              placeholder="Callout text…"
            />
          </div>
        </div>
      );
    }

    case "code": {
      return (
        <CodeBlock
          block={block}
          onUpdateBlock={onUpdateBlock}
          accentColor={accentColor}
        />
      );
    }

    case "toggle": {
      return (
        <div
          style={{
            borderLeft: "3px solid #0A0A0A",
            paddingLeft: "14px",
            margin: "10px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "16.5px",
            }}
          >
            <span
              onClick={() => {
                playSound.click();
                setToggleOpen(!toggleOpen);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                transform: toggleOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
                display: "inline-block",
              }}
            >
              ▸
            </span>
            <span
              contentEditable={!!onUpdateBlock}
              suppressContentEditableWarning
              onBlur={(e) => {
                if (onUpdateBlock) onUpdateBlock({ ...block, summary: e.currentTarget.innerText });
              }}
              style={{ outline: "none" }}
            >
              {block.summary}
            </span>
          </div>
          {toggleOpen && (
            <div
              contentEditable={!!onUpdateBlock}
              suppressContentEditableWarning
              onBlur={(e) => {
                if (onUpdateBlock) onUpdateBlock({ ...block, body: e.currentTarget.innerText });
              }}
              style={{
                padding: "9px 0 3px",
                fontSize: "16px",
                lineHeight: "1.62",
                color: "inherit",
                opacity: 0.65,
                outline: "none",
              }}
            >
              {renderFormattedText(block.body)}
            </div>
          )}
        </div>
      );
    }

    case "todo": {
      const handleToggle = (idx: number) => {
        playSound.pop();
        if (!onUpdateBlock) return;
        const newItems = [...block.items];
        newItems[idx] = { ...newItems[idx], done: !newItems[idx].done };
        onUpdateBlock({ ...block, items: newItems });
      };

      const handleAddItem = () => {
        if (!onUpdateBlock) return;
        onUpdateBlock({
          ...block,
          items: [...block.items, { text: "New task", done: false }],
        });
      };

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "10px 0" }}>
          {block.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "11px",
              }}
            >
              <button
                type="button"
                onClick={() => handleToggle(idx)}
                style={{
                  width: "19px",
                  height: "19px",
                  border: "2px solid #0A0A0A",
                  flex: "none",
                  marginTop: "2px",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  background: item.done ? "#0A0A0A" : "#FFFFFF",
                  color: item.done ? "#B8F04A" : "transparent",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: 0,
                }}
              >
                ✓
              </button>
              <span
                contentEditable={!!onUpdateBlock}
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newText = e.currentTarget.innerText;
                  if (newText !== item.text && onUpdateBlock) {
                    const newItems = [...block.items];
                    newItems[idx] = { ...newItems[idx], text: newText };
                    onUpdateBlock({ ...block, items: newItems });
                  }
                }}
                style={{
                  fontSize: "16.5px",
                  lineHeight: "1.55",
                  textDecoration: item.done ? "line-through" : "none",
                  opacity: item.done ? 0.45 : 1,
                  outline: "none",
                  flex: 1,
                }}
              >
                {renderFormattedText(item.text)}
              </span>
            </div>
          ))}
          {onUpdateBlock && (
            <button
              type="button"
              onClick={handleAddItem}
              style={{
                alignSelf: "flex-start",
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                background: "transparent",
                border: "1.5px dashed rgba(10,10,10,0.3)",
                padding: "3px 8px",
                cursor: "pointer",
                marginTop: "4px",
                opacity: 0.6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ＋ ADD ITEM
            </button>
          )}
        </div>
      );
    }

    case "quote": {
      return (
        <div
          style={{
            borderLeft: `6px solid ${accentColor}`,
            paddingLeft: "16px",
            margin: "16px 0",
          }}
        >
          <InlineTextEditor
            as="blockquote"
            value={block.text}
            onChange={(nextText) => {
              if (onUpdateBlock) onUpdateBlock({ ...block, text: nextText });
            }}
            onInsertBelow={onInsertBelow}
            onSplitBlock={onSplitBlock}
            onDeleteBlock={onDeleteBlock}
            onFocusPrevious={onFocusPrevious}
            onFocusNext={onFocusNext}
            onTransformBlock={onTransformBlock}
            onSlashCommand={onSlashCommand}
            onSlashKeyDown={onSlashKeyDown}
            registerEditorHandle={registerEditorHandle}
            readOnly={readOnly}
            renderFormatted={renderFormattedText}
            style={{
              fontFamily: "var(--quote, Georgia, serif)",
              fontSize: "19px",
              lineHeight: "1.5",
              fontStyle: "italic",
              margin: 0,
            }}
            placeholder="Quote text…"
          />
          {block.attribution && (
            <cite
              style={{
                display: "block",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontStyle: "normal",
                letterSpacing: "0.1em",
                marginTop: "6px",
                opacity: 0.6,
              }}
            >
              — {block.attribution}
            </cite>
          )}
        </div>
      );
    }

    case "image":
      return renderImageContent(block.url, block.caption);

    case "link": {
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "13px",
            border: "3px solid #0A0A0A",
            background: "#FFFFFF",
            boxShadow: "4px 4px 0 #0A0A0A",
            padding: "11px 14px",
            cursor: "pointer",
            textDecoration: "none",
            color: "#0A0A0A",
            margin: "12px 0",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          <span
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid #0A0A0A",
              background: accentColor,
              color: "#FFFFFF",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--display, sans-serif)",
              fontWeight: 800,
              fontSize: "14px",
              flex: "none",
            }}
          >
            {block.title ? block.title.charAt(0).toUpperCase() : "L"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b
              style={{
                display: "block",
                fontSize: "15px",
                fontWeight: 700,
                lineHeight: "1.25",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {block.title || block.url}
            </b>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                opacity: 0.5,
              }}
            >
              {block.site || block.url}
            </span>
          </div>
        </a>
      );
    }

    case "mark": {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
            border: "3px dashed #FF2D8A",
            padding: "9px 13px",
            margin: "12px 0",
          }}
        >
          <b
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 700,
              background: "#0A0A0A",
              color: "#FCE94F",
              padding: "3px 7px",
              flex: "none",
            }}
          >
            ⏱ {block.timestamp}
          </b>
          <input
            type="text"
            value={block.text || ""}
            placeholder="marked during the lecture — what was it?"
            onChange={(e) => {
              if (onUpdateBlock) {
                onUpdateBlock({ ...block, text: e.target.value });
              }
            }}
            style={{
              flex: 1,
              border: "none",
              borderBottom: "2px solid rgba(10,10,10,0.14)",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--quote, Georgia, serif)",
              fontSize: "16px",
              padding: "3px 0",
              color: "inherit",
            }}
          />
        </div>
      );
    }

    case "divider":
      return <hr style={{ border: "none", borderTop: "2px solid rgba(10,10,10,0.14)", margin: "20px 0" }} />;

    default:
      return null;
  }
};
