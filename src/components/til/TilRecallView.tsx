"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TilItem } from "./TilFeedItem";
import { MarkdownLite } from "./MarkdownLite";
import {
  RotateCcw,
  Eye,
  CheckCircle2,
  Sparkles,
  Brain,
  Trophy,
  Calendar,
  Layers,
} from "lucide-react";

interface TilRecallViewProps {
  deck: TilItem[];
  nextReviewAt: string | null;
  nextReviewInDays: number | null;
  onRefreshDeck: () => void;
  validHashes?: Set<string>;
}

export const TilRecallView: React.FC<TilRecallViewProps> = ({
  deck,
  nextReviewInDays,
  onRefreshDeck,
  validHashes,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState<Array<"forgot" | "fuzzy" | "got-it">>([]);
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentCard = deck[currentIndex] || null;

  useEffect(() => {
    setCurrentIndex(0);
    setRevealed(false);
    setRatings([]);
    setSessionComplete(false);
  }, [deck]);

  const handleRate = useCallback(
    async (rating: "forgot" | "fuzzy" | "got-it") => {
      if (!currentCard || submitting) return;
      setSubmitting(true);

      try {
        const apiRating =
          rating === "got-it" ? "GOT_IT" : rating === "fuzzy" ? "FUZZY" : "FORGOT";
        await fetch("/api/til/recall", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentCard.id,
            rating: apiRating,
          }),
        });

        setRatings((prev) => {
          const next = [...prev];
          next[currentIndex] = rating;
          return next;
        });

        if (currentIndex + 1 >= deck.length) {
          setSessionComplete(true);
        } else {
          setCurrentIndex((prev) => prev + 1);
          setRevealed(false);
        }
      } catch (e) {
        console.error("Failed to record recall rating", e);
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, currentIndex, deck.length, submitting]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (sessionComplete || !currentCard) return;

      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }

      if (revealed) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate("forgot");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate("fuzzy");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate("got-it");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [revealed, sessionComplete, currentCard, handleRate]);

  const renderMaskedBody = (item: TilItem) => {
    const body = item.body || "";

    if (item.type === "GOTCHA") {
      const fixRegex = /(\b(?:instea[d]|fix|correct|truth|solution|because|actually)\b[\s\S]*)/i;
      const match = body.match(fixRegex);
      if (match && match.index !== undefined && match.index > 10) {
        const before = body.slice(0, match.index);
        return (
          <div className="til-recall-mask-text">
            <MarkdownLite content={before} validHashes={validHashes} />
            <div className="til-recall-redacted-callout">
              <span className="redacted-block">████████████████████████████</span>
              <span className="redacted-hint">RECALL THE FIX OR ROOT CAUSE BEFORE REVEALING</span>
            </div>
          </div>
        );
      }
    }

    const words = body.split(/(\s+)/);
    const candidateIndices: number[] = [];
    words.forEach((w, idx) => {
      const clean = w.replace(/[^a-zA-Z0-9_-]/g, "");
      if (clean.length >= 6 || w.startsWith("`")) {
        candidateIndices.push(idx);
      }
    });

    const maskSet = new Set<number>();
    if (candidateIndices.length > 0) {
      const step = Math.max(1, Math.floor(candidateIndices.length / 3));
      for (let i = 0; i < candidateIndices.length && maskSet.size < 3; i += step) {
        maskSet.add(candidateIndices[i]);
      }
    }

    return (
      <div className="til-recall-mask-text">
        {words.map((w, idx) => {
          if (maskSet.has(idx)) {
            return (
              <span key={idx} className="redacted-block" title="Redacted term — recall to reveal">
                {"█".repeat(Math.min(12, Math.max(5, w.length)))}
              </span>
            );
          }
          return <span key={idx}>{w}</span>;
        })}
      </div>
    );
  };

  const renderMaskedCode = (code?: string | null) => {
    if (!code) return null;
    const lines = code.split("\n");
    const visibleLines = lines.slice(0, Math.min(2, lines.length));
    const hiddenCount = Math.max(0, lines.length - visibleLines.length);

    return (
      <div className="til-recall-code-mask">
        {visibleLines.map((ln, idx) => (
          <div key={idx} className="code-revealed-line">
            {ln || " "}
          </div>
        ))}
        {hiddenCount > 0 && (
          <div
            className="code-redacted-box"
            style={{ height: `${Math.min(140, Math.max(44, hiddenCount * 18))}px` }}
          >
            <span>[ {hiddenCount} CODE LINES REDACTED — PRESS SPACE TO REVEAL ]</span>
          </div>
        )}
      </div>
    );
  };

  const gotItCount = ratings.filter((r) => r === "got-it").length;
  const fuzzyCount = ratings.filter((r) => r === "fuzzy").length;
  const forgotCount = ratings.filter((r) => r === "forgot").length;
  const reviewedCount = ratings.filter(Boolean).length;

  return (
    <div className="til-recall-container">
      {/* ─── Recall Masthead Bar ────────────────────────────────────────── */}
      <header className="til-secondary-masthead">
        <div className="til-secondary-masthead__left">
          <div className="til-secondary-masthead__title-row">
            <h2 className="til-secondary-masthead__title">RECALL // ACTIVE RETENTION LAB</h2>
            <span className="til-secondary-masthead__badge">SPACED REPETITION</span>
          </div>
          <p className="til-secondary-masthead__desc">
            Active cloze and code-redaction flashcards scheduled across a 5-stage stability curve (1d → 3d → 7d → 21d → 60d).
          </p>
        </div>

        <div className="til-secondary-masthead__right">
          <div className="til-secondary-telemetry">
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{deck.length}</span>
              <span className="til-secondary-stat__lbl">DUE TODAY</span>
            </div>
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{reviewedCount}</span>
              <span className="til-secondary-stat__lbl">REVIEWED</span>
            </div>
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{gotItCount}</span>
              <span className="til-secondary-stat__lbl">GOT IT</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshDeck}
            className="til-secondary-action-btn"
            title="Reload recall deck"
          >
            <RotateCcw size={13} />
            <span>REFRESH DECK</span>
          </button>
        </div>
      </header>

      {/* ─── Empty State ─────────────────────────────────────────────────── */}
      {deck.length === 0 ? (
        <div className="til-recall-empty-card">
          <div className="til-recall-empty-badge">
            <CheckCircle2 size={28} strokeWidth={2.4} />
          </div>
          <h3 className="til-recall-empty-title">ALL CAUGHT UP FOR TODAY</h3>
          <p className="til-recall-empty-subtitle">
            {nextReviewInDays !== null && nextReviewInDays > 0
              ? `Next scheduled retention review in ${nextReviewInDays} ${
                  nextReviewInDays === 1 ? "day" : "days"
                }.`
              : "Log new insights in the Stream to populate your spaced-repetition deck."}
          </p>
          <div className="til-recall-schedule-strip">
            <span>STABILITY INTERVALS:</span>
            <b>S1 · 1D</b>
            <b>S2 · 3D</b>
            <b>S3 · 7D</b>
            <b>S4 · 21D</b>
            <b>S5 · 60D</b>
          </div>
          <button type="button" onClick={onRefreshDeck} className="til-recall-action-btn">
            <RotateCcw size={13} /> CHECK FOR DUE CARDS
          </button>
        </div>
      ) : sessionComplete ? (
        /* ─── Session Complete State ────────────────────────────────────── */
        <div className="til-recall-complete-card">
          <div className="til-recall-complete-icon-box">
            <Trophy size={28} strokeWidth={2.4} />
          </div>
          <h3 className="til-recall-complete-title">RECALL SESSION COMPLETE</h3>
          <p className="til-recall-complete-subtitle">
            You reviewed {deck.length} {deck.length === 1 ? "insight" : "insights"} in this session.
          </p>

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

          <button type="button" onClick={onRefreshDeck} className="til-recall-restart-btn">
            <RotateCcw size={14} /> LOAD NEXT BATCH
          </button>
        </div>
      ) : (
        /* ─── 2-Column Recall Workspace ─────────────────────────────────── */
        <div className="til-recall-workspace">
          {/* Left Column: Session Queue by Date */}
          <aside className="til-recall-sidebar" aria-label="Recall Session Queue">
            <div className="til-recall-sidebar__head">
              <div className="til-recall-sidebar__title">
                <Layers size={13} />
                <span>SESSION QUEUE</span>
                <span className="til-codex-count-badge">
                  {currentIndex + 1}/{deck.length}
                </span>
              </div>
              <div className="til-recall-segments">
                {deck.map((_, idx) => {
                  const status = ratings[idx];
                  const isCurrent = idx === currentIndex;
                  return (
                    <div
                      key={idx}
                      className={`til-recall-seg ${isCurrent ? "active" : ""} ${status || ""}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="til-recall-queue-list">
              {deck.map((card, idx) => {
                const status = ratings[idx];
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`til-recall-queue-row ${isCurrent ? "is-current" : ""} ${
                      status ? `is-${status}` : ""
                    }`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setRevealed(false);
                    }}
                  >
                    <span className="til-recall-queue-row__idx">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className={`til-index-row__type type--${card.type.toLowerCase()}`}>
                      {card.type}
                    </span>
                    <div className="til-recall-queue-row__meta">
                      <span className="til-recall-queue-row__hash">#{card.shortHash}</span>
                      <span className="til-recall-queue-row__date">{card.loggedFor}</span>
                    </div>
                    <span className="til-recall-queue-row__status">
                      {status === "got-it"
                        ? "GOT IT"
                        : status === "fuzzy"
                          ? "FUZZY"
                          : status === "forgot"
                            ? "FORGOT"
                            : isCurrent
                              ? "ACTIVE"
                              : "DUE"}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Active Specimen Flashcard */}
          <div className="til-recall-stage">
            <div className="til-recall-card-surface">
              <div>
                <div className="til-recall-card-header">
                  <div className="til-recall-card-types">
                    <span className="til-recall-step-badge">
                      SPECIMEN {String(currentIndex + 1).padStart(2, "0")} /{" "}
                      {String(deck.length).padStart(2, "0")}
                    </span>
                    <span className={`til-index-row__type type--${currentCard.type.toLowerCase()}`}>
                      {currentCard.type}
                    </span>
                    <span className="til-recall-hash">#{currentCard.shortHash}</span>
                    {currentCard.loggedFor && (
                      <span className="til-recall-date-pill">
                        <Calendar size={11} />
                        {currentCard.loggedFor}
                      </span>
                    )}
                    <span className="til-recall-stability-pill">
                      S{currentCard.stability || 1}
                    </span>
                  </div>

                  <div className="til-recall-card-state-pill">
                    {revealed ? (
                      <span className="state-revealed">
                        <Sparkles size={11} /> ANSWER REVEALED
                      </span>
                    ) : (
                      <span className="state-active-test">
                        <Brain size={11} /> ACTIVE RECALL TEST
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="til-recall-card-body">
                  {!revealed ? (
                    <>
                      {renderMaskedBody(currentCard)}
                      {renderMaskedCode(currentCard.code)}
                    </>
                  ) : (
                    <div className="til-recall-revealed-body">
                      {currentCard.body && (
                        <MarkdownLite content={currentCard.body} validHashes={validHashes} />
                      )}
                      {currentCard.code && (
                        <div className="til-recall-code-block">
                          <pre>
                            <code>{currentCard.code}</code>
                          </pre>
                        </div>
                      )}
                      {currentCard.tags && currentCard.tags.length > 0 && (
                        <div className="til-recall-tags-row">
                          {currentCard.tags.map((t) => (
                            <span key={t} className="til-index-tag">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="til-recall-card-footer">
                {!revealed ? (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="til-recall-reveal-btn"
                  >
                    <Eye size={16} strokeWidth={2.5} />
                    <span>REVEAL SPECIMEN ANSWER</span>
                    <span className="kbd-pill">SPACE</span>
                  </button>
                ) : (
                  <div className="til-recall-rating-section">
                    <div className="til-recall-rating-label">
                      HOW WELL DID YOU RECALL THIS INSIGHT? (KEYS 1 · 2 · 3)
                    </div>
                    <div className="til-recall-arcade-buttons">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRate("forgot")}
                        className="til-arcade-btn btn-forgot"
                      >
                        <span className="btn-key">[1]</span>
                        <span className="btn-txt">FORGOT</span>
                        <span className="btn-sub">Reset to S1 (1d)</span>
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRate("fuzzy")}
                        className="til-arcade-btn btn-fuzzy"
                      >
                        <span className="btn-key">[2]</span>
                        <span className="btn-txt">FUZZY</span>
                        <span className="btn-sub">Hold stability</span>
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRate("got-it")}
                        className="til-arcade-btn btn-got-it"
                      >
                        <span className="btn-key">[3]</span>
                        <span className="btn-txt">GOT IT</span>
                        <span className="btn-sub">Advance interval</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
