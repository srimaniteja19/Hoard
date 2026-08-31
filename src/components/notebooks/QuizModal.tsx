"use client";

import React, { useState } from "react";
import { playSound } from "@/lib/sound";
import { HelpCircle, Check, X, ArrowRight } from "lucide-react";

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
}

export const QuizModal: React.FC<QuizModalProps> = ({
  questions,
  notEnough = false,
  explanation,
  onClose,
  accentColor = "#7B5CF0",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (notEnough || questions.length === 0) {
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
            maxWidth: "500px",
            background: "#F3F0E8",
            border: "3px solid #0A0A0A",
            boxShadow: "8px 8px 0 #0A0A0A",
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
              border: "2px solid #0A0A0A",
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
          <p style={{ fontSize: "14px", lineHeight: "1.6", opacity: 0.7, margin: "0 0 20px" }}>
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
              border: "2px solid #0A0A0A",
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
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#FCE94F", letterSpacing: "0.15em" }}>
            ✦ QUIZ ME · QUESTION {currentIndex + 1} OF {questions.length}
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

        {/* Card Body */}
        <div style={{ padding: "24px", color: "#0A0A0A" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                background: q.kind === "recall" ? "#B8F04A" : q.kind === "apply" ? "#7FE9F7" : "#FF9E2C",
                color: "#0A0A0A",
                border: "1.5px solid #0A0A0A",
                padding: "2px 7px",
              }}
            >
              {q.kind.toUpperCase()}
            </span>
            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "8.5px", opacity: 0.5 }}>
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
                border: "2px solid #0A0A0A",
                background: "#FFFFFF",
                boxShadow: "4px 4px 0 #0A0A0A",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#16A34A",
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
                border: "2px dashed #0A0A0A",
                background: "rgba(255,255,255,0.6)",
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                cursor: "pointer",
                marginBottom: "20px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.6)")}
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
                border: "2px solid #0A0A0A",
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
