"use client";

import React from "react";
import { LinkPreview } from "@/db/schema";
import { GraduationCap, ExternalLink, User } from "lucide-react";

interface ArxivEmbedProps {
  preview: LinkPreview;
  density: "inline" | "card" | "quote" | "full";
}

export const ArxivEmbed: React.FC<ArxivEmbedProps> = ({ preview, density }) => {
  const year = (preview.meta?.year as number) || new Date().getFullYear();

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
        <GraduationCap size={12} /> {preview.title} ({year})
      </a>
    );
  }

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "var(--bd)",
        boxShadow: "var(--sh-sm)",
        padding: "12px 14px",
        marginTop: "8px",
        marginBottom: "8px",
        borderLeft: "6px solid #00F0FF",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: "#00F0FF",
              color: "#000",
              border: "1px solid var(--ink)",
              padding: "1px 5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <GraduationCap size={12} /> ARXIV PAPER
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, background: "#000", color: "#FFF", padding: "1px 4px" }}>
            {year}
          </span>
        </div>

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
          VIEW PAPER <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, color: "var(--ink)", marginBottom: "4px" }}>
        {preview.title}
      </div>

      {preview.author && (
        <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, color: "var(--ink)", opacity: 0.8, marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
          <User size={12} /> {preview.author}
        </div>
      )}

      {preview.description && (
        <div style={{ fontSize: "12px", opacity: 0.85, color: "var(--ink)", lineHeight: "1.4" }}>
          {preview.description}
        </div>
      )}
    </div>
  );
};
