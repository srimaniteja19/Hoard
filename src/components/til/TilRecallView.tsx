"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { EmbedRouter } from "@/components/til/embeds/EmbedRouter";
import { maskTextWords, maskCodeLines } from "@/lib/til/masking";
import { Rating } from "@/lib/til/confidence";
import { RotateCcw, CheckCircle2, Eye, RefreshCw, Sparkles, Flame, Trophy, Layers } from "lucide-react";

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
        const res = await fetch("/api/til/recall", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentCard.id, rating }),
        });
        if (!res.ok) throw new Error(`Rating persist failed: ${res.status}`);

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

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

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
      <div className="til-recall-empty-card">
        <div className="til-recall-empty-badge">
          <CheckCircle2 size={32} strokeWidth={2.5} />
        </div>

        <h2 className="til-recall-empty-title">ALL CAUGHT UP!</h2>

        <p className="til-recall-empty-subtitle">
          {nextReviewInDays
            ? `Next spaced-repetition review due in ${nextReviewInDays} ${nextReviewInDays === 1 ? "day" : "days"} (${nextReviewAt ? nextReviewAt.split("T")[0] : ""}).`
            : "No knowledge cards currently scheduled for testing. Check back later!"}
        </p>

        <button
          type="button"
          onClick={onRefreshDeck}
          className="til-recall-action-btn"
        >
          <RefreshCw size={13} /> CHECK QUEUE AGAIN
        </button>
      </div>
    );
  }

  // Session Summary End Card
  if (isSessionComplete) {
    const gotItCount = sessionRatings.filter((r) => r.rating === "GOT_IT").length;
    const fuzzyCount = sessionRatings.filter((r) => r.rating === "FUZZY").length;
    const forgotCount = sessionRatings.filter((r) => r.rating === "FORGOT").length;
    const total = sessionRatings.length || 1;
    const accuracy = Math.round((gotItCount / total) * 100);

    return (
      <div className="til-recall-complete-card">
        <div className="til-recall-complete-icon-box">
          <Trophy size={36} strokeWidth={2.4} />
        </div>

        <h2 className="til-recall-complete-title">REVIEW COMPLETE!</h2>
        <p className="til-recall-complete-subtitle">
          Tested {deck.length} knowledge items · <b>{accuracy}% Retention Rate</b>
        </p>

        {/* Rating Breakdown Badges */}
        <div className="til-recall-score-grid">
          <div className="til-recall-score-box got-it">
            <span className="score-num">{gotItCount}</span>
            <span className="score-label">GOT IT</span>
          </div>

          <div className="til-recall-score-box fuzzy">
            <span className="score-num">{fuzzyCount}</span>
            <span className="score-label">FUZZY</span>
          </div>

          <div className="til-recall-score-box forgot">
            <span className="score-num">{forgotCount}</span>
            <span className="score-label">FORGOT</span>
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
          className="til-recall-restart-btn"
        >
          <RotateCcw size={14} /> REPLAY SESSION / TEST MORE
        </button>
      </div>
    );
  }

  // Active Masked Card View
  const textMask = currentCard.body ? maskTextWords(currentCard.body) : null;
  const codeMask = currentCard.code ? maskCodeLines(currentCard.code) : null;

  return (
    <div className="til-recall-container">
      {/* Multi-Segment Progress Strip */}
      <div className="til-recall-progress-strip">
        <div className="til-recall-progress-meta">
          <span className="til-recall-step-badge">
            CARD {currentIndex + 1} OF {deck.length}
          </span>
          <span className="til-recall-hotkey-hint">
            [SPACE] TO REVEAL · [1..3] TO RATE
          </span>
        </div>

        <div className="til-recall-segments">
          {deck.map((item, idx) => {
            const ratingObj = sessionRatings.find((r) => r.id === item.id);
            let segClass = "untested";
            if (ratingObj) {
              if (ratingObj.rating === "GOT_IT") segClass = "got-it";
              else if (ratingObj.rating === "FUZZY") segClass = "fuzzy";
              else if (ratingObj.rating === "FORGOT") segClass = "forgot";
            } else if (idx === currentIndex) {
              segClass = "active";
            }

            return (
              <div
                key={item.id}
                className={`til-recall-seg ${segClass}`}
                title={`Card ${idx + 1}: #${item.shortHash} (${item.type})`}
              />
            );
          })}
        </div>
      </div>

      {/* 3D Stacked Deck Visual Wrapper */}
      <div className="til-recall-deck-stack">
        <div className="til-recall-card-underlay underlay-2" />
        <div className="til-recall-card-underlay underlay-1" />

        {/* Main Active Card Surface */}
        <div className={`til-recall-card-surface ${isRevealed ? "revealed" : "masked"}`}>
          {/* Card Header Bar */}
          <div className="til-recall-card-header">
            <div className="til-recall-card-types">
              <span className="til-recall-type-chip">{currentCard.type}</span>
              <span className="til-recall-hash">#{currentCard.shortHash}</span>
            </div>

            <div className="til-recall-card-state-pill">
              {isRevealed ? (
                <span className="state-revealed">
                  <Sparkles size={11} /> REVEALED
                </span>
              ) : (
                <span className="state-active-test">
                  <Eye size={11} /> TEST IN PROGRESS
                </span>
              )}
            </div>
          </div>

          {/* Card Main Body */}
          <div className="til-recall-card-body">
            {isRevealed ? (
              // Full Unmasked Reveal
              <div className="til-recall-unmasked-content">
                {currentCard.body && (
                  <div className="til-recall-revealed-body">
                    <MarkdownLite content={currentCard.body} validHashes={validHashes} />
                  </div>
                )}
                {currentCard.code && (
                  <div className="til-recall-code-block">
                    <pre>{currentCard.code}</pre>
                  </div>
                )}
                {currentCard.linkUrl && currentCard.linkPreview && (
                  <div className="til-recall-embed-wrap">
                    <EmbedRouter
                      preview={currentCard.linkPreview}
                      density={(currentCard.linkDensity as "card" | "inline" | "quote" | "full") || "card"}
                    />
                  </div>
                )}
              </div>
            ) : (
              // Masked View (First ~28% revealed, rest redacted blocks)
              <div className="til-recall-masked-content">
                {textMask && textMask.revealedText && (
                  <div className="til-recall-mask-text">
                    <span className="revealed-portion">{textMask.revealedText} </span>
                    <span
                      className="redacted-block"
                      title={`${textMask.maskedWordsCount} words hidden`}
                    >
                      {"█".repeat(Math.min(32, Math.max(12, textMask.maskedWordsCount * 2)))}
                    </span>
                  </div>
                )}

                {codeMask && codeMask.revealedLines.length > 0 && (
                  <div className="til-recall-code-mask">
                    {codeMask.revealedLines.map((line, idx) => (
                      <div key={idx} className="code-revealed-line">{line}</div>
                    ))}
                    <div
                      className="code-redacted-box"
                      style={{ height: `${Math.max(36, codeMask.maskedLinesCount * 22)}px` }}
                    >
                      <span>{codeMask.maskedLinesCount} code lines hidden</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Footer Interaction Surface */}
          <div className="til-recall-card-footer">
            {!isRevealed ? (
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="til-recall-reveal-btn"
              >
                <Eye size={16} strokeWidth={2.5} />
                <span>REVEAL HIDDEN ANSWER</span>
                <span className="kbd-pill">SPACE</span>
              </button>
            ) : (
              <div className="til-recall-rating-section">
                <div className="til-recall-rating-label">
                  RATE YOUR MEMORY RECALL:
                </div>

                <div className="til-recall-arcade-buttons">
                  <button
                    type="button"
                    onClick={() => handleRate("FORGOT")}
                    disabled={submitting}
                    className="til-arcade-btn btn-forgot"
                  >
                    <span className="btn-key">[1]</span>
                    <span className="btn-txt">FORGOT</span>
                    <span className="btn-sub">Review Soon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate("FUZZY")}
                    disabled={submitting}
                    className="til-arcade-btn btn-fuzzy"
                  >
                    <span className="btn-key">[2]</span>
                    <span className="btn-txt">FUZZY</span>
                    <span className="btn-sub">+3 Days</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate("GOT_IT")}
                    disabled={submitting}
                    className="til-arcade-btn btn-got-it"
                  >
                    <span className="btn-key">[3]</span>
                    <span className="btn-txt">GOT IT</span>
                    <span className="btn-sub">+7 Days</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

