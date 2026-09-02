"use client";

import React, { useState, useEffect } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";
import {
  RotateCcw,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  Flame,
  X,
} from "lucide-react";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: "gotcha" | "fact" | "question" | "concept" | "code" | "toggle";
  sourceHint?: string;
}

interface FlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  blocks: Block[];
  accentColor?: string;
}

export function extractFlashcards(lessonTitle: string, blocks: Block[]): Flashcard[] {
  const cards: Flashcard[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    if (b.type === "callout") {
      if (b.kind === "gotcha") {
        cards.push({
          id: b.id,
          category: "gotcha",
          front: `What is the key gotcha / pitfall in "${lessonTitle}"?`,
          back: b.text,
          sourceHint: "Gotcha Callout",
        });
      } else if (b.kind === "fact") {
        cards.push({
          id: b.id,
          category: "fact",
          front: `Key takeaway / principle regarding:`,
          back: b.text,
          sourceHint: "Core Takeaway",
        });
      } else if (b.kind === "question") {
        cards.push({
          id: b.id,
          category: "question",
          front: b.text,
          back: `Reflect on this question in the context of ${lessonTitle}. Look up key concepts in your notes.`,
          sourceHint: "Self-Check Question",
        });
      }
    } else if (b.type === "toggle") {
      cards.push({
        id: b.id,
        category: "toggle",
        front: b.summary,
        back: b.body,
        sourceHint: "Collapsible Concept",
      });
    } else if (b.type === "heading" && i + 1 < blocks.length) {
      const nextB = blocks[i + 1];
      if (nextB.type === "paragraph" && nextB.text.trim().length > 20) {
        cards.push({
          id: b.id,
          category: "concept",
          front: `Explain / define: "${b.text}"`,
          back: nextB.text,
          sourceHint: `Section ${b.level === 3 ? "###" : "##"} Heading`,
        });
      }
    } else if (b.type === "code" && b.note) {
      cards.push({
        id: b.id,
        category: "code",
        front: `What does this snippet accomplish?\n\n${b.note}`,
        back: `\`\`\`${(b.lang || "").toLowerCase()}\n${b.code}\n\`\`\``,
        sourceHint: `${b.lang || "Code"} Snippet`,
      });
    }
  }

  // Fallback card if notes are very brief
  if (cards.length === 0) {
    cards.push({
      id: "fallback-1",
      category: "concept",
      front: `Summarize the primary purpose of "${lessonTitle}"`,
      back: `Review and jot down key bullets or concepts for ${lessonTitle} to generate more targeted active recall cards!`,
      sourceHint: "Lesson Overview",
    });
  }

  return cards;
}

export const FlashcardModal: React.FC<FlashcardModalProps> = ({
  isOpen,
  onClose,
  lessonTitle,
  blocks,
  accentColor = "#7B5CF0",
}) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [sessionFinished, setSessionFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const generated = extractFlashcards(lessonTitle, blocks);
      setCards(generated);
      setCurrentIndex(0);
      setIsFlipped(false);
      setRatings({});
      setSessionFinished(false);
    }
  }, [isOpen, lessonTitle, blocks]);

  const currentCard = cards[currentIndex];

  const handleFlip = () => {
    playSound.click();
    setIsFlipped(!isFlipped);
  };

  const handleRate = (score: number) => {
    if (!currentCard) return;
    playSound.click();
    setRatings((prev) => ({ ...prev, [currentCard.id]: score }));

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setSessionFinished(true);
      playSound.fileIt();
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      playSound.click();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      playSound.click();
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (!isOpen || sessionFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "1") {
        e.preventDefault();
        handleRate(1);
      } else if (e.key === "2") {
        e.preventDefault();
        handleRate(2);
      } else if (e.key === "3") {
        e.preventDefault();
        handleRate(3);
      } else if (e.key === "4") {
        e.preventDefault();
        handleRate(4);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFlipped, currentIndex, cards.length, sessionFinished]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.7)",
        backdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        zIndex: 99999,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "#FFFFFF",
          border: "3px solid #0A0A0A",
          boxShadow: "10px 10px 0 #0A0A0A",
          padding: "28px",
          color: "#0A0A0A",
          position: "relative",
          animation: "fadeIn 0.12s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            borderBottom: "2px solid rgba(10,10,10,0.12)",
            paddingBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.15em",
                opacity: 0.5,
                marginBottom: "3px",
              }}
            >
              ACTIVE RECALL STUDY DECK
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--display, sans-serif)",
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              {lessonTitle}
            </h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                background: "#EBE7DC",
                border: "1.5px solid #0A0A0A",
                padding: "2px 8px",
              }}
            >
              CARD {currentIndex + 1} / {cards.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1.5px solid #0A0A0A",
                cursor: "pointer",
                padding: "4px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Study Finished View */}
        {sessionFinished ? (
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div
              style={{
                display: "inline-flex",
                padding: "16px",
                background: "#B8F04A",
                border: "3px solid #0A0A0A",
                boxShadow: "4px 4px 0 #0A0A0A",
                marginBottom: "16px",
              }}
            >
              <Sparkles size={28} />
            </div>
            <h2
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: "26px",
                fontWeight: 800,
                margin: "0 0 8px",
                letterSpacing: "-0.03em",
              }}
            >
              Session Complete!
            </h2>
            <p
              style={{
                fontFamily: "var(--body, sans-serif)",
                fontSize: "14px",
                opacity: 0.7,
                maxWidth: "400px",
                margin: "0 auto 24px",
              }}
            >
              You reviewed all {cards.length} recall prompts for this lesson.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setRatings({});
                  setSessionFinished(false);
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: "2px solid #0A0A0A",
                  background: "#FCE94F",
                  color: "#0A0A0A",
                  padding: "10px 18px",
                  cursor: "pointer",
                  boxShadow: "3px 3px 0 #0A0A0A",
                }}
              >
                STUDY AGAIN
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: "2px solid #0A0A0A",
                  background: "#FFFFFF",
                  color: "#0A0A0A",
                  padding: "10px 18px",
                  cursor: "pointer",
                }}
              >
                CLOSE DECK
              </button>
            </div>
          </div>
        ) : (
          /* Active Flashcard View */
          <div>
            {/* 3D Flashcard Container */}
            <div
              onClick={handleFlip}
              style={{
                minHeight: "220px",
                background: isFlipped ? "#F7F5EE" : "#FFFFFF",
                border: "3px solid #0A0A0A",
                boxShadow: "6px 6px 0 #0A0A0A",
                padding: "24px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                marginBottom: "20px",
                transition: "background 0.15s ease",
                userSelect: "none",
              }}
            >
              {/* Card Subhead Tag */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  opacity: 0.6,
                }}
              >
                <span>{isFlipped ? "ANSWER / EXPLANATION" : "PROMPT / CONCEPT"}</span>
                <span>{currentCard?.sourceHint}</span>
              </div>

              {/* Card Body Text */}
              <div
                style={{
                  fontSize: isFlipped ? "16px" : "19px",
                  fontWeight: isFlipped ? 500 : 700,
                  fontFamily: isFlipped ? "var(--body, sans-serif)" : "var(--display, sans-serif)",
                  lineHeight: 1.35,
                  margin: "20px 0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {isFlipped ? currentCard?.back : currentCard?.front}
              </div>

              {/* Card Flip Hint */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 700,
                  opacity: 0.4,
                  letterSpacing: "0.1em",
                }}
              >
                CLICK OR PRESS SPACE TO {isFlipped ? "SHOW FRONT" : "FLIP"}
              </div>
            </div>

            {/* Rating Buttons */}
            {isFlipped ? (
              <div>
                <div
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textAlign: "center",
                    opacity: 0.55,
                    marginBottom: "8px",
                  }}
                >
                  HOW WELL DID YOU REMEMBER THIS?
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleRate(1)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      border: "2px solid #0A0A0A",
                      background: "#FEE2E2",
                      color: "#991B1B",
                      padding: "10px 4px",
                      cursor: "pointer",
                    }}
                  >
                    1 · AGAIN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate(2)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      border: "2px solid #0A0A0A",
                      background: "#FFEDD5",
                      color: "#9A3412",
                      padding: "10px 4px",
                      cursor: "pointer",
                    }}
                  >
                    2 · HARD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate(3)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      border: "2px solid #0A0A0A",
                      background: "#FEF08A",
                      color: "#854D0E",
                      padding: "10px 4px",
                      cursor: "pointer",
                    }}
                  >
                    3 · GOOD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate(4)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      border: "2px solid #0A0A0A",
                      background: "#BBF7D0",
                      color: "#166534",
                      padding: "10px 4px",
                      cursor: "pointer",
                    }}
                  >
                    4 · EASY
                  </button>
                </div>
              </div>
            ) : (
              /* Navigation Row */
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    border: "2px solid #0A0A0A",
                    background: "#FFFFFF",
                    padding: "8px 14px",
                    cursor: currentIndex > 0 ? "pointer" : "default",
                    opacity: currentIndex > 0 ? 1 : 0.3,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ChevronLeft size={12} /> PREV
                </button>

                <button
                  type="button"
                  onClick={handleFlip}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    border: "2px solid #0A0A0A",
                    background: "#FCE94F",
                    padding: "9px 24px",
                    cursor: "pointer",
                    boxShadow: "3px 3px 0 #0A0A0A",
                  }}
                >
                  FLIP CARD (SPACE)
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex === cards.length - 1}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    border: "2px solid #0A0A0A",
                    background: "#FFFFFF",
                    padding: "8px 14px",
                    cursor: currentIndex < cards.length - 1 ? "pointer" : "default",
                    opacity: currentIndex < cards.length - 1 ? 1 : 0.3,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  NEXT <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
