"use client";

import React from "react";
import { playSound } from "@/lib/sound";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";

interface EmptyPageProps {
  onStartWriting: () => void;
  onPasteTranscript: () => void;
  onDraftFromTopic?: () => void;
  onCreateSubpage?: () => void;
  theme?: NotebookTheme;
}

export const EmptyPage: React.FC<EmptyPageProps> = ({
  onStartWriting,
  onPasteTranscript,
  onDraftFromTopic,
  onCreateSubpage,
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);

  return (
    <div
      style={{
        border: `2.5px dashed ${tokens.borderPrimary}`,
        padding: "34px 24px",
        textAlign: "center",
        marginTop: "14px",
        background: tokens.isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)",
        color: tokens.textPrimary,
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
          color: tokens.textPrimary,
        }}
      >
        Nothing here yet
      </b>
      <p
        style={{
          margin: "0 auto 22px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          lineHeight: "1.85",
          maxWidth: "48ch",
          color: tokens.textSecondary,
        }}
      >
        PAGES STAY EMPTY UNTIL YOU WRITE THEM. THE OUTLINE STILL COUNTS THIS LESSON, SO THE GAP IS VISIBLE RATHER THAN HIDDEN.
      </p>

      <div className="nb-empty-btn-group">
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onStartWriting();
          }}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            border: `2px solid ${tokens.borderPrimary}`,
            background: tokens.isDark ? "#B8F04A" : "#0A0A0A",
            color: tokens.isDark ? "#0A0A0A" : "#B8F04A",
            padding: "10px 18px",
            cursor: "pointer",
            boxShadow: tokens.isDark ? "3px 3px 0 rgba(0,0,0,0.8)" : "3px 3px 0 #B8F04A",
          }}
        >
          START WRITING
        </button>

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
              fontWeight: 700,
              letterSpacing: "0.11em",
              border: `2px solid ${tokens.borderPrimary}`,
              background: tokens.cardBg,
              color: tokens.textPrimary,
              padding: "10px 16px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = tokens.accentColor;
              e.currentTarget.style.color = tokens.accentFg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = tokens.cardBg;
              e.currentTarget.style.color = tokens.textPrimary;
            }}
          >
            <span>✨ DRAFT FROM TOPIC (AI)</span>
          </button>
        )}

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
            letterSpacing: "0.11em",
            border: `2px solid ${tokens.borderPrimary}`,
            background: tokens.cardBg,
            color: tokens.textPrimary,
            padding: "10px 16px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = tokens.accentColor;
            e.currentTarget.style.color = tokens.accentFg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = tokens.cardBg;
            e.currentTarget.style.color = tokens.textPrimary;
          }}
        >
          IMPORT TRANSCRIPT / SLIDES
        </button>
      </div>

      {onCreateSubpage && (
        <div style={{ marginTop: "14px" }}>
          <button
            type="button"
            onClick={() => {
              playSound.click();
              onCreateSubpage();
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              border: "none",
              background: "transparent",
              color: tokens.textSecondary,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            ＋ Or create a nested subpage
          </button>
        </div>
      )}
    </div>
  );
};
