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
        }}
      >
        <FolderGit2 size={12} /> {preview.title} ({language})
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
        borderLeft: "6px solid #B6FF3C",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: "#B6FF3C",
              color: "#000",
              border: "1px solid var(--ink)",
              padding: "1px 5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FolderGit2 size={12} /> GITHUB REPO
          </span>

          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, color: "var(--ink)" }}>
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
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          OPEN REPO <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, color: "var(--ink)", marginBottom: "4px" }}>
        {preview.title}
      </div>

      {preview.description && (
        <div style={{ fontSize: "12px", opacity: 0.8, color: "var(--ink)", marginBottom: "8px" }}>
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
