"use client";

import React from "react";
import { useYouTubeDigest } from "@/components/youtube/YouTubeDigestProvider";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";

interface GlimpseSummaryLinkProps {
  url: string;
  variant?: "button" | "link" | "pill";
  className?: string;
}

export const GlimpseSummaryLink: React.FC<GlimpseSummaryLinkProps> = ({
  url,
  variant = "pill",
  className = "",
}) => {
  const { openYouTubeDigest } = useYouTubeDigest();
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openYouTubeDigest(url);
  };

  const label = "✦ DIGEST ▾";

  if (variant === "button") {
    return (
      <button
        type="button"
        className={`glimpse-summary-btn ${className}`}
        onClick={handleClick}
        title="Open real-time HOARD YouTube Digest"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "var(--ink)",
          color: "var(--yellow, #FFE94A)",
          border: "2px solid var(--ink)",
          boxShadow: "2.5px 2.5px 0 var(--pink)",
          fontFamily: "var(--mono)",
          fontSize: "10.5px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          cursor: "pointer",
          padding: "5px 10px",
          transition: "all 0.12s ease",
          textTransform: "uppercase",
        }}
      >
        <Sparkles size={12} fill="var(--pink)" color="var(--pink)" />
        <span>{label}</span>
      </button>
    );
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Open real-time HOARD YouTube Digest"
        className={`glimpse-summary-link ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: "var(--ink)",
          textDecoration: "none",
          border: "1px solid var(--ink)",
          background: "var(--yellow, #FFE94A)",
          padding: "2px 6px",
          boxShadow: "1px 1px 0 var(--ink)",
          width: "fit-content",
          cursor: "pointer",
          transition: "all 0.1s ease",
        }}
      >
        <Sparkles size={10} fill="var(--pink)" color="var(--pink)" />
        <span>DIGEST ▾</span>
      </button>
    );
  }

  // Default "pill" variant
  return (
    <button
      type="button"
      className={`glimpse-summary-pill ${className}`}
      onClick={handleClick}
      title="Open real-time HOARD YouTube Digest"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: "100%",
        background: "var(--ink)",
        color: "var(--yellow, #FFE94A)",
        border: "1.5px solid var(--ink)",
        boxShadow: "2px 2px 0 var(--pink)",
        fontFamily: "var(--mono)",
        fontSize: "9.5px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        padding: "6px 10px",
        cursor: "pointer",
        transition: "all 0.12s cubic-bezier(0.2, 0, 0, 1)",
        textTransform: "uppercase",
        boxDecorationBreak: "clone",
      }}
    >
      <Sparkles size={11} fill="var(--pink)" color="var(--pink)" />
      <span>{label}</span>
    </button>
  );
};
