"use client";

import React from "react";
import { playSound } from "@/lib/sound";

interface EmptyPageProps {
  onStartWriting: () => void;
  onPasteTranscript: () => void;
  onDraftFromSlides: () => void;
  onDraftFromTopic?: () => void;
  onCreateSubpage?: () => void;
}

export const EmptyPage: React.FC<EmptyPageProps> = ({
  onStartWriting,
  onPasteTranscript,
  onDraftFromSlides,
  onDraftFromTopic,
  onCreateSubpage,
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

      <div className="nb-empty-btn-group">
        {onDraftFromTopic && (
          <button
            type="button"
            onClick={() => {
              playSound.click();
              onDraftFromTopic();
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              border: "2px solid #0A0A0A",
              background: "#B8F04A",
              color: "#0A0A0A",
              padding: "10px 18px",
              cursor: "pointer",
              boxShadow: "3px 3px 0 #0A0A0A",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-1px, -1px)";
              e.currentTarget.style.boxShadow = "4px 4px 0 #0A0A0A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #0A0A0A";
            }}
          >
            <span>✨ DRAFT FROM QUESTION / TOPIC (AI)</span>
          </button>
        )}

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

        {onCreateSubpage && (
          <button
            type="button"
            onClick={() => {
              playSound.click();
              onCreateSubpage();
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.13em",
              border: "2px solid #0A0A0A",
              background: "#FFFFFF",
              color: "#7B5CF0",
              padding: "10px 16px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F0EDFE")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
          >
            ＋ CREATE SUBPAGE
          </button>
        )}
      </div>
    </div>
  );
};
