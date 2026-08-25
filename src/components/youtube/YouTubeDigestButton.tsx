"use client";

import React from "react";
import { useYouTubeDigest } from "./YouTubeDigestProvider";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { Sparkles, Check, BookmarkCheck } from "lucide-react";

interface YouTubeDigestButtonProps {
  url: string;
  title?: string;
  variant?: "pill" | "button" | "badge" | "link";
  className?: string;
  style?: React.CSSProperties;
}

export const YouTubeDigestButton: React.FC<YouTubeDigestButtonProps> = ({
  url,
  title,
  variant = "button",
  className = "",
  style,
}) => {
  const { openYouTubeDigest, isDigestSaved } = useYouTubeDigest();
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) return null;

  const saved = isDigestSaved(videoId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openYouTubeDigest(url, title);
  };

  if (variant === "badge") {
    return (
      <span
        className={`ctag youtube-digest-badge ${className}`}
        tabIndex={0}
        onClick={handleClick}
        style={{
          background: saved ? "#B8F04A" : "#0A0A0A",
          color: saved ? "#0A0A0A" : "#FCE94F",
          cursor: "pointer",
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          border: "1.5px solid #0A0A0A",
          boxShadow: saved ? "1.5px 1.5px 0 #0A0A0A" : "1.5px 1.5px 0 #FF2D8A",
          ...style,
        }}
        title={saved ? "Open saved AI digest" : "Generate real-time AI digest"}
      >
        {saved ? (
          <Check size={10} strokeWidth={3} />
        ) : (
          <Sparkles size={10} className="text-[#FF2D8A]" />
        )}
        <span>{saved ? "DIGEST SAVED ✓" : "DIGEST"}</span>
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        className={`youtube-digest-pill ${className}`}
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          width: "100%",
          background: saved ? "#B8F04A" : "#0A0A0A",
          color: saved ? "#0A0A0A" : "#FCE94F",
          border: "2px solid #0A0A0A",
          boxShadow: saved ? "2px 2px 0 #0A0A0A" : "2px 2px 0 #FF2D8A",
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          padding: "6px 10px",
          cursor: "pointer",
          transition: "all 0.12s ease",
          textTransform: "uppercase",
          ...style,
        }}
        title={saved ? "Open saved HOARD Digest" : "Open real-time HOARD Digest for this YouTube video"}
      >
        {saved ? (
          <Check size={12} strokeWidth={3} />
        ) : (
          <Sparkles size={11} fill="#FF2D8A" color="#FF2D8A" />
        )}
        <span>{saved ? "✦ DIGEST SAVED ✓" : "✦ DIGEST ▾"}</span>
      </button>
    );
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`youtube-digest-link ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: "#0A0A0A",
          border: "1.5px solid #0A0A0A",
          background: saved ? "#B8F04A" : "#FCE94F",
          padding: "2px 6px",
          boxShadow: "1.5px 1.5px 0 #0A0A0A",
          cursor: "pointer",
          ...style,
        }}
        title={saved ? "Open saved HOARD Digest" : "Open real-time HOARD Digest"}
      >
        {saved ? (
          <Check size={10} strokeWidth={3} />
        ) : (
          <Sparkles size={10} fill="#FF2D8A" color="#FF2D8A" />
        )}
        <span>{saved ? "DIGEST SAVED ✓" : "DIGEST ▾"}</span>
      </button>
    );
  }

  // Default "button" variant
  return (
    <button
      type="button"
      className={`youtube-digest-btn ${className}`}
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: saved ? "#B8F04A" : "#0A0A0A",
        color: saved ? "#0A0A0A" : "#FCE94F",
        border: "2px solid #0A0A0A",
        boxShadow: saved ? "3px 3px 0 #0A0A0A" : "3px 3px 0 #FF2D8A",
        fontFamily: "var(--mono)",
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        padding: "6px 12px",
        cursor: "pointer",
        transition: "all 0.12s ease",
        textTransform: "uppercase",
        ...style,
      }}
      title={saved ? "Open saved HOARD Digest" : "Generate real-time AI editorial digest from video transcript"}
    >
      {saved ? (
        <Check size={12} strokeWidth={3} />
      ) : (
        <Sparkles size={12} fill="#FF2D8A" color="#FF2D8A" />
      )}
      <span>{saved ? "✦ DIGEST SAVED ✓" : "✦ DIGEST ▾"}</span>
    </button>
  );
};
