"use client";

import React from "react";
import { LinkPreview } from "@/db/schema";
import { Globe, ExternalLink, Clock } from "lucide-react";

interface GenericEmbedProps {
  preview: LinkPreview;
  density: "inline" | "card" | "quote" | "full";
}

export const GenericEmbed: React.FC<GenericEmbedProps> = ({ preview, density }) => {
  const readMins = (preview.meta?.readMins as number) || (preview.durationSec ? Math.ceil(preview.durationSec / 60) : undefined);

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
        <Globe size={12} /> {preview.title}
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
        borderLeft: "6px solid #FFE600",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: "#FFE600",
              color: "#000",
              border: "1px solid var(--ink)",
              padding: "1px 5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Globe size={12} /> {preview.host}
          </span>

          {readMins && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, background: "#000", color: "#FFF", padding: "1px 4px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <Clock size={10} /> {readMins} MIN READ
            </span>
          )}
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
          VISIT LINK <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 900, color: "var(--ink)", marginBottom: "4px" }}>
        {preview.title}
      </div>

      {preview.description && (
        <div style={{ fontSize: "12px", opacity: 0.8, color: "var(--ink)", lineHeight: "1.4" }}>
          {preview.description}
        </div>
      )}
    </div>
  );
};
