"use client";

import React, { useState, useRef } from "react";
import { playSound } from "@/lib/sound";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";

interface QuizQuestion {
  prompt: string;
  kind: "recall" | "apply" | "connect";
  answer: string;
  fromBlockId: string;
}

interface QuizModalProps {
  questions: QuizQuestion[];
  notEnough?: boolean;
  explanation?: string;
  onClose: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  questions,
  notEnough = false,
  explanation,
  onClose,
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useModalFocusTrap({
    isOpen: true,
    onClose,
    containerRef: dialogRef,
  });

  if (notEnough || questions.length === 0) {
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Not enough material to quiz"
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
            maxWidth: "500px",
            background: tokens.canvasBg,
            color: tokens.textPrimary,
            border: `3px solid ${tokens.borderPrimary}`,
            boxShadow: tokens.popoverShadow,
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              margin: "0 auto 14px",
              background: "#FCE94F",
              color: "#0A0A0A",
              border: `2px solid ${tokens.borderPrimary}`,
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "18px",
              fontWeight: 900,
            }}
          >
            !
          </div>
          <h3 style={{ margin: "0 0 8px", fontFamily: "var(--display, sans-serif)", fontWeight: 800, fontSize: "22px" }}>
            Not Enough Material to Quiz
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6", color: tokens.textSecondary, margin: "0 0 20px" }}>
            {explanation || "Notes this thin don't have at least three quizzable claims. The gap is yours to notice rather than papering over with filler questions."}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              border: `2px solid ${tokens.borderPrimary}`,
              background: "#0A0A0A",
              color: "#B8F04A",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            ← BACK TO NOTES
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  const handleNext = () => {
    playSound.click();
    setShowAnswer(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notebook active recall quiz"
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
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#FCE94F", letterSpacing: "0.15em" }}>
            ✦ QUIZ ME · QUESTION {currentIndex + 1} OF {questions.length}
          </span>
          <button
            type="button"
            aria-label="Close quiz modal"
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

        {/* Card Body */}
        <div style={{ padding: "24px", color: tokens.textPrimary }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                background: q.kind === "recall" ? "#B8F04A" : q.kind === "apply" ? "#7FE9F7" : "#FF9E2C",
                color: "#0A0A0A",
                border: `1.5px solid ${tokens.borderPrimary}`,
                padding: "2px 7px",
              }}
            >
              {q.kind.toUpperCase()}
            </span>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "8.5px", color: tokens.textMuted }}>
              CITES BLOCK: <code>{q.fromBlockId}</code>
            </span>
          </div>

          <h3
            style={{
              margin: "0 0 20px",
              fontFamily: "var(--display, sans-serif)",
              fontWeight: 800,
              fontSize: "22px",
              lineHeight: 1.25,
            }}
          >
            {q.prompt}
          </h3>

          {/* Reveal Answer Box */}
          {showAnswer ? (
            <div
              style={{
                border: `2px solid ${tokens.borderPrimary}`,
                background: tokens.cardBg,
                boxShadow: tokens.boxShadow,
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: tokens.isDark ? "#4ADE80" : "#16A34A",
                  letterSpacing: "0.12em",
                  marginBottom: "6px",
                }}
              >
                ✓ CORRECT MODEL ANSWER (FROM YOUR NOTES)
              </div>
              <div style={{ fontSize: "15.5px", lineHeight: "1.6" }}>{q.answer}</div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                playSound.pop();
                setShowAnswer(true);
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: `2px dashed ${tokens.borderPrimary}`,
                background: tokens.cardBg,
                color: tokens.textPrimary,
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                cursor: "pointer",
                marginBottom: "20px",
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
              CLICK TO REVEAL ANSWER
            </button>
          )}

          {/* Footer Action */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleNext}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                border: `2px solid ${tokens.borderPrimary}`,
                background: "#0A0A0A",
                color: "#B8F04A",
                padding: "10px 18px",
                cursor: "pointer",
                boxShadow: "3px 3px 0 #B8F04A",
              }}
            >
              {currentIndex < questions.length - 1 ? "NEXT QUESTION →" : "FINISH QUIZ ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
