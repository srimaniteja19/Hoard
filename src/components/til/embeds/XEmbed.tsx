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
          boxShadow: "1px 1px 0 var(--ink)",
        }}
      >
        <MessageSquare size={12} /> {preview.author ? `@${preview.author}` : "X Post"}
      </a>
    );
  }

  return (
    <blockquote
      style={{
        margin: "10px 0",
        background: "color-mix(in srgb, var(--pink) 5%, var(--paper))",
        border: "1.5px solid var(--ink)",
        borderLeft: "6px solid var(--pink)",
        boxShadow: "2px 2px 0 var(--ink)",
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 900,
            background: "var(--pink)",
            color: "#FFF",
            border: "1px solid var(--ink)",
            padding: "1.5px 6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "1px 1px 0 var(--ink)",
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
            fontWeight: 900,
            color: "var(--ink)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            padding: "2px 6px",
            border: "1px solid var(--ink)",
            background: "var(--paper)",
            boxShadow: "1px 1px 0 var(--ink)",
          }}
        >
          VIEW POST <ExternalLink size={10} />
        </a>
      </div>

      <div style={{ fontSize: "13.5px", lineHeight: "1.45", fontStyle: "italic", color: "var(--ink)" }}>
        &quot;{preview.description || preview.title}&quot;
      </div>
    </blockquote>
  );
};
