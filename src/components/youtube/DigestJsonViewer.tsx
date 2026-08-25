"use client";

import React from "react";
import { DigestJson, DigestFigure } from "@/lib/youtube/digest";
import { DigestFigureRenderer } from "./DigestFigureRenderer";
import {
  Sparkles,
  Clock,
  Check,
  Layers,
  BookOpen,
  HelpCircle,
  Pin,
  ExternalLink,
  Flame,
  Zap,
  Tag,
} from "lucide-react";

interface DigestJsonViewerProps {
  digest: DigestJson;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Intelligent contextual emoji picker for headings & terms.
 */
function getHeadingEmoji(heading: string): string {
  const h = heading.toLowerCase();
  if (h.includes("serverless") || h.includes("paradigm") || h.includes("engine")) return "⚡";
  if (h.includes("tree") || h.includes("btree") || h.includes("page") || h.includes("index")) return "🌲";
  if (h.includes("wal") || h.includes("log") || h.includes("concurrency") || h.includes("write")) return "✍️";
  if (h.includes("aviation") || h.includes("standard") || h.includes("testing") || h.includes("verify")) return "✈️";
  if (h.includes("disk") || h.includes("storage") || h.includes("memory")) return "💾";
  if (h.includes("network") || h.includes("socket") || h.includes("http")) return "🌐";
  if (h.includes("friction") || h.includes("intimidation") || h.includes("person") || h.includes("psychology")) return "🧠";
  if (h.includes("scale") || h.includes("growth") || h.includes("metric")) return "📊";
  if (h.includes("protocol") || h.includes("step") || h.includes("ladder")) return "🪜";
  if (h.includes("somatic") || h.includes("pause") || h.includes("breath")) return "🧘";
  return "✦";
}

const STAT_COLORS = [
  { bg: "#FFE94A", fg: "#0A0A0A", border: "#0A0A0A", shadow: "#FF2D8A", emoji: "🔥" },
  { bg: "#7FE9F7", fg: "#0A0A0A", border: "#0A0A0A", shadow: "#0A0A0A", emoji: "⚡" },
  { bg: "#B8F04A", fg: "#0A0A0A", border: "#0A0A0A", shadow: "#0A0A0A", emoji: "🎯" },
  { bg: "#FF2D8A", fg: "#FFFFFF", border: "#0A0A0A", shadow: "#0A0A0A", emoji: "🚀" },
  { bg: "#FF8A3D", fg: "#0A0A0A", border: "#0A0A0A", shadow: "#0A0A0A", emoji: "💎" },
];

export const DigestJsonViewer: React.FC<DigestJsonViewerProps> = ({
  digest,
  className = "",
  style,
}) => {
  if (!digest) return null;

  const figuresMap = new Map<string, DigestFigure>();
  if (Array.isArray(digest.figures)) {
    digest.figures.forEach((f) => {
      if (f.id) figuresMap.set(f.id, f);
    });
  }

  return (
    <div
      className={`digest-json-viewer ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "Space Grotesk, sans-serif",
        color: "var(--ink, #0A0A0A)",
        ...style,
      }}
    >
      {/* ── 1. Editorial Headline & Reading Badge ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {digest.readMinutes && (
            <span
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "11px",
                fontWeight: 900,
                background: "#0A0A0A",
                color: "#FCE94F",
                padding: "3px 10px",
                border: "1.5px solid #0A0A0A",
                boxShadow: "2px 2px 0 #FF2D8A",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                textTransform: "uppercase",
              }}
            >
              <Clock size={12} /> ~{digest.readMinutes} MIN READ ⏱️
            </span>
          )}
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "11px",
              fontWeight: 800,
              background: "#7FE9F7",
              color: "#0A0A0A",
              padding: "3px 8px",
              border: "1.5px solid #0A0A0A",
            }}
          >
            EDITORIAL DIGEST 📰
          </span>
        </div>

        <h1
          style={{
            fontFamily: "Bricolage Grotesque, Space Grotesk, sans-serif",
            fontSize: "32px",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#0A0A0A",
            margin: "4px 0 0 0",
          }}
        >
          {digest.title}
        </h1>
      </div>

      {/* ── 2. The Thesis Hero Card ── */}
      {digest.thesis && (
        <div
          style={{
            padding: "18px 22px",
            background: "#FFFFFF",
            borderLeft: "6px solid #FF2D8A",
            borderTop: "2.5px solid #0A0A0A",
            borderRight: "2.5px solid #0A0A0A",
            borderBottom: "2.5px solid #0A0A0A",
            boxShadow: "5px 5px 0 #0A0A0A",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              color: "#FF2D8A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textTransform: "uppercase",
            }}
          >
            <Sparkles size={14} className="text-[#FF2D8A]" />
            THE CORE MENTAL MODEL 🧠
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "17px",
              fontWeight: 800,
              lineHeight: 1.4,
              color: "#0A0A0A",
            }}
          >
            {digest.thesis}
          </div>
        </div>
      )}

      {/* ── 3. Metrics & Numbers Bento Grid ── */}
      {Array.isArray(digest.stats) && digest.stats.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#0A0A0A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textTransform: "uppercase",
            }}
          >
            <span>📊 KEY METRICS & PROVEN NUMBERS</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {digest.stats.map((stat, sIdx) => {
              const colorTheme = STAT_COLORS[sIdx % STAT_COLORS.length];
              return (
                <div
                  key={sIdx}
                  style={{
                    background: colorTheme.bg,
                    color: colorTheme.fg,
                    border: `2.5px solid ${colorTheme.border}`,
                    boxShadow: `4px 4px 0 ${colorTheme.shadow}`,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "8px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Watermark Emoji */}
                  <span
                    style={{
                      position: "absolute",
                      right: "-6px",
                      bottom: "-8px",
                      fontSize: "44px",
                      opacity: 0.18,
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {colorTheme.emoji}
                  </span>

                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                    <span
                      style={{
                        fontFamily: "Bricolage Grotesque, Space Grotesk, sans-serif",
                        fontSize: "26px",
                        fontWeight: 900,
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {stat.value}
                    </span>
                    {stat.claimed && (
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "9px",
                          fontWeight: 900,
                          background: "#0A0A0A",
                          color: "#FCE94F",
                          padding: "2px 6px",
                          border: "1px solid #0A0A0A",
                          flexShrink: 0,
                        }}
                        title="Asserted by source"
                      >
                        CLAIMED 🏷️
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      lineHeight: 1.35,
                      opacity: 0.95,
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Core Breakdown, Sections & Visual Diagrams ── */}
      {Array.isArray(digest.sections) && digest.sections.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "8px" }}>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#0A0A0A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textTransform: "uppercase",
            }}
          >
            <span>🧩 CORE BREAKDOWN & STRUCTURAL CHAPTERS</span>
          </div>

          {digest.sections.map((sec, idx) => {
            const fig = sec.figureId ? figuresMap.get(sec.figureId) : null;
            const numStr = String(sec.n || idx + 1).padStart(2, "0");
            const emoji = getHeadingEmoji(sec.heading);

            return (
              <div
                key={idx}
                style={{
                  background: "#FFFFFF",
                  border: "2.5px solid #0A0A0A",
                  boxShadow: "4px 4px 0 #0A0A0A",
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                    borderBottom: "2px solid #0A0A0A",
                    paddingBottom: "10px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: "18px",
                      fontWeight: 900,
                      color: "#0A0A0A",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{emoji}</span>
                    <span>
                      {numStr}. {sec.heading}
                    </span>
                  </h3>

                  {sec.timestamp && (
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "11px",
                        fontWeight: 900,
                        background: "#0A0A0A",
                        color: "#FCE94F",
                        padding: "3px 8px",
                        border: "1.5px solid #0A0A0A",
                        boxShadow: "1.5px 1.5px 0 #FF2D8A",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Timestamp in source video"
                    >
                      ▶ {sec.timestamp}
                    </span>
                  )}
                </div>

                {/* Paragraphs with Highlighter <strong> */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {sec.paragraphs?.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      style={{
                        fontSize: "14.5px",
                        lineHeight: 1.55,
                        color: "#161616",
                        margin: 0,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: p.replace(
                          /<strong>(.*?)<\/strong>/gi,
                          '<strong style="background: #FFE94A; color: #0A0A0A; padding: 1px 5px; border: 1.5px solid #0A0A0A; box-shadow: 2px 2px 0 #FF2D8A; font-weight: 800;">$1</strong>'
                        ),
                      }}
                    />
                  ))}
                </div>

                {/* Attached Interactive Diagram / Figure */}
                {fig && <DigestFigureRenderer figure={fig} />}

                {/* Handwritten Aside / Editorial Reaction */}
                {sec.handNote && (
                  <div
                    style={{
                      marginTop: "2px",
                      padding: "8px 12px",
                      background: "rgba(255, 45, 138, 0.08)",
                      borderLeft: "3.5px solid #FF2D8A",
                      fontFamily: "Caveat, cursive",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#FF2D8A",
                      lineHeight: 1.25,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>✏️</span>
                    <span>↳ {sec.handNote}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. Flashcard Glossary of Jargon & Terms ── */}
      {Array.isArray(digest.terms) && digest.terms.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#0A0A0A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textTransform: "uppercase",
            }}
          >
            <span>📚 GLOSSARY OF CORE CONCEPTS</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "12px",
            }}
          >
            {digest.terms.map((t, tIdx) => (
              <div
                key={tIdx}
                style={{
                  background: "#FFFFFF",
                  border: "2px solid #0A0A0A",
                  boxShadow: "3px 3px 0 #0A0A0A",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontWeight: 900,
                      color: "#0A0A0A",
                      background: "#FCE94F",
                      padding: "2px 6px",
                      border: "1.5px solid #0A0A0A",
                      boxShadow: "1.5px 1.5px 0 #0A0A0A",
                      fontSize: "11px",
                    }}
                  >
                    🏷️ {t.term}
                  </span>
                </div>
                <span style={{ fontSize: "13px", color: "#222222", lineHeight: 1.4, fontWeight: 500 }}>
                  {t.definition}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Transcript Speech Corrections ── */}
      {Array.isArray(digest.corrections) && digest.corrections.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#0A0A0A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textTransform: "uppercase",
            }}
          >
            <span>🔍 SPEECH-TO-TEXT CAPTION CORRECTIONS</span>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              border: "2px solid #0A0A0A",
              boxShadow: "2.5px 2.5px 0 #0A0A0A",
              padding: "10px 14px",
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {digest.corrections.map((c, cIdx) => (
              <div
                key={cIdx}
                style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: "11px",
                  background: "#F2EFE8",
                  border: "1.5px solid #0A0A0A",
                  padding: "4px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ textDecoration: "line-through", color: "#888" }}>❌ {c.heard}</span>
                <span style={{ color: "#FF2D8A", fontWeight: 900 }}>→</span>
                <span style={{ fontWeight: 900, color: "#0A0A0A" }}>✅ {c.actual}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. Pinned Physical Index Card Takeaway ── */}
      {digest.takeaway && (
        <div
          style={{
            margin: "16px 0",
            padding: "22px 26px",
            background: "#FCE94F",
            border: "3.5px solid #0A0A0A",
            boxShadow: "7px 7px 0 #0A0A0A",
            transform: "rotate(-0.8deg)",
            position: "relative",
          }}
        >
          {/* Pushpin Badge */}
          <div
            style={{
              position: "absolute",
              top: "-12px",
              left: "24px",
              background: "#FF2D8A",
              color: "#FFF",
              padding: "2px 8px",
              border: "2px solid #0A0A0A",
              boxShadow: "2px 2px 0 #0A0A0A",
              fontFamily: "Space Mono, monospace",
              fontSize: "10px",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              textTransform: "uppercase",
            }}
          >
            📌 WHAT TO ACTUALLY REMEMBER IN 6 MONTHS
          </div>

          <div
            style={{
              fontFamily: "Caveat, cursive",
              fontSize: "26px",
              fontWeight: 700,
              lineHeight: 1.35,
              color: "#0A0A0A",
              marginTop: "8px",
            }}
          >
            "{digest.takeaway}"
          </div>
        </div>
      )}

      {/* ── 8. Deliberately Omitted / Skipped Content ── */}
      {Array.isArray(digest.skipped) && digest.skipped.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(10, 10, 10, 0.04)",
            border: "2px dashed #0A0A0A",
            fontSize: "12px",
            fontFamily: "Space Mono, monospace",
            color: "#444",
          }}
        >
          <div style={{ fontWeight: 900, color: "#0A0A0A", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>✂️ DELIBERATELY OMITTED FROM DIGEST:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {digest.skipped.map((s, sIdx) => (
              <li key={sIdx}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
