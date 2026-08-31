"use client";

import React, { useState } from "react";
import { DigestResult } from "@/lib/summarizer/types";
import { saveDigest } from "@/lib/summarizer/storage";
import { FigureRenderer } from "./figures/FigureRenderer";
import { playSound } from "@/lib/sound";
import {
  Copy,
  Check,
  Printer,
  Sparkles,
  Users,
  BookOpen,
  ShieldAlert,
  Scissors,
  Bookmark,
  Share2,
  ArrowLeft,
} from "lucide-react";

interface DigestReaderProps {
  digest: DigestResult;
  onReset: () => void;
  onSaved?: () => void;
}

export const DigestReader: React.FC<DigestReaderProps> = ({ digest, onReset, onSaved }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"PROSE" | "CLAIMS" | "TERMS" | "CAST">("PROSE");

  const copyAsMarkdown = async () => {
    playSound.click();
    let md = `# ${digest.title}\n\n`;
    md += `> **Thesis**: ${digest.thesis}\n\n`;
    md += `*Read time: ~${digest.readMinutes} mins*\n\n---\n\n`;

    digest.sections.forEach((sec, i) => {
      md += `## ${sec.heading}\n\n`;
      sec.paragraphs.forEach((p) => {
        md += `${p.replace(/<strong>/g, "**").replace(/<\/strong>/g, "**")}\n\n`;
      });
    });

    if (digest.takeaway) {
      md += `### Core Takeaway\n\n${digest.takeaway}\n\n`;
    }

    if (digest.cast && digest.cast.length > 0) {
      md += `### Cast\n\n`;
      digest.cast.forEach((c) => {
        md += `- **${c.name}**: ${c.contribution}\n`;
      });
      md += `\n`;
    }

    if (digest.terms && digest.terms.length > 0) {
      md += `### Key Terms\n\n`;
      digest.terms.forEach((t) => {
        md += `- **${t.term}**: ${t.definition}\n`;
      });
      md += `\n`;
    }

    if (digest.skipped && digest.skipped.length > 0) {
      md += `### Skipped from Original\n\n`;
      digest.skipped.forEach((s) => {
        md += `- ${s}\n`;
      });
    }

    await navigator.clipboard.writeText(md);
    setCopied(true);
    playSound.fileIt();
    setTimeout(() => setCopied(false), 2000);
  };

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    playSound.click();
    saveDigest(digest);
    setSaved(true);
    playSound.fileIt();
    if (onSaved) onSaved();
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePrint = () => {
    playSound.click();
    window.print();
  };

  return (
    <article
      style={{
        background: "#080808",
        border: "2px solid #222222",
        borderRadius: "4px",
        boxShadow: "6px 6px 0 #000000",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      {/* ── TOP ACTION BAR ── */}
      <div
        style={{
          padding: "14px 24px",
          background: "#121212",
          borderBottom: "2px solid #222222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onReset();
          }}
          className="btn-card-action"
          style={{ background: "#1C1C1C", color: "#E5E5E5", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
        >
          <ArrowLeft size={13} />
          NEW DIGEST
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className="btn-card-action"
            style={{
              background: saved ? "#166534" : "#1C1C1C",
              color: saved ? "#FFFFFF" : "#FFE600",
              borderColor: saved ? "#22C55E" : "#333333",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontWeight: 900,
            }}
          >
            {saved ? <Check size={13} /> : <Bookmark size={13} />}
            {saved ? "✓ SAVED TO SHELF!" : "💾 SAVE DIGEST"}
          </button>

          <button
            type="button"
            onClick={copyAsMarkdown}
            className="btn-card-action"
            style={{ background: "#1C1C1C", color: copied ? "#4ADE80" : "#E5E5E5", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "COPIED MARKDOWN!" : "COPY MARKDOWN"}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-card-action"
            style={{ background: "#1C1C1C", color: "#FFFFFF", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
          >
            <Printer size={13} />
            PRINT / PDF
          </button>
        </div>
      </div>

      {/* ── EDITORIAL HEADER ── */}
      <div
        style={{
          padding: "32px 36px 24px",
          borderBottom: "1.5px solid #1E1E1E",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "linear-gradient(180deg, #111111 0%, #080808 100%)",
        }}
      >
        {/* Meta badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, background: "#FFE600", color: "#0A0A0A", padding: "3px 8px", borderRadius: "2px" }}>
            DIGEST · {digest.readMinutes} MIN READ
          </span>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#888888" }}>
            {digest.sections.length} SECTIONS · {digest.figures.length} FIGURES · {digest.claims.length} CLAIMS AUDITED
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--display, sans-serif)",
            fontSize: "36px",
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: "1.15",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {digest.title}
        </h1>

        {/* Thesis Hero Callout */}
        <div
          style={{
            background: "linear-gradient(135deg, #1A1605 0%, #171302 100%)",
            borderLeft: "4px solid #FFE600",
            padding: "16px 20px",
            borderRadius: "0 4px 4px 0",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#FFE600", textTransform: "uppercase" }}>
            CORE INSIGHT (THESIS)
          </span>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "20px",
              fontWeight: 800,
              color: "#FFFBEB",
              lineHeight: "1.4",
            }}
          >
            &ldquo;{digest.thesis}&rdquo;
          </div>
        </div>
      </div>

      {/* ── BODY PROSE & FIGURES ── */}
      <div style={{ padding: "32px 36px 80px", display: "flex", flexDirection: "column", gap: "32px", maxWidth: "920px" }}>
        {digest.sections.map((section, sIdx) => {
          const matchingFigure = digest.figures.find((f) => f.id === section.figureId || f.id === `fig-${sIdx + 1}`);

          return (
            <section key={section.n || sIdx} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Section Heading */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", borderBottom: "1.5px solid #222222", paddingBottom: "8px" }}>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "13px", fontWeight: 900, color: "#FFE600" }}>
                  0{section.n || sIdx + 1}
                </span>
                <h2
                  style={{
                    fontFamily: "var(--display, sans-serif)",
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {section.heading}
                </h2>
              </div>

              {/* Paragraphs with Load-Bearing <strong> Highlighting */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {section.paragraphs.map((para, pIdx) => (
                  <p
                    key={pIdx}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "14.5px",
                      lineHeight: "1.75",
                      color: "#D4D4D8",
                      margin: 0,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: para.replace(
                        /<strong>(.*?)<\/strong>/g,
                        '<strong style="color: #FFE600; font-weight: 800; background: rgba(255, 230, 0, 0.12); padding: 1px 4px; border-radius: 2px;">$1</strong>'
                      ),
                    }}
                  />
                ))}
              </div>

              {/* Matching figure for this section */}
              {matchingFigure && <FigureRenderer figure={matchingFigure} />}
            </section>
          );
        })}

        {/* Render any unassigned figures */}
        {digest.figures
          .filter((f) => !digest.sections.some((s) => s.figureId === f.id || f.id === `fig-${s.n}`))
          .map((orphanFig) => (
            <FigureRenderer key={orphanFig.id} figure={orphanFig} />
          ))}

        {/* ── THE TAKEAWAY BANNER ── */}
        {digest.takeaway && (
          <div
            style={{
              background: "linear-gradient(135deg, #064E3B 0%, #022C22 100%)",
              border: "2px solid #10B981",
              borderRadius: "4px",
              padding: "20px 24px",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginTop: "12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 900, color: "#6EE7B7", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              💎 THE SIX-MONTH TAKEAWAY
            </div>
            <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 800, color: "#FFFFFF", lineHeight: "1.4" }}>
              {digest.takeaway}
            </div>
          </div>
        )}

        {/* ── CAST DOSSIER (IF 4+ ACTORS) ── */}
        {digest.cast && digest.cast.length > 0 && (
          <div style={{ borderTop: "2px solid #222222", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", fontWeight: 900, color: "#C084FC", display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={14} />
              CAST DOSSIER ({digest.cast.length} KEY CONTRIBUTORS)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
              {digest.cast.map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: "#121212",
                    border: "1px solid #282828",
                    padding: "12px 14px",
                    borderRadius: "3px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "14px", color: "#FFFFFF" }}>{c.name}</b>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#A3A3A3" }}>{c.contribution}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── KEY JARGON & TERMS ── */}
        {digest.terms && digest.terms.length > 0 && (
          <div style={{ borderTop: "2px solid #222222", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", fontWeight: 900, color: "#4ADE80", display: "flex", alignItems: "center", gap: "6px" }}>
              <BookOpen size={14} />
              DOMAIN GLOSSARY ({digest.terms.length} TERMS DEFINED)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
              {digest.terms.map((t, i) => (
                <div
                  key={i}
                  style={{
                    background: "#121212",
                    border: "1px solid #282828",
                    padding: "12px 14px",
                    borderRadius: "3px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <b style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#4ADE80" }}>{t.term}</b>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#CCCCCC" }}>{t.definition}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CLAIMS AUDIT (UNVERIFIED ASSERTIONS & NUMBERS) ── */}
        {digest.claims && digest.claims.length > 0 && (
          <div style={{ borderTop: "2px solid #222222", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", fontWeight: 900, color: "#F87171", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldAlert size={14} />
                CLAIMS &amp; ASSERTIONS AUDIT ({digest.claims.length})
              </span>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#888888" }}>
                Tagged unverified unless primary citations are present
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {digest.claims.map((claim, i) => (
                <div
                  key={i}
                  style={{
                    background: "#141414",
                    border: "1px solid #282828",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#E5E5E5" }}>
                    {claim.text}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 900,
                      background: claim.verified ? "#166534" : "#450A0A",
                      color: claim.verified ? "#4ADE80" : "#F87171",
                      border: `1px solid ${claim.verified ? "#22C55E" : "#DC2626"}`,
                      padding: "2px 6px",
                      borderRadius: "2px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {claim.verified ? "✓ VERIFIED" : "⚠ UNVERIFIED CLAIM"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SKIPPED CONTENT TRANSPARENCY FOOTER ── */}
        {digest.skipped && digest.skipped.length > 0 && (
          <div
            style={{
              borderTop: "1.5px dashed #222222",
              paddingTop: "20px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              color: "#737373",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#A3A3A3", fontWeight: 800 }}>
              <Scissors size={13} />
              <span>DELIBERATELY OMITTED FROM ORIGINAL SOURCE (&gt;5% OF TEXT):</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "18px" }}>
              {digest.skipped.map((skip, i) => (
                <div key={i}>• {skip}</div>
              ))}
            </div>
          </div>
        )}

      </div>
    </article>
  );
};
