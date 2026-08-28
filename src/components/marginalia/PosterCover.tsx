"use client";

import React, { useMemo } from "react";
import {
  PosterMotif,
  seedPosterStyle,
  renderPosterIllustration,
} from "@/lib/marginalia/posterMotifs";
import { PosterSeries } from "@/lib/marginalia/types";

interface PosterCoverProps {
  title: string;
  author: string;
  motif?: PosterMotif | null;
  series?: PosterSeries;
  className?: string;
}

export const PosterCover: React.FC<PosterCoverProps> = ({
  title,
  author,
  motif,
  series = "daylight",
  className = "",
}) => {
  const theme = useMemo(() => {
    return seedPosterStyle(title, author, series);
  }, [title, author, series]);

  const illustrationSvg = useMemo(() => {
    return renderPosterIllustration(theme.motif, theme.tokens);
  }, [theme]);

  const displayTitle = title.trim();
  const isNeon = theme.series === "neon";

  return (
    <div
      className={`poster-cover ${isNeon ? "poster-cover--neon" : "poster-cover--daylight"} ${className}`}
      style={
        {
          background: theme.tokens.g,
          "--p-g": theme.tokens.g,
          "--p-a": theme.tokens.a,
          "--p-b": theme.tokens.b,
          "--p-fg": theme.tokens.fg,
          "--p-accent": theme.tokens.a,
        } as React.CSSProperties
      }
    >
      {/* ── FULL-BLEED LIVING VECTOR ART (3 TOKENS: a, b, g) ── */}
      <div
        className="poster-art-full"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: illustrationSvg }}
      />

      {/* ── TOP ARCHIVAL MASTHEAD ── */}
      <div className="poster-masthead">
        <span className="poster-masthead-label">✦ HOARD MONOGRAPH</span>
        <span className="poster-masthead-code">{theme.tokens.editionCode}</span>
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

      {/* ── 3D BOOK SPINE SHADOW & SHEEN ── */}
      <div className="poster-sheen" aria-hidden="true" />
      <div className="poster-spine" aria-hidden="true" />
    </div>
  );
};
