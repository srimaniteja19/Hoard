"use client";

import React, { useState } from "react";
import { BookRow } from "@/db/schema";
import { BookSummaryData, PointCategory, ChapterSummaryPoint } from "@/lib/marginalia/types";
import { exportSummaryToMarkdown } from "@/lib/marginalia/summaryGenerator";
import { playSound } from "@/lib/sound";

interface BookSummaryModalProps {
  isOpen: boolean;
  book: BookRow;
  summary: BookSummaryData | null;
  loading: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

const CATEGORY_CONFIG: Record<
  PointCategory,
  { label: string; icon: string; bg: string; fg: string; border: string }
> = {
  CORE_IDEA: {
    label: "CORE IDEA",
    icon: "💡",
    bg: "#E0F2FE",
    fg: "#0369A1",
    border: "#0284C7",
  },
  MENTAL_MODEL: {
    label: "MENTAL MODEL",
    icon: "🧠",
    bg: "#F3E8FF",
    fg: "#7E22CE",
    border: "#9333EA",
  },
  PROVOCATION: {
    label: "PROVOCATION",
    icon: "⚡",
    bg: "#FFE4E6",
    fg: "#BE123C",
    border: "#E11D48",
  },
  TACTIC: {
    label: "TACTIC",
    icon: "🛠",
    bg: "#DCFCE7",
    fg: "#15803D",
    border: "#16A34A",
  },
  HISTORICAL: {
    label: "HISTORICAL",
    icon: "📜",
    bg: "#FEF3C7",
    fg: "#B45309",
    border: "#D97706",
  },
  EVIDENCE: {
    label: "EVIDENCE",
    icon: "📊",
    bg: "#F1F5F9",
    fg: "#334155",
    border: "#64748B",
  },
};

export const BookSummaryModal: React.FC<BookSummaryModalProps> = ({
  isOpen,
  book,
  summary,
  loading,
  onClose,
  onGenerate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PointCategory | "ALL">("ALL");
  const [activeChapterFilter, setActiveChapterFilter] = useState<number | "ALL">("ALL");
  const [copiedFull, setCopiedFull] = useState(false);
  const [mintedPoints, setMintedPoints] = useState<Record<string, boolean>>({});
  const [copiedPoints, setCopiedPoints] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (!summary) return;
    const md = exportSummaryToMarkdown(summary);
    navigator.clipboard.writeText(md);
    playSound.fileIt();
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2200);
  };

  const handleMintPointAsTil = async (pt: ChapterSummaryPoint, chTitle: string, chNum: number, idx: number) => {
    const key = `${chNum}-${idx}`;
    try {
      playSound.click();
      const res = await fetch("/api/til", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pt.point,
          content: `${pt.detail || pt.point}\n\n*From: ${book.title} (Ch. ${chNum}: ${chTitle})*`,
          tags: ["BookSummary", "Marginalia", CATEGORY_CONFIG[pt.category].label.replace(/\s+/g, "")],
        }),
      });
      if (res.ok) {
        playSound.fileIt();
        setMintedPoints((prev) => ({ ...prev, [key]: true }));
      }
    } catch {
      // ignore
    }
  };

  const handleCopyPoint = (pt: ChapterSummaryPoint, chNum: number, idx: number) => {
    const key = `${chNum}-${idx}`;
    const text = `**[${CATEGORY_CONFIG[pt.category].label}]** ${pt.point}${pt.detail ? `\n${pt.detail}` : ""} (from ${book.title}, Ch. ${chNum})`;
    navigator.clipboard.writeText(text);
    playSound.click();
    setCopiedPoints((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedPoints((prev) => ({ ...prev, [key]: false }));
    }, 1800);
  };

  // Count totals for category badges
  const allPoints = summary?.chapters?.flatMap((ch) => ch.points) || [];
  const categoryCounts = (Object.keys(CATEGORY_CONFIG) as PointCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = allPoints.filter((p) => p.category === cat).length;
      return acc;
    },
    {} as Record<PointCategory, number>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "940px",
          maxHeight: "90vh",
          backgroundColor: "var(--paper)",
          border: "var(--b) solid var(--ink)",
          boxShadow: "10px 10px 0 var(--ink)",
          color: "var(--ink)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── MASTHEAD HEADER ── */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "var(--b) solid var(--ink)",
            background: "var(--ink)",
            color: "var(--paper)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                color: "var(--yellow)",
                marginBottom: "2px",
              }}
            >
              ⚡ EXECUTIVE CHAPTER INTELLIGENCE BRIEFING
            </div>
            <div
              style={{
                fontFamily: "var(--display)",
                fontSize: "20px",
                fontWeight: 800,
                lineHeight: 1.15,
              }}
            >
              {book.title}
              <span style={{ fontFamily: "var(--quote)", fontStyle: "italic", fontSize: "14px", opacity: 0.8, marginLeft: "8px" }}>
                by {book.author}
              </span>
            </div>
          </div>

          {/* Header Action Strip */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {summary && (
              <>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    color: "var(--paper)",
                  }}
                >
                  ⏱ ~{summary.readingTimeMinutes || 10} MIN READ
                </span>

                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "6px 12px",
                    border: "1.5px solid var(--paper)",
                    background: copiedFull ? "var(--lime)" : "transparent",
                    color: copiedFull ? "#0A0A0A" : "var(--paper)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {copiedFull ? "✓ COPIED MD" : "📋 COPY MARKDOWN"}
                </button>

                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={loading}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "6px 12px",
                    border: "1.5px solid var(--paper)",
                    background: "transparent",
                    color: "var(--paper)",
                    cursor: "pointer",
                  }}
                  title="Regenerate briefing"
                >
                  {loading ? "⏳ SYNTHESIZING..." : "🔄 REGENERATE"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 900,
                padding: "6px 12px",
                border: "1.5px solid var(--paper)",
                background: "var(--yellow)",
                color: "#0A0A0A",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── MODAL BODY ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {loading ? (
            <div style={{ padding: "80px 20px", textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "14px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  marginBottom: "12px",
                  color: "var(--ink)",
                }}
              >
                🔮 SYNTHESIZING EXECUTIVE CHAPTER-BY-CHAPTER BRIEFING...
              </div>
              <p style={{ fontFamily: "var(--quote)", fontStyle: "italic", fontSize: "14px", opacity: 0.7 }}>
                Extracting core ideas, mental models, provocations, and tactical takeaways across all chapters...
              </p>
            </div>
          ) : !summary ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--display)", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>
                No Chapter Briefing Generated Yet
              </div>
              <p style={{ fontFamily: "var(--mono)", fontSize: "11.5px", opacity: 0.7, maxWidth: "520px", margin: "0 auto 24px" }}>
                Generate an exhaustive, publication-grade chapter breakdown with categorized bullet points (Core Ideas, Mental Models, Tactics, Provocations, and Evidence) and key quotations.
              </p>
              <button
                type="button"
                onClick={onGenerate}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  padding: "12px 28px",
                  background: "var(--yellow)",
                  color: "#0A0A0A",
                  border: "2.5px solid var(--ink)",
                  boxShadow: "4px 4px 0 var(--ink)",
                  cursor: "pointer",
                }}
              >
                ⚡ GENERATE CHAPTER BRIEFING NOW
              </button>
            </div>
          ) : (
            <>
              {/* ── EXECUTIVE OVERVIEW HERO ── */}
              <div
                style={{
                  background: "var(--card)",
                  border: "2.5px solid var(--ink)",
                  boxShadow: "5px 5px 0 var(--ink)",
                  padding: "20px 24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                      background: "var(--ink)",
                      color: "var(--paper)",
                      padding: "3px 8px",
                    }}
                  >
                    EXECUTIVE ESSENCE
                  </span>

                  {/* Themes */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {summary.coreThemes.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9px",
                          fontWeight: 800,
                          background: "var(--shade)",
                          border: "1px solid var(--ink)",
                          padding: "2px 6px",
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* One Liner */}
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: "18px",
                    fontWeight: 800,
                    lineHeight: 1.3,
                    color: "var(--ink)",
                    marginBottom: "14px",
                  }}
                >
                  “{summary.oneLiner}”
                </div>

                {/* Executive Summary Prose */}
                <p
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "var(--ink)",
                    margin: 0,
                    opacity: 0.9,
                    whiteSpace: "pre-line",
                  }}
                >
                  {summary.executiveSummary}
                </p>
              </div>

              {/* ── INTERACTIVE CATEGORY FILTER BAR ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                  padding: "10px 14px",
                  background: "var(--card)",
                  border: "2px solid var(--ink)",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 900, opacity: 0.6, marginRight: "4px" }}>
                  CATEGORY FILTER:
                </span>

                <button
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setSelectedCategory("ALL");
                  }}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    border: "1.5px solid var(--ink)",
                    background: selectedCategory === "ALL" ? "var(--ink)" : "var(--card)",
                    color: selectedCategory === "ALL" ? "var(--paper)" : "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  ALL POINTS ({allPoints.length})
                </button>

                {(Object.keys(CATEGORY_CONFIG) as PointCategory[]).map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const count = categoryCounts[cat] || 0;
                  const isSel = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setSelectedCategory(cat);
                      }}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        padding: "4px 8px",
                        border: "1.5px solid var(--ink)",
                        background: isSel ? cfg.border : cfg.bg,
                        color: isSel ? "#FFFFFF" : cfg.fg,
                        boxShadow: isSel ? "2px 2px 0 var(--ink)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      {cfg.icon} {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* ── CHAPTER QUICK NAVIGATOR STRIP ── */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  paddingBottom: "4px",
                  borderBottom: "1.5px solid var(--ink)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveChapterFilter("ALL")}
                  style={{
                    flexShrink: 0,
                    fontFamily: "var(--mono)",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    border: "1px solid var(--ink)",
                    background: activeChapterFilter === "ALL" ? "var(--yellow)" : "var(--card)",
                    color: "#0A0A0A",
                    cursor: "pointer",
                  }}
                >
                  ALL CHAPTERS ({summary.chapters.length})
                </button>

                {summary.chapters.map((ch) => (
                  <button
                    key={ch.chapterNumber}
                    type="button"
                    onClick={() => setActiveChapterFilter(ch.chapterNumber)}
                    style={{
                      flexShrink: 0,
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      padding: "4px 8px",
                      border: "1px solid var(--ink)",
                      background: activeChapterFilter === ch.chapterNumber ? "var(--yellow)" : "var(--card)",
                      color: "#0A0A0A",
                      cursor: "pointer",
                    }}
                  >
                    CH {ch.chapterNumber}: {ch.chapterTitle.slice(0, 18)}
                    {ch.chapterTitle.length > 18 ? "..." : ""}
                  </button>
                ))}
              </div>

              {/* ── CHAPTER-BY-CHAPTER CARDS ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {summary.chapters
                  .filter((ch) => activeChapterFilter === "ALL" || activeChapterFilter === ch.chapterNumber)
                  .map((ch) => {
                    const filteredPoints =
                      selectedCategory === "ALL"
                        ? ch.points
                        : ch.points.filter((p) => p.category === selectedCategory);

                    return (
                      <div
                        key={ch.chapterNumber}
                        style={{
                          background: "var(--card)",
                          border: "2.5px solid var(--ink)",
                          boxShadow: "5px 5px 0 var(--ink)",
                          padding: "20px 24px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                        }}
                      >
                        {/* Chapter Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "8px",
                            borderBottom: "1.5px solid var(--ink)",
                            paddingBottom: "10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                fontFamily: "var(--mono)",
                                fontSize: "11px",
                                fontWeight: 900,
                                padding: "4px 8px",
                                background: "var(--ink)",
                                color: "var(--paper)",
                              }}
                            >
                              CH {ch.chapterNumber}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--display)",
                                fontSize: "18px",
                                fontWeight: 800,
                                color: "var(--ink)",
                              }}
                            >
                              {ch.chapterTitle}
                            </span>
                          </div>

                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "9.5px",
                              fontWeight: 800,
                              opacity: 0.6,
                            }}
                          >
                            {ch.points.length} POINTS
                          </span>
                        </div>

                        {/* Chapter Thesis */}
                        <div
                          style={{
                            background: "var(--shade)",
                            borderLeft: "4px solid var(--ink)",
                            padding: "10px 14px",
                            fontFamily: "var(--quote)",
                            fontSize: "14px",
                            fontStyle: "italic",
                            lineHeight: 1.45,
                            color: "var(--ink)",
                          }}
                        >
                          <strong style={{ fontStyle: "normal", fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, display: "block", marginBottom: "3px" }}>
                            CENTRAL THESIS:
                          </strong>
                          {ch.thesis}
                        </div>

                        {/* Key Quote Box if present */}
                        {ch.keyQuote && (
                          <div
                            style={{
                              background: "rgba(251, 191, 36, 0.12)",
                              border: "1.5px dashed var(--yellow)",
                              padding: "10px 14px",
                              fontFamily: "var(--quote)",
                              fontSize: "13.5px",
                              fontStyle: "italic",
                              color: "var(--ink)",
                            }}
                          >
                            &ldquo;{ch.keyQuote}&rdquo;
                          </div>
                        )}

                        {/* Points Breakdown */}
                        {filteredPoints.length === 0 ? (
                          <div
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "10.5px",
                              opacity: 0.5,
                              padding: "10px 0",
                              fontStyle: "italic",
                            }}
                          >
                            No points in this chapter match the &quot;{CATEGORY_CONFIG[selectedCategory as PointCategory]?.label}&quot; filter.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {filteredPoints.map((pt, pIdx) => {
                              const cfg = CATEGORY_CONFIG[pt.category];
                              const pointKey = `${ch.chapterNumber}-${pIdx}`;
                              const isMinted = mintedPoints[pointKey];
                              const isCopied = copiedPoints[pointKey];

                              return (
                                <div
                                  key={pIdx}
                                  style={{
                                    border: "1.5px solid var(--ink)",
                                    background: "var(--paper)",
                                    padding: "12px 14px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                                    <span
                                      style={{
                                        fontFamily: "var(--mono)",
                                        fontSize: "8.5px",
                                        fontWeight: 900,
                                        padding: "2px 6px",
                                        background: cfg.bg,
                                        color: cfg.fg,
                                        border: `1px solid ${cfg.border}`,
                                        letterSpacing: "0.08em",
                                      }}
                                    >
                                      {cfg.icon} {cfg.label}
                                    </span>

                                    <div style={{ display: "flex", gap: "4px" }}>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPoint(pt, ch.chapterNumber, pIdx)}
                                        style={{
                                          fontFamily: "var(--mono)",
                                          fontSize: "8.5px",
                                          fontWeight: 800,
                                          background: isCopied ? "var(--lime)" : "var(--card)",
                                          color: isCopied ? "#0A0A0A" : "var(--ink)",
                                          border: "1px solid var(--ink)",
                                          padding: "2px 6px",
                                          cursor: "pointer",
                                        }}
                                        title="Copy point to clipboard"
                                      >
                                        {isCopied ? "✓ COPIED" : "📋 COPY"}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isMinted}
                                        onClick={() => handleMintPointAsTil(pt, ch.chapterTitle, ch.chapterNumber, pIdx)}
                                        style={{
                                          fontFamily: "var(--mono)",
                                          fontSize: "8.5px",
                                          fontWeight: 800,
                                          background: isMinted ? "var(--lime)" : "var(--yellow)",
                                          color: "#0A0A0A",
                                          border: "1px solid var(--ink)",
                                          padding: "2px 6px",
                                          cursor: isMinted ? "default" : "pointer",
                                        }}
                                        title="Mint as TIL entry"
                                      >
                                        {isMinted ? "✓ MINTED TIL" : "＋ TIL"}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Headline Point */}
                                  <div
                                    style={{
                                      fontFamily: "var(--display)",
                                      fontSize: "14px",
                                      fontWeight: 800,
                                      lineHeight: 1.35,
                                      color: "var(--ink)",
                                    }}
                                  >
                                    {pt.point}
                                  </div>

                                  {/* Detail Subtext */}
                                  {pt.detail && (
                                    <div
                                      style={{
                                        fontFamily: "var(--body)",
                                        fontSize: "13px",
                                        lineHeight: 1.5,
                                        color: "var(--ink)",
                                        opacity: 0.85,
                                      }}
                                    >
                                      {pt.detail}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Chapter Takeaway Footer */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            paddingTop: "6px",
                            borderTop: "1px dashed rgba(10, 10, 10, 0.2)",
                          }}
                        >
                          <span style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 900, background: "var(--yellow)", color: "#0A0A0A", padding: "2px 6px", border: "1px solid var(--ink)" }}>
                            TAKEAWAY
                          </span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 700, opacity: 0.85 }}>
                            {ch.takeaway}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* ── OVERALL TAKEAWAY FOOTER BANNER ── */}
              <div
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  padding: "20px 24px",
                  border: "2.5px solid var(--ink)",
                  boxShadow: "5px 5px 0 var(--ink)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 900,
                    letterSpacing: "0.15em",
                    color: "var(--yellow)",
                    marginBottom: "8px",
                  }}
                >
                  FINAL STRATEGIC SYNTHESIS
                </div>
                <p
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {summary.overallTakeaway}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
