"use client";

import React, { useMemo } from "react";
import {
  PosterMotif,
  seedPosterStyle,
  renderPosterIllustration,
  POSTER_PALETTES,
} from "@/lib/marginalia/posterMotifs";

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
          "--p-foil": theme.foilColor,
        } as React.CSSProperties
      }
    >
      {/* ── FULL-BLEED LIVING VECTOR ART ── */}
      <div
        className="poster-art-full"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: illustrationSvg }}
      />

      {/* ── TOP ARCHIVAL MASTHEAD ── */}
      <div className="poster-masthead">
        <span className="poster-masthead-label">✦ HOARD MONOGRAPH</span>
        <span className="poster-masthead-code">{theme.editionCode}</span>
      </div>

      {/* ── EDITORIAL TYPOGRAPHY OVERLAY ── */}
      <div className="poster-header">
        <h3 className="poster-title">{displayTitle}</h3>
        {author && (
          <div className="poster-author">
            <span className="poster-author-dash">—</span> {author}
          </div>
        )}
      </div>

      {/* ── BOTTOM COLLECTOR FOOTER ── */}
      <div className="poster-footer">
        <div className="poster-footer-seal">
          <span>EDITION PRIMA</span>
          <span className="poster-footer-dot">•</span>
          <span>FOLIO</span>
        </div>
        <div className="poster-footer-barcode" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>

      {/* ── 3D BOOK SPINE SHADOW & GLOSS SHEEN ── */}
      <div className="poster-sheen" aria-hidden="true" />
      <div className="poster-spine" aria-hidden="true" />
    </div>
  );
};
