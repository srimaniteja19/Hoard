"use client";

import React, { useMemo } from "react";
import { seedDreamStyle } from "@/lib/marginalia/dreamMotifs";

interface DreamCoverProps {
  title: string;
  author: string;
  coverUrl?: string | null;
  coverSource?: string | null;
  className?: string;
}

export const DreamCover: React.FC<DreamCoverProps> = ({
  title,
  author,
  coverUrl,
  coverSource,
  className = "",
}) => {
  const dreamTheme = useMemo(() => {
    return seedDreamStyle(title, author);
  }, [title, author]);

  const hasCustomAlchemistSvg =
    coverSource === "ALCHEMIST" &&
    coverUrl &&
    coverUrl.startsWith("data:image/svg+xml");

  const displayTitle = title.trim();

  return (
    <div
      className={`dream-cover ${className}`}
      style={
        {
          background: dreamTheme.bgGradient,
          color: dreamTheme.textColor,
          "--d-accent": dreamTheme.accentColor,
          "--d-sec": dreamTheme.secondaryColor,
          "--d-fg": dreamTheme.textColor,
        } as React.CSSProperties
      }
    >
      {/* ── VECTOR ARTWORK BACKGROUND ── */}
      {hasCustomAlchemistSvg ? (
        <img
          src={coverUrl!}
          alt={`AI Dream Cover for ${title}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          className="dream-art-full"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: dreamTheme.svgMarkup }}
        />
      )}

      {/* ── TOP INSIGNIA ── */}
      <div className="dream-masthead">
        <span className="dream-badge">✨ AI DREAM EDITION</span>
        <span className="dream-theme-tag">{dreamTheme.themeName.toUpperCase()}</span>
      </div>

      {/* ── EDITORIAL TYPOGRAPHY ── */}
      <div className="dream-header">
        <h3 className="dream-title">{displayTitle}</h3>
        {author && <div className="dream-author">{author}</div>}
      </div>

      {/* ── BOTTOM PHILOSOPHICAL EPIGRAPH ── */}
      <div className="dream-footer">
        <div className="dream-epigraph">“{dreamTheme.epigraph}”</div>
        <div className="dream-sigil" aria-hidden="true">
          ✦ ✦ ✦
        </div>
      </div>

      {/* ── 3D SPINAL DEPTH & GLOW SHEEN ── */}
      <div className="dream-sheen" aria-hidden="true" />
      <div className="dream-spine" aria-hidden="true" />
    </div>
  );
};
