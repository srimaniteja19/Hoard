"use client";

import React, { useMemo, useState } from "react";
import { Bookmark } from "@/types";
import {
  generateWeeklyGazette,
  exportGazetteMarkdown,
  HoardGazetteIssue,
} from "@/lib/gazette/generateGazette";
import { TYPES } from "@/data/initialBookmarks";
import {
  X,
  Printer,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Zap,
  TrendingUp,
  Sparkles,
  Layers,
} from "lucide-react";

interface HoardGazetteModalProps {
  isOpen: boolean;
  bookmarks: Bookmark[];
  onClose: () => void;
  onOpenBookmark: (id: number) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
}

export const HoardGazetteModal: React.FC<HoardGazetteModalProps> = ({
  isOpen,
  bookmarks,
  onClose,
  onOpenBookmark,
  onGhostRead,
  onDischarge,
}) => {
  const [copied, setCopied] = useState(false);

  const issue: HoardGazetteIssue = useMemo(() => {
    return generateWeeklyGazette(bookmarks);
  }, [bookmarks]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    const md = exportGazetteMarkdown(issue);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="gazette-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gazette-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Strip */}
        <div className="gazette-controls no-print">
          <div className="gazette-control-left">
            <span className="gazette-pill">WEEKLY MICRO-ZINE</span>
            <span className="gazette-edition">ISSUE #{issue.issueNumber}</span>
          </div>

          <div className="gazette-control-actions">
            <button
              className="gazette-ctrl-btn copy"
              onClick={handleCopyMarkdown}
              title="Copy formatted Markdown digest to clipboard"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? "DIGEST COPIED!" : "COPY MARKDOWN"}</span>
            </button>

            <button
              className="gazette-ctrl-btn print"
              onClick={handlePrint}
              title="Print newspaper or export to PDF"
            >
              <Printer size={12} />
              <span>PRINT / PDF</span>
            </button>

            <button
              className="gazette-ctrl-btn close"
              onClick={onClose}
              title="Close Gazette (Esc)"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Newspaper Sheet */}
        <div className="gazette-sheet-viewport">
          <article className="gazette-newspaper">
            {/* Vintage Masthead */}
            <header className="gazette-masthead">
              <div className="masthead-top-sub">THE AUTONOMOUS COLLECTOR&apos;S CHRONICLE &amp; WEEKLY KNOWLEDGE DIGEST</div>
              <h1 className="masthead-title">THE HOARD GAZETTE</h1>
              <div className="masthead-ticker">
                <span>VOL. {issue.volumeNumber} · NO. {issue.issueNumber}</span>
                <span>★ ★ ★</span>
                <span>{issue.dateRange}</span>
                <span>★ ★ ★</span>
                <span>PRICE: ONE ATTENTION SPAN</span>
              </div>
            </header>

            {/* Main Newspaper Body Grid */}
            <div className="gazette-columns-grid">
              {/* Primary Column: Lead Story & Highlights */}
              <div className="gazette-col-main">
                {issue.leadStory ? (
                  <section className="gazette-lead-story">
                    <div className="section-label">⚡ TOP DISPATCH OF THE WEEK</div>
                    <h2
                      className="lead-headline"
                      onClick={() => onOpenBookmark(issue.leadStory!.id)}
                    >
                      {issue.leadStory.t}
                    </h2>

                    <div className="lead-meta">
                      <span className="lead-type">[{issue.leadStory.ty}]</span>
                      <span className="lead-src">{issue.leadStory.src}</span>
                      <span className="lead-tag">#{issue.leadStory.tag}</span>
                      {issue.leadStory.mins > 0 && (
                        <span className="lead-mins">~{issue.leadStory.mins}m read</span>
                      )}
                    </div>

                    {issue.leadStory.note && (
                      <blockquote className="lead-pullquote">
                        &ldquo;{issue.leadStory.note}&rdquo;
                      </blockquote>
                    )}

                    <div className="lead-actions no-print">
                      <button
                        className="gazette-btn"
                        onClick={() => onOpenBookmark(issue.leadStory!.id)}
                      >
                        <ExternalLink size={11} /> OPEN LINK
                      </button>

                      {onGhostRead && (
                        <button
                          className="gazette-btn ghost"
                          onClick={() => onGhostRead(issue.leadStory!)}
                        >
                          <BookOpen size={11} /> READ IN GHOST READER
                        </button>
                      )}

                      {onDischarge && (
                        <button
                          className="gazette-btn til"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onDischarge(issue.leadStory!, rect);
                          }}
                        >
                          <Zap size={11} /> DISCHARGE TO TIL
                        </button>
                      )}
                    </div>
                  </section>
                ) : (
                  <div className="gazette-empty-lead">
                    <h3>No new hoards this week.</h3>
                    <p>Capture bookmarks or articles to see them featured in Sunday&apos;s Gazette.</p>
                  </div>
                )}

                {/* Editorial Highlights */}
                {issue.editorialHighlights.length > 0 && (
                  <section className="gazette-highlights-section">
                    <div className="section-label">📌 IN THIS ISSUE: CURATED DISPATCHES</div>
                    <div className="highlights-grid">
                      {issue.editorialHighlights.map((bm) => (
                        <div key={bm.id} className="highlight-item">
                          <h4
                            className="highlight-title"
                            onClick={() => onOpenBookmark(bm.id)}
                          >
                            {bm.t}
                          </h4>
                          <div className="highlight-meta">
                            <span className="h-type">{bm.ty}</span>
                            <span className="h-src">{bm.src}</span>
                            <span className="h-tag">#{bm.tag}</span>
                          </div>
                          {bm.note && <p className="highlight-note">{bm.note}</p>}

                          <div className="highlight-actions no-print">
                            <button
                              className="g-mini-btn"
                              onClick={() => onOpenBookmark(bm.id)}
                            >
                              <ExternalLink size={10} /> OPEN
                            </button>
                            {onGhostRead && (
                              <button
                                className="g-mini-btn ghost"
                                onClick={() => onGhostRead(bm)}
                              >
                                <BookOpen size={10} /> READ
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar Column: Weekly Ledger & Deep Vault Echoes */}
              <aside className="gazette-col-side">
                {/* Weekly Ledger Box */}
                <div className="gazette-ledger-box">
                  <div className="ledger-header">
                    <span>📊 THE WEEKLY LEDGER</span>
                  </div>
                  <div className="ledger-rows">
                    <div className="ledger-row">
                      <span className="l-label">Hoards Captured</span>
                      <span className="l-val">{issue.ledger.totalCaptured}</span>
                    </div>
                    <div className="ledger-row">
                      <span className="l-label">Completed Reads</span>
                      <span className="l-val">{issue.ledger.readCount}</span>
                    </div>
                    <div className="ledger-row">
                      <span className="l-label">Reading Time Invested</span>
                      <span className="l-val">~{issue.ledger.minutesInvested} mins</span>
                    </div>
                    <div className="ledger-row">
                      <span className="l-label">Top Knowledge Topic</span>
                      <span className="l-val highlight">#{issue.ledger.topTopic}</span>
                    </div>
                    <div className="ledger-row">
                      <span className="l-label">Notes / TIL Minted</span>
                      <span className="l-val">{issue.ledger.tilNotesMinted}</span>
                    </div>
                  </div>
                </div>

                {/* Topic Breakdown Bar */}
                {issue.topicBreakdown.length > 0 && (
                  <div className="gazette-radar-box">
                    <div className="radar-header">🏷️ TOPIC DENSITY</div>
                    <div className="radar-bars">
                      {issue.topicBreakdown.map((t) => (
                        <div key={t.name} className="radar-bar-item">
                          <div className="radar-bar-top">
                            <span className="r-name">#{t.name}</span>
                            <span className="r-pct">{t.percentage}% ({t.count})</span>
                          </div>
                          <div className="r-track">
                            <div
                              className="r-fill"
                              style={{ width: `${Math.max(8, t.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deep Vault Resurfacing */}
                {issue.vaultResurfaced.length > 0 && (
                  <div className="gazette-vault-box">
                    <div className="vault-header">🏛️ FROM THE DEEP VAULT</div>
                    <p className="vault-desc">Resurfacing forgotten wisdom from your earlier collections:</p>
                    <div className="vault-list">
                      {issue.vaultResurfaced.map((bm) => (
                        <div
                          key={bm.id}
                          className="vault-item"
                          onClick={() => onOpenBookmark(bm.id)}
                        >
                          <div className="vault-item-title">{bm.t}</div>
                          <div className="vault-item-meta">#{bm.tag} · {bm.src}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>

            {/* Vintage Footer */}
            <footer className="gazette-footer">
              <div className="footer-line">
                ★ PUBLISHED AUTONOMOUSLY BY HOARD SHELF ENGINE · EDITORIAL BOARD: YOUR BACKLOG ★
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
};
