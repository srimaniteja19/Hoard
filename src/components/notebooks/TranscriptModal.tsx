"use client";

import React, { useState, useRef } from "react";
import { playSound } from "@/lib/sound";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";

interface TranscriptModalProps {
  onConvertToNotes: (transcript: string) => void;
  onAnalyzeGaps: (transcript: string) => void;
  onClose: () => void;
  loading?: boolean;
  theme?: NotebookTheme;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({
  onConvertToNotes,
  onAnalyzeGaps,
  onClose,
  loading = false,
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [transcript, setTranscript] = useState("");

  useModalFocusTrap({
    isOpen: true,
    onClose: () => {
      if (!loading) onClose();
    },
    containerRef: dialogRef,
  });

  const handleConvert = () => {
    if (!transcript.trim() || loading) return;
    playSound.fileIt();
    onConvertToNotes(transcript.trim());
  };

  const handleGaps = () => {
    if (!transcript.trim() || loading) return;
    playSound.fileIt();
    onAnalyzeGaps(transcript.trim());
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Import transcript or slides"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.75)",
        backdropFilter: "blur(3px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          background: tokens.canvasBg,
          color: tokens.textPrimary,
          border: `3px solid ${tokens.borderPrimary}`,
          boxShadow: tokens.popoverShadow,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            background: "#0A0A0A",
            color: "#F0EDE4",
            borderBottom: `3px solid ${tokens.borderPrimary}`,
          }}
        >
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#B8F04A", letterSpacing: "0.15em" }}>
            ✦ PASTE CONTENT · AI NOTEBOOK SYNTHESIS
          </span>
          <button
            type="button"
            aria-label="Close transcript modal"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#F0EDE4",
              fontFamily: "var(--mono, monospace)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", color: tokens.textPrimary }}>
          <p style={{ margin: 0, fontSize: "14.5px", lineHeight: "1.5" }}>
            Paste a lecture transcript, slide text, or any source material below. You can either <b>convert it directly into clean, structured notes</b> or <b>find missing topics</b> against your existing notes.
          </p>

          <textarea
            rows={9}
            className="nb-mobile-16px"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="0:03 The reflection design pattern is something I've used in many applications..."
            style={{
              width: "100%",
              border: `2px solid ${tokens.borderPrimary}`,
              padding: "12px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "12.5px",
              lineHeight: "1.6",
              resize: "vertical",
              background: tokens.cardBg,
              color: tokens.textPrimary,
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `2px solid ${tokens.borderPrimary}`,
                background: tokens.cardBg,
                color: tokens.textPrimary,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={loading || !transcript.trim()}
                onClick={handleGaps}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: tokens.cardBg,
                  color: tokens.textPrimary,
                  padding: "9px 14px",
                  cursor: loading ? "wait" : "pointer",
                  opacity: !transcript.trim() ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!transcript.trim()) return;
                  e.currentTarget.style.background = tokens.accentColor;
                  e.currentTarget.style.color = tokens.accentFg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = tokens.cardBg;
                  e.currentTarget.style.color = tokens.textPrimary;
                }}
              >
                COMPARE GAPS
              </button>

              <button
                type="button"
                disabled={loading || !transcript.trim()}
                onClick={handleConvert}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: "#0A0A0A",
                  color: "#B8F04A",
                  padding: "9px 16px",
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: "3px 3px 0 #B8F04A",
                  opacity: !transcript.trim() ? 0.5 : 1,
                }}
              >
                {loading ? "SYNTHESIZING NOTES…" : "✦ CONVERT INTO NOTES (AI) →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
