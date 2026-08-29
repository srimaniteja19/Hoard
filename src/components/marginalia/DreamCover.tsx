"use client";

import React, { useMemo } from "react";
import { seedDreamStyle, extractSvgFromDataUri } from "@/lib/marginalia/dreamMotifs";

interface DreamCoverProps {
  title: string;
  author: string;
  coverUrl?: string | null;
  coverSource?: string | null;
  isAlchemizing?: boolean;
  onAlchemize?: () => void;
  className?: string;
}

export const DreamCover: React.FC<DreamCoverProps> = ({
  title,
  author,
  coverUrl,
  coverSource,
  isAlchemizing = false,
  onAlchemize,
  className = "",
}) => {
  const dreamTheme = useMemo(() => {
    return seedDreamStyle(title, author);
  }, [title, author]);

  // Decode and sanitize any stored AI vector SVG
  const customSvgMarkup = useMemo(() => {
    if (!coverUrl) return null;
    return extractSvgFromDataUri(coverUrl);
  }, [coverUrl]);

  const displayTitle = title.trim();
  const activeSvgMarkup = customSvgMarkup || dreamTheme.svgMarkup;
  const isBespoke = Boolean(customSvgMarkup);

  return (
    <div
      className={`dream-cover ${isBespoke ? "dream-cover--bespoke" : ""} ${className}`}
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
      {/* ── LIVING VECTOR ARTWORK BACKGROUND ── */}
      <div
        className="dream-art-full"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: activeSvgMarkup }}
      />

      {/* ── TOP ARCHIVAL MASTHEAD ── */}
      <div className="dream-masthead">
        <span className="dream-badge">✨ AI DREAM</span>
        <span className="dream-theme-tag">
          {isBespoke ? "GEMINI BESPOKE" : dreamTheme.themeName.toUpperCase()}
        </span>
      </div>

      {/* ── EDITORIAL TITLE & AUTHOR TYPOGRAPHY OVERLAY ── */}
      <div className="dream-header">
        <h3 className="dream-title">{displayTitle}</h3>
        {author && <div className="dream-author">{author}</div>}
      </div>

      {/* ── ALCHEMIZE QUICK TRIGGER / SPINNER ── */}
      {isAlchemizing ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background: "rgba(10, 10, 10, 0.85)",
            backdropFilter: "blur(2px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              animation: "spin 1.5s linear infinite",
            }}
          >
            ✨
          </div>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              color: "var(--yellow)",
            }}
          >
            ALCHEMIZING BESPOKE VECTOR...
          </span>
        </div>
      ) : !isBespoke && onAlchemize ? (
        <div className="dream-quick-action" style={{ position: "relative", zIndex: 6, padding: "0 20px" }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAlchemize();
            }}
            style={{
              width: "100%",
              fontFamily: "var(--mono)",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              padding: "4px 8px",
              background: "linear-gradient(135deg, #FFE600 0%, #00F0FF 100%)",
              color: "#000000",
              border: "1.5px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
            title="Generate bespoke AI vector illustration with Gemini"
          >
            ✨ ALCHEMIZE
          </button>
        </div>
      ) : null}

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
