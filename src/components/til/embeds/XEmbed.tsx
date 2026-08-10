"use client";

import React from "react";
import { LinkPreview } from "@/db/schema";
import { MessageSquare, ExternalLink } from "lucide-react";

interface XEmbedProps {
  preview: LinkPreview;
  density: "inline" | "card" | "quote" | "full";
}

export const XEmbed: React.FC<XEmbedProps> = ({ preview, density }) => {
  if (density === "inline") {
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: "var(--mono)",
          fontSize: "11px",
          fontWeight: 800,
          background: "var(--paper)",
          color: "var(--ink)",
          border: "1px solid var(--ink)",
          padding: "2px 6px",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          textDecoration: "none",
        }}
      >
        <MessageSquare size={12} /> {preview.author ? `@${preview.author}` : "X Post"}
      </a>
    );
  }

  return (
    <blockquote
      style={{
        margin: "8px 0",
        background: "var(--paper)",
        border: "var(--bd)",
        borderLeft: "6px solid #FF007A",
        boxShadow: "var(--sh-sm)",
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 900,
            background: "#FF007A",
            color: "#FFF",
            border: "1px solid var(--ink)",
            padding: "1px 5px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <MessageSquare size={11} /> {preview.author ? `@${preview.author}` : "X POST"}
        </span>

        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          VIEW POST <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ fontSize: "13px", lineHeight: "1.4", fontStyle: "italic", color: "var(--ink)" }}>
        &quot;{preview.description || preview.title}&quot;
      </div>
    </blockquote>
  );
};
