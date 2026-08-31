"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface EmptyPageProps {
  onStartWriting: () => void;
  onPasteTranscript: () => void;
  onDraftFromSlides: () => void;
}

export const EmptyPage: React.FC<EmptyPageProps> = ({
  onStartWriting,
  onPasteTranscript,
  onDraftFromSlides,
}) => {
  return (
    <div
      style={{
        border: "3px dashed rgba(10,10,10,0.22)",
        padding: "36px 26px",
        textAlign: "center",
        marginTop: "14px",
        background: "rgba(255,255,255,0.4)",
      }}
    >
      <b
        style={{
          display: "block",
          fontFamily: "var(--display, sans-serif)",
          fontWeight: 800,
          fontSize: "24px",
          letterSpacing: "-0.035em",
          marginBottom: "8px",
          color: "inherit",
        }}
      >
        Nothing here yet
      </b>
      <p
        style={{
          margin: "0 auto 20px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          opacity: 0.55,
          lineHeight: "1.9",
          maxWidth: "46ch",
          color: "inherit",
        }}
      >
        PAGES STAY EMPTY UNTIL YOU WRITE THEM. THE OUTLINE STILL COUNTS THIS LESSON, SO THE GAP IS VISIBLE RATHER THAN HIDDEN.
      </p>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onStartWriting();
          }}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            border: "2px solid #0A0A0A",
            background: "#0A0A0A",
            color: "#B8F04A",
            padding: "10px 16px",
            cursor: "pointer",
            boxShadow: "3px 3px 0 #B8F04A",
          }}
        >
          START WRITING
        </button>

        <button
          type="button"
          onClick={() => {
            playSound.click();
            onPasteTranscript();
          }}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            border: "2px solid #0A0A0A",
            background: "#FFFFFF",
            color: "#0A0A0A",
            padding: "10px 16px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          PASTE THE TRANSCRIPT
        </button>

        <button
          type="button"
          onClick={() => {
            playSound.click();
            onDraftFromSlides();
          }}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            border: "2px solid #0A0A0A",
            background: "#FFFFFF",
            color: "#0A0A0A",
            padding: "10px 16px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          DRAFT FROM THE SLIDES
        </button>
      </div>
    </div>
  );
};
