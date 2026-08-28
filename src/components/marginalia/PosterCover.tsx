"use client";

import React, { useMemo } from "react";
import { PosterMotif, seedPosterStyle, renderPosterIllustration, POSTER_PALETTES } from "@/lib/marginalia/posterMotifs";

interface PosterCoverProps {
  title: string;
  author: string;
  motif?: PosterMotif | null;
  className?: string;
}

export const PosterCover: React.FC<PosterCoverProps> = ({
  title,
  author,
  motif,
  className = "",
}) => {
  const theme = useMemo(() => {
    if (motif && POSTER_PALETTES[motif]) {
      return POSTER_PALETTES[motif];
    }
    return seedPosterStyle(title, author);
  }, [title, author, motif]);

  const illustrationSvg = useMemo(() => {
    return renderPosterIllustration(theme.motif, theme);
  }, [theme]);

  const displayTitle = title.trim();

  return (
    <div
      className={`poster-cover ${className}`}
      style={
        {
          background: theme.bgGradient,
          "--p-fg": theme.fg,
          "--p-accent": theme.accent,
          "--p-sub": theme.subColor,
        } as React.CSSProperties
      }
    >
      {/* ── FULL-BLEED LIVING VECTOR ART ── */}
      <div
        className="poster-art-full"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: illustrationSvg }}
      />

      {/* ── EDITORIAL TYPOGRAPHY OVERLAY ── */}
      <div className="poster-header">
        <h3 className="poster-title">{displayTitle}</h3>
        {author && <div className="poster-author">{author}</div>}
      </div>

      {/* ── 3D BOOK SPINE SHADOW & GLOSS SHEEN ── */}
      <div className="poster-sheen" aria-hidden="true" />
      <div className="poster-spine" aria-hidden="true" />
    </div>
  );
};
