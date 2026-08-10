"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { EmbedRouter } from "@/components/til/embeds/EmbedRouter";
import { maskTextWords, maskCodeLines } from "@/lib/til/masking";
import { Rating } from "@/lib/til/confidence";
import { RotateCcw, CheckCircle2, Eye, RefreshCw } from "lucide-react";

interface TilRecallViewProps {
  deck: TilItem[];
  nextReviewAt: string | null;
  nextReviewInDays: number | null;
  onRefreshDeck: () => void;
  validHashes?: Set<string>;
}

export const TilRecallView: React.FC<TilRecallViewProps> = ({
  deck,
  nextReviewAt,
  nextReviewInDays,
  onRefreshDeck,
  validHashes,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<Array<{ id: string; rating: Rating }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const currentCard = deck[currentIndex] || null;
  const isSessionComplete = deck.length > 0 && currentIndex >= deck.length;

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!currentCard || submitting || !isRevealed) return;

      try {
        setSubmitting(true);
        // Persist per-card immediately so mid-session tab close preserves ratings
        await fetch("/api/til/recall/review", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentCard.id, rating }),
        });

        setSessionRatings((prev) => [...prev, { id: currentCard.id, rating }]);
        setIsRevealed(false);
        setCurrentIndex((prev) => prev + 1);
      } catch (err) {
        console.error("Failed to persist card rating", err);
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, isRevealed, submitting]
  );

  // Keyboard shortcut listener (Space to reveal, 1/2/3 to rate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSessionComplete || deck.length === 0) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsRevealed(true);
      } else if (isRevealed) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate("FORGOT");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate("FUZZY");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate("GOT_IT");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRevealed, isSessionComplete, deck.length, handleRate]);

  // Empty State: Nothing due
  if (deck.length === 0) {
    return (
      <div
        style={{
          background: "var(--paper)",
          border: "var(--bd)",
          boxShadow: "var(--sh)",
          padding: "48px 24px",
          textAlign: "center",
          maxWidth: "560px",
          margin: "32px auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            background: "#B6FF3C",
            border: "2px solid var(--ink)",
            marginBottom: "16px",
            boxShadow: "3px 3px 0 var(--ink)",
          }}
        >
          <CheckCircle2 size={28} color="#000" />
        </div>

        <h2 style={{ fontFamily: "var(--mono)", fontSize: "16px", fontWeight: 900, marginBottom: "8px" }}>
          NOTHING DUE FOR REVIEW
        </h2>

        <p style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.7, marginBottom: "24px" }}>
          {nextReviewInDays
            ? `Next review scheduled in ${nextReviewInDays} ${nextReviewInDays === 1 ? "day" : "days"} (${nextReviewAt ? nextReviewAt.split("T")[0] : ""}).`
            : "You're all caught up! Check back later."}
        </p>

        <button
          type="button"
          onClick={onRefreshDeck}
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 900,
            background: "var(--paper)",
            color: "var(--ink)",
            border: "1.5px solid var(--ink)",
            padding: "8px 16px",
            cursor: "pointer",
            boxShadow: "2px 2px 0 var(--ink)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <RefreshCw size={13} /> CHECK AGAIN
        </button>
      </div>
    );
  }

  // Session Summary End Card
  if (isSessionComplete) {
    const gotItCount = sessionRatings.filter((r) => r.rating === "GOT_IT").length;
    const fuzzyCount = sessionRatings.filter((r) => r.rating === "FUZZY").length;
    const forgotCount = sessionRatings.filter((r) => r.rating === "FORGOT").length;

    return (
      <div
        style={{
          background: "var(--paper)",
          border: "var(--bd)",
          boxShadow: "var(--sh)",
          padding: "40px 24px",
          textAlign: "center",
          maxWidth: "560px",
          margin: "32px auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            background: "var(--yel, #FFE600)",
            border: "2px solid var(--ink)",
            marginBottom: "16px",
            boxShadow: "3px 3px 0 var(--ink)",
          }}
        >
          <RotateCcw size={28} color="#000" />
        </div>

        <h2 style={{ fontFamily: "var(--mono)", fontSize: "16px", fontWeight: 900, marginBottom: "8px" }}>
          REVIEW SESSION COMPLETE!
        </h2>

        <p style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.7, marginBottom: "24px" }}>
          Reviewed {deck.length} cards in this session.
        </p>

        {/* Rating Breakdown Badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "32px" }}>
          <div style={{ background: "rgba(182, 255, 60, 0.3)", border: "1.5px solid var(--ink)", padding: "8px 14px", fontFamily: "var(--mono)" }}>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>{gotItCount}</div>
            <div style={{ fontSize: "10px", fontWeight: 800 }}>GOT IT</div>
          </div>

          <div style={{ background: "rgba(255, 230, 0, 0.3)", border: "1.5px solid var(--ink)", padding: "8px 14px", fontFamily: "var(--mono)" }}>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>{fuzzyCount}</div>
            <div style={{ fontSize: "10px", fontWeight: 800 }}>FUZZY</div>
          </div>

          <div style={{ background: "rgba(255, 0, 122, 0.2)", border: "1.5px solid var(--ink)", padding: "8px 14px", fontFamily: "var(--mono)" }}>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>{forgotCount}</div>
            <div style={{ fontSize: "10px", fontWeight: 800 }}>FORGOT</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setCurrentIndex(0);
            setSessionRatings([]);
            setIsRevealed(false);
            onRefreshDeck();
          }}
          style={{
            fontFamily: "var(--mono)",
            fontSize: "12px",
            fontWeight: 900,
            background: "var(--yel, #FFE600)",
            color: "#000",
            border: "2px solid var(--ink)",
            padding: "8px 24px",
            cursor: "pointer",
            boxShadow: "3px 3px 0 var(--ink)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          START ANOTHER DECK <RefreshCw size={13} />
        </button>
      </div>
    );
  }

  // Active Masked Card View
  const textMask = currentCard.body ? maskTextWords(currentCard.body) : null;
  const codeMask = currentCard.code ? maskCodeLines(currentCard.code) : null;

  return (
    <div style={{ maxWidth: "680px", margin: "16px auto" }}>
      {/* Progress Strip at top */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "16px",
          alignItems: "center",
        }}
      >
        {deck.map((item, idx) => {
          const ratingObj = sessionRatings.find((r) => r.id === item.id);
          let segColor = "rgba(0,0,0,0.1)";

          if (ratingObj) {
            if (ratingObj.rating === "GOT_IT") segColor = "#B6FF3C";
            else if (ratingObj.rating === "FUZZY") segColor = "#FFE600";
            else if (ratingObj.rating === "FORGOT") segColor = "#FF007A";
          } else if (idx === currentIndex) {
            segColor = "var(--ink)";
          }

          return (
            <div
              key={item.id}
              style={{
                flex: 1,
                height: "6px",
                background: segColor,
                border: "1px solid var(--ink)",
                transition: "background 0.2s ease",
              }}
              title={`Card ${idx + 1} of ${deck.length}`}
            />
          );
        })}
      </div>

      {/* Main Card Surface */}
      <div
        style={{
          background: "var(--paper)",
          border: "var(--bd)",
          boxShadow: "var(--sh)",
          padding: "24px",
          marginBottom: "20px",
          minHeight: "280px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* Card Header metadata */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              paddingBottom: "8px",
              borderBottom: "1px solid var(--ink)",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 900,
                  background: "#00F0FF",
                  color: "#000",
                  padding: "1px 6px",
                  border: "1px solid var(--ink)",
                }}
              >
                {currentCard.type}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, opacity: 0.7 }}>
                #{currentCard.shortHash}
              </span>
            </div>

            <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800 }}>
              CARD {currentIndex + 1} OF {deck.length}
            </span>
          </div>

          {/* Card Content Body */}
          <div style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--ink)", marginBottom: "16px" }}>
            {isRevealed ? (
              // Full Unmasked Reveal
              <div>
                {currentCard.body && <MarkdownLite content={currentCard.body} validHashes={validHashes} />}
                {currentCard.code && (
                  <div
                    style={{
                      background: "#1E1E1E",
                      color: "#FFF",
                      fontFamily: "var(--mono)",
                      padding: "12px",
                      marginTop: "12px",
                      border: "1.5px solid var(--ink)",
                      overflowX: "auto",
                      fontSize: "13px",
                    }}
                  >
                    <pre style={{ margin: 0 }}>{currentCard.code}</pre>
                  </div>
                )}
                {currentCard.linkUrl && currentCard.linkPreview && (
                  <div style={{ marginTop: "12px" }}>
                    <EmbedRouter preview={currentCard.linkPreview} density={(currentCard.linkDensity as "card" | "inline" | "quote" | "full") || "card"} />
                  </div>
                )}
              </div>
            ) : (
              // Masked View (First ~28% revealed, rest black filled blocks)
              <div>
                {textMask && textMask.revealedText && (
                  <div style={{ marginBottom: "8px" }}>
                    <span>{textMask.revealedText} </span>
                    <span
                      style={{
                        background: "var(--ink)",
                        color: "var(--ink)",
                        userSelect: "none",
                        padding: "0 6px",
                        letterSpacing: "2px",
                      }}
                      title={`${textMask.maskedWordsCount} words masked`}
                    >
                      {"█".repeat(Math.min(30, Math.max(10, textMask.maskedWordsCount * 2)))}
                    </span>
                  </div>
                )}

                {codeMask && codeMask.revealedLines.length > 0 && (
                  <div
                    style={{
                      background: "#1E1E1E",
                      color: "#FFF",
                      fontFamily: "var(--mono)",
                      padding: "12px",
                      marginTop: "12px",
                      border: "1.5px solid var(--ink)",
                      fontSize: "13px",
                    }}
                  >
                    {codeMask.revealedLines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                    <div
                      style={{
                        background: "#000",
                        height: `${codeMask.maskedLinesCount * 20}px`,
                        marginTop: "4px",
                        border: "1px dashed rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Interaction Area */}
        <div style={{ borderTop: "1.5px solid var(--ink)", paddingTop: "14px", marginTop: "16px" }}>
          {!isRevealed ? (
            <button
              type="button"
              onClick={() => setIsRevealed(true)}
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: "13px",
                fontWeight: 900,
                background: "var(--yel, #FFE600)",
                color: "#000",
                border: "2px solid var(--ink)",
                padding: "10px",
                cursor: "pointer",
                boxShadow: "3px 3px 0 var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Eye size={16} /> REVEAL CARD (PRESS SPACE)
            </button>
          ) : (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, textAlign: "center", marginBottom: "8px", opacity: 0.7 }}>
                RATE YOUR RECALL (PRESS 1, 2, OR 3):
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleRate("FORGOT")}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 900,
                    background: "#FF007A",
                    color: "#FFF",
                    border: "1.5px solid var(--ink)",
                    padding: "8px 4px",
                    cursor: "pointer",
                    boxShadow: "2px 2px 0 var(--ink)",
                  }}
                >
                  FORGOT [1]
                </button>

                <button
                  type="button"
                  onClick={() => handleRate("FUZZY")}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 900,
                    background: "#FFE600",
                    color: "#000",
                    border: "1.5px solid var(--ink)",
                    padding: "8px 4px",
                    cursor: "pointer",
                    boxShadow: "2px 2px 0 var(--ink)",
                  }}
                >
                  FUZZY [2]
                </button>

                <button
                  type="button"
                  onClick={() => handleRate("GOT_IT")}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 900,
                    background: "#B6FF3C",
                    color: "#000",
                    border: "1.5px solid var(--ink)",
                    padding: "8px 4px",
                    cursor: "pointer",
                    boxShadow: "2px 2px 0 var(--ink)",
                  }}
                >
                  GOT IT [3]
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
