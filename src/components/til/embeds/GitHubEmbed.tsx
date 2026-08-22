"use client";

import React from "react";
import { LinkPreview } from "@/db/schema";
import { FolderGit2, ExternalLink, GitCommit } from "lucide-react";

interface GitHubEmbedProps {
  preview: LinkPreview;
  density: "inline" | "card" | "quote" | "full";
}

export const GitHubEmbed: React.FC<GitHubEmbedProps> = ({ preview, density }) => {
  const language = (preview.meta?.language as string) || "Code";
  const pushedDaysAgo = (preview.meta?.pushedDaysAgo as number) ?? 1;

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
        <FolderGit2 size={12} /> {preview.title} ({language})
      </a>
    );
  }

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--lime) 5%, var(--paper))",
        border: "1.5px solid var(--ink)",
        boxShadow: "2px 2px 0 var(--ink)",
        padding: "12px 14px",
        marginTop: "10px",
        marginBottom: "10px",
        borderLeft: "6px solid var(--lime)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: "var(--lime)",
              color: "#000",
              border: "1px solid var(--ink)",
              padding: "1.5px 6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "1px 1px 0 var(--ink)",
            }}
          >
            <FolderGit2 size={12} /> GITHUB REPO
          </span>

          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
              background: "var(--ink)",
              color: "var(--cream)",
              padding: "1.5px 5px",
            }}
          >
            {language}
          </span>
        </div>

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
          OPEN REPO <ExternalLink size={10} />
        </a>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, color: "var(--ink)", marginBottom: "4px" }}>
        {preview.title}
      </div>

      {preview.description && (
        <div style={{ fontSize: "12px", opacity: 0.85, color: "var(--ink)", marginBottom: "8px", lineHeight: "1.45" }}>
          {preview.description}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <GitCommit size={12} /> Pushed {pushedDaysAgo === 0 ? "today" : `${pushedDaysAgo}d ago`}
        </span>
      </div>
    </div>
  );
};
