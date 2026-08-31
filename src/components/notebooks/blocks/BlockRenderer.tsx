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
} from "lucide-react";

interface BlockRendererProps {
  block: Block;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  accentColor?: string;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  accentColor = "#7B5CF0",
}) => {
  const [toggleOpen, setToggleOpen] = useState(false);

  // Render Loop diagram SVG if block is loop image
  const renderImageContent = (url: string, caption?: string) => {
    if (url.includes("loop-diagram") || url.includes("loop")) {
      return (
        <div
          style={{
            border: "3px solid #0A0A0A",
            boxShadow: "5px 5px 0 #0A0A0A",
            overflow: "hidden",
            background: "#FFFFFF",
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
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "8px 13px",
                borderTop: "2px solid rgba(10,10,10,0.14)",
                color: "#4A4A4A",
              }}
            >
              {caption}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ border: "3px solid #0A0A0A", boxShadow: "5px 5px 0 #0A0A0A", overflow: "hidden", background: "#FFFFFF" }}>
        <img src={url} alt={caption || "Image"} style={{ width: "100%", display: "block" }} />
        {caption && (
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 700, padding: "8px 13px", borderTop: "2px solid rgba(10,10,10,0.14)", opacity: 0.6 }}>
            {caption}
          </div>
        )}
      </div>
    );
  };

  switch (block.type) {
    case "paragraph": {
      // Parse markdown bold **text** into styled highlight
      const parts = block.text.split(/(\*\*.*?\*\*)/g);
      return (
        <p style={{ margin: "4px 0", fontSize: "16.5px", lineHeight: "1.68", color: "inherit" }}>
          {parts.map((part, idx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              const inner = part.slice(2, -2);
              return (
                <strong
                  key={idx}
                  style={{
                    fontWeight: 700,
                    background: "#FCE94F",
                    color: "#0A0A0A",
                    padding: "0 3px",
                  }}
                >
                  {inner}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    }

    case "heading": {
      if (block.level === 2) {
        return (
          <h2
            style={{
              margin: "24px 0 8px",
              fontFamily: "var(--display, sans-serif)",
              fontWeight: 800,
              fontSize: "27px",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              color: "inherit",
            }}
          >
            {block.text}
          </h2>
        );
      }
      return (
        <h3
          style={{
            margin: "18px 0 6px",
            fontFamily: "var(--display, sans-serif)",
            fontWeight: 800,
            fontSize: "20px",
            letterSpacing: "-0.03em",
            lineHeight: "1.15",
            color: "inherit",
          }}
        >
          {block.text}
        </h3>
      );
    }

    case "callout": {
      const config = {
        gotcha: { bg: "#FF2D8A", fg: "#FFFFFF", title: "GOTCHA", border: "#0A0A0A" },
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
          <div style={{ padding: "13px 15px", fontSize: "16px", lineHeight: "1.6", color: "#0A0A0A" }}>
            {block.text}
          </div>
        </div>
      );
    }

    case "code": {
      return (
        <div
          style={{
            border: "3px solid #0A0A0A",
            background: "#0A0A0A",
            color: "#F0EDE4",
            overflow: "hidden",
            margin: "14px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              padding: "6px 13px",
              borderBottom: "2px solid rgba(240,237,228,0.22)",
              color: "#B8F04A",
            }}
          >
            <span>{block.lang}</span>
            <span>{block.note || "SNIPPET"}</span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "14px 15px",
              overflowX: "auto",
              fontFamily: "var(--mono, monospace)",
              fontSize: "13.5px",
              lineHeight: "1.75",
              color: "#F0EDE4",
            }}
          >
            <code>{block.code}</code>
          </pre>
        </div>
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
            onClick={() => {
              playSound.click();
              setToggleOpen(!toggleOpen);
            }}
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
            <span>{block.summary}</span>
          </div>
          {toggleOpen && (
            <div
              style={{
                padding: "9px 0 3px",
                fontSize: "16px",
                lineHeight: "1.62",
                color: "#4A4A4A",
              }}
            >
              {block.body}
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
                style={{
                  fontSize: "16.5px",
                  lineHeight: "1.55",
                  textDecoration: item.done ? "line-through" : "none",
                  opacity: item.done ? 0.45 : 1,
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      );
    }

    case "quote": {
      return (
        <blockquote
          style={{
            borderLeft: `6px solid ${accentColor}`,
            paddingLeft: "16px",
            margin: "16px 0",
            fontFamily: "var(--quote, Georgia, serif)",
            fontSize: "19px",
            lineHeight: "1.5",
            fontStyle: "italic",
          }}
        >
          &ldquo;{block.text}&rdquo;
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
        </blockquote>
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
