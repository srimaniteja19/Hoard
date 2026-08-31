"use client";

import React, { useState } from "react";
import { playSound } from "@/lib/sound";

interface TranscriptModalProps {
  onConvertToNotes: (transcript: string) => void;
  onAnalyzeGaps: (transcript: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({
  onConvertToNotes,
  onAnalyzeGaps,
  onClose,
  loading = false,
}) => {
  const [transcript, setTranscript] = useState("");

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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.75)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "#F3F0E8",
          border: "3px solid #0A0A0A",
          boxShadow: "10px 10px 0 #0A0A0A",
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
            borderBottom: "3px solid #0A0A0A",
          }}
        >
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#B8F04A", letterSpacing: "0.15em" }}>
            ✦ LECTURE TRANSCRIPT · AI NOTEBOOK SYNTHESIS
          </span>
          <button
            type="button"
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

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", color: "#0A0A0A" }}>
          <p style={{ margin: 0, fontSize: "14.5px", lineHeight: "1.5" }}>
            Paste the raw video transcript below. You can either <b>convert it directly into clean, structured notes</b> or <b>find missing topics</b> against your existing notes.
          </p>

          <textarea
            rows={9}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="0:03 The reflection design pattern is something I've used in many applications..."
            style={{
              width: "100%",
              border: "2px solid #0A0A0A",
              padding: "12px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "12.5px",
              lineHeight: "1.6",
              resize: "vertical",
              outline: "none",
              background: "#FFFFFF",
              color: "#0A0A0A",
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
                border: "2px solid #0A0A0A",
                background: "#FFFFFF",
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
                  border: "2px solid #0A0A0A",
                  background: "#FFFFFF",
                  color: "#0A0A0A",
                  padding: "9px 14px",
                  cursor: loading ? "wait" : "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
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
                  border: "2px solid #0A0A0A",
                  background: "#0A0A0A",
                  color: "#B8F04A",
                  padding: "9px 16px",
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: "3px 3px 0 #B8F04A",
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
