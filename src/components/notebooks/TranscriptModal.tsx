"use client";

import React, { useState } from "react";
import { playSound } from "@/lib/sound";

interface TranscriptModalProps {
  onAnalyzeGaps: (transcript: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({
  onAnalyzeGaps,
  onClose,
  loading = false,
}) => {
  const [transcript, setTranscript] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;
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
          maxWidth: "600px",
          background: "#F3F0E8",
          border: "3px solid #0A0A0A",
          boxShadow: "10px 10px 0 #0A0A0A",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
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
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#FF9E2C", letterSpacing: "0.15em" }}>
            ✦ ATTACH LECTURE TRANSCRIPT · FIND GAPS
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

        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "14.5px", lineHeight: "1.5", color: "#0A0A0A" }}>
            Paste the raw video or audio transcript below. The system will compare it against your notes and highlight topics mentioned in the lecture that your notebook doesn't cover yet.
          </p>

          <textarea
            rows={8}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="00:00 Welcome to today's lecture on agentic workflows..."
            style={{
              width: "100%",
              border: "2px solid #0A0A0A",
              padding: "12px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "13px",
              lineHeight: "1.6",
              resize: "vertical",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
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
            <button
              type="submit"
              disabled={loading || !transcript.trim()}
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
              {loading ? "ANALYZING GAPS…" : "COMPARE AGAINST NOTES →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
