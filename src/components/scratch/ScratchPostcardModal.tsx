"use client";

import React, { useEffect, useState } from "react";
import { ScratchPostcardRow } from "@/db/schema";
import { ScratchMarkdown } from "./ScratchMarkdown";
import { playSound } from "@/lib/sound";

interface ScratchPostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KIND_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  FRAGMENT: { bg: "var(--cyan)", text: "var(--ink)", label: "FRAGMENTS" },
  QUESTION: { bg: "var(--yellow)", text: "var(--ink)", label: "QUESTIONS" },
  QUOTE: { bg: "var(--violet)", text: "#fff", label: "QUOTES" },
  ACTION: { bg: "var(--lime)", text: "var(--ink)", label: "ACTIONS" },
  RANT: { bg: "var(--pink)", text: "#fff", label: "RANTS" },
  IDEA: { bg: "var(--pink)", text: "#fff", label: "IDEAS" },
  LOG: { bg: "var(--cyan)", text: "var(--ink)", label: "LOGS" },
  INK: { bg: "var(--yellow)", text: "var(--ink)", label: "INK & SKETCHES" },
};

export const ScratchPostcardModal: React.FC<ScratchPostcardModalProps> = ({ isOpen, onClose }) => {
  const [postcard, setPostcard] = useState<ScratchPostcardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch("/api/scratch/postcard", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to generate postcard");
        const data: ScratchPostcardRow = await res.json();
        setPostcard(data);
      })
      .catch(() => setError("Failed to generate this week's postcard"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!postcard) return;
    playSound.copy();
    const tallies = Object.entries(postcard.kindTallies as Record<string, number>)
      .map(([kind, count]) => `- ${kind}: ${count}`)
      .join("\n");
    const md = `# 📮 Week of ${postcard.weekStart} – ${postcard.weekEnd}\n\n${postcard.totalCount} scraps · ${postcard.daysLogged}/7 days logged · ${postcard.currentStreak}-day streak${
      postcard.previousWeekTotal > 0
        ? ` · ${postcard.totalCount >= postcard.previousWeekTotal ? "+" : ""}${postcard.totalCount - postcard.previousWeekTotal} vs last week`
        : ""
    }\n\n## Activity Breakdown\n${tallies}\n${
      postcard.highlightContent ? `\n## Weekly Highlight (${postcard.highlightKind || "NOTE"})\n> ${postcard.highlightContent}\n` : ""
    }`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tallyEntries = postcard
    ? Object.entries(postcard.kindTallies as Record<string, number>).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          border: "var(--b) solid var(--ink)",
          boxShadow: "8px 8px 0 var(--ink)",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "0",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP AIRMAIL COLOR BAR ── */}
        <div
          style={{
            height: "8px",
            background:
              "repeating-linear-gradient(45deg, var(--cyan), var(--cyan) 12px, var(--card) 12px, var(--card) 18px, var(--pink) 18px, var(--pink) 30px, var(--yellow) 30px, var(--yellow) 42px)",
            borderBottom: "var(--b) solid var(--ink)",
          }}
        />

        {/* ── POSTCARD HEADER BAR ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderBottom: "2px solid var(--ink)",
            background: "var(--shelf)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                background: "var(--yellow)",
                padding: "3px 7px",
                border: "1.5px solid var(--ink)",
                boxShadow: "1.5px 1.5px 0 var(--ink)",
                color: "var(--ink)",
              }}
            >
              📮 AIRMAIL
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "var(--ink)",
                opacity: 0.7,
              }}
            >
              SCRATCH WEEKLY POSTCARD
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound.click();
              onClose();
            }}
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--ink)",
              boxShadow: "1.5px 1.5px 0 var(--ink)",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 900,
              width: "26px",
              height: "26px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              lineHeight: 1,
            }}
            title="Close Postcard"
          >
            ✕
          </button>
        </div>

        {/* ── POSTCARD BODY ── */}
        <div style={{ padding: "20px 22px 24px" }}>
          {loading && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "13px",
                fontWeight: 800,
                padding: "32px 0",
                textAlign: "center",
                color: "var(--ink)",
              }}
            >
              📮 GENERATING THIS WEEK&apos;S POSTCARD...
            </div>
          )}

          {error && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "12px",
                fontWeight: 800,
                padding: "16px",
                background: "var(--shelf)",
                border: "2px solid var(--pink)",
                color: "var(--pink)",
                margin: "12px 0",
              }}
            >
              {error}
            </div>
          )}

          {postcard && (
            <>
              {/* ── STAMP & TITLE HEADER ── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      color: "var(--violet)",
                      marginBottom: "4px",
                    }}
                  >
                    CALENDAR WEEK DIGEST
                  </div>
                  <h2
                    style={{
                      fontFamily: "var(--display)",
                      fontWeight: 900,
                      fontSize: "24px",
                      margin: 0,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.15,
                    }}
                  >
                    {postcard.weekStart} – {postcard.weekEnd}
                  </h2>
                </div>

                {/* ── VINTAGE POSTAL STAMP ── */}
                <div
                  style={{
                    flex: "none",
                    border: "2px dashed var(--ink)",
                    padding: "4px 8px",
                    background: "var(--shelf)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
                    transform: "rotate(2deg)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      color: "var(--pink)",
                    }}
                  >
                    HOARD
                  </span>
                  <span style={{ fontSize: "16px", lineHeight: 1.1 }}>📬</span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "7px",
                      fontWeight: 700,
                      opacity: 0.65,
                    }}
                  >
                    ≋≋≋
                  </span>
                </div>
              </div>

              {/* ── METRIC PILLS ROW ── */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "18px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    background: "var(--shelf)",
                    border: "1.5px solid var(--ink)",
                    boxShadow: "1.5px 1.5px 0 var(--ink)",
                  }}
                >
                  📦 <b>{postcard.totalCount}</b> SCRAPS
                </span>

                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    background: "var(--shelf)",
                    border: "1.5px solid var(--ink)",
                    boxShadow: "1.5px 1.5px 0 var(--ink)",
                  }}
                >
                  📅 <b>{postcard.daysLogged}</b>/7 DAYS LOGGED
                </span>

                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    background: "var(--yellow)",
                    border: "1.5px solid var(--ink)",
                    boxShadow: "1.5px 1.5px 0 var(--ink)",
                  }}
                >
                  🔥 <b>{postcard.currentStreak}</b>-DAY STREAK
                </span>

                {postcard.previousWeekTotal > 0 && (
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "4px 8px",
                      background:
                        postcard.totalCount >= postcard.previousWeekTotal
                          ? "var(--lime)"
                          : "var(--pink)",
                      color:
                        postcard.totalCount >= postcard.previousWeekTotal
                          ? "var(--ink)"
                          : "#fff",
                      border: "1.5px solid var(--ink)",
                      boxShadow: "1.5px 1.5px 0 var(--ink)",
                    }}
                  >
                    {postcard.totalCount >= postcard.previousWeekTotal ? "📈 +" : "📉 "}
                    {postcard.totalCount - postcard.previousWeekTotal} VS LAST WK
                  </span>
                )}
              </div>

              {/* ── KIND BREAKDOWN CHIPS ── */}
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    opacity: 0.6,
                    marginBottom: "8px",
                  }}
                >
                  ACTIVITY BREAKDOWN
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {tallyEntries.map(([kind, count]) => {
                    const meta = KIND_COLORS[kind] || {
                      bg: "var(--shelf)",
                      text: "var(--ink)",
                      label: kind,
                    };
                    return (
                      <div
                        key={kind}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "3px 9px",
                          background: meta.bg,
                          color: meta.text,
                          border: "1.5px solid var(--ink)",
                          boxShadow: "1.5px 1.5px 0 var(--ink)",
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        <span>{kind}</span>
                        <span
                          style={{
                            background: "rgba(0,0,0,0.18)",
                            padding: "1px 5px",
                            borderRadius: "2px",
                            fontSize: "10px",
                          }}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── HIGHLIGHT SECTION ── */}
              {postcard.highlightContent && (
                <div style={{ marginBottom: "22px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      fontWeight: 900,
                      letterSpacing: "0.14em",
                      color: "var(--violet)",
                      marginBottom: "6px",
                    }}
                  >
                    <span>⭐ HIGHLIGHT OF THE WEEK</span>
                    {postcard.highlightKind && (
                      <span
                        style={{
                          padding: "1px 5px",
                          background: "var(--violet)",
                          color: "#fff",
                          fontSize: "8px",
                          border: "1px solid var(--ink)",
                        }}
                      >
                        {postcard.highlightKind}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      background: "var(--shelf)",
                      border: "var(--b) solid var(--ink)",
                      boxShadow: "4px 4px 0 var(--violet)",
                      padding: "14px 16px",
                      maxHeight: "220px",
                      overflowY: "auto",
                    }}
                  >
                    <ScratchMarkdown content={postcard.highlightContent} />
                  </div>
                </div>
              )}

              {/* ── FOOTER ACTIONS ── */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  paddingTop: "14px",
                  borderTop: "2px solid rgba(10, 10, 10, 0.12)",
                }}
              >
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    fontFamily: "var(--mono)",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    padding: "9px 16px",
                    border: "var(--b) solid var(--ink)",
                    boxShadow: "2.5px 2.5px 0 var(--ink)",
                    background: "var(--card)",
                    color: "var(--ink)",
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                  }}
                >
                  {copied ? "✓ COPIED MD!" : "📋 COPY MD"}
                </button>

                <a
                  href={`/api/scratch/postcard/${postcard.weekStart}/image`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontFamily: "var(--mono)",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    padding: "9px 18px",
                    border: "var(--b) solid var(--ink)",
                    boxShadow: "2.5px 2.5px 0 var(--ink)",
                    background: "var(--violet)",
                    color: "#fff",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                  }}
                  onClick={() => playSound.click()}
                >
                  <span>⬇ DOWNLOAD POSTCARD</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

