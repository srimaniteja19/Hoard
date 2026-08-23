"use client";

import React, { useState } from "react";
import { OmniGazetteIssue, exportOmniGazetteMarkdown } from "@/lib/gazette/omniGazette";
import {
  Newspaper,
  Copy,
  Check,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  CheckSquare,
  Sparkles,
  Bookmark,
  TrendingUp,
} from "lucide-react";

interface HomeSundayGazetteProps {
  issue: OmniGazetteIssue;
}

export const HomeSundayGazette: React.FC<HomeSundayGazetteProps> = ({ issue }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopyMarkdown = () => {
    const md = exportOmniGazetteMarkdown(issue);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="home-gazette-section" aria-label="Sunday Newspaper Gazette">
      {/* Newspaper Container */}
      <div className="home-gazette-newspaper">
        {/* Masthead Header */}
        <header className="home-gazette-masthead">
          <div className="masthead-top-rule">
            <span>SUNDAY EDITION · AUTOMATED CURATION DIGEST</span>
            <span>{issue.publishedDate}</span>
            <span>EDITION 34.0</span>
          </div>

          <div className="masthead-main-row">
            <div className="masthead-title-wrap">
              <h2 className="home-gazette-title">THE HOARD GAZETTE</h2>
              <div className="home-gazette-tagline">
                ALL-SYSTEMS SYNTHESIS · BOOKMARKS · EXECUTED TODOS · TIL CONSTELLATION
              </div>
            </div>

            <div className="home-gazette-controls no-print">
              <button
                className="gazette-top-btn copy"
                onClick={handleCopyMarkdown}
                title="Copy full issue as Markdown for Obsidian / Notion"
              >
                {copied ? <Check size={12} color="#000" /> : <Copy size={12} />}
                {copied ? "COPIED DIGEST!" : "COPY DIGEST"}
              </button>

              <button
                className="gazette-top-btn print"
                onClick={handlePrint}
                title="Print Sunday issue or save as PDF"
              >
                <Printer size={12} />
                PRINT
              </button>

              <button
                className="gazette-top-btn toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse Newspaper" : "Expand Newspaper"}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          <div className="masthead-ticker-bar">
            <span>VOL. {issue.volumeNumber} · ISSUE {issue.issueNumber}</span>
            <span>★</span>
            <span>WEEK OF {issue.dateRange.toUpperCase()}</span>
            <span>★</span>
            <span className="ticker-score">
              CURATOR VELOCITY: {issue.ledger.curatorScore}/100
            </span>
          </div>
        </header>

        {isExpanded && (
          <div className="home-gazette-content">
            {/* 3-Column Newspaper Front Page Grid */}
            <div className="home-gazette-columns">
              {/* Column 1: The Lead Dispatch & Links */}
              <div className="home-gazette-col lead-col">
                <div className="col-header-label">
                  <Sparkles size={12} />
                  <span>LEAD DISPATCH</span>
                </div>

                {issue.leadStory ? (
                  <article className="gazette-lead-card">
                    <div className="lead-tag-row">
                      <span className="lead-badge">#{issue.leadStory.tag}</span>
                      <span className="lead-src">{issue.leadStory.source}</span>
                      {issue.leadStory.kind === "ART" && issue.leadStory.mins > 0 && (
                        <span className="lead-mins">~{issue.leadStory.mins} MIN READ</span>
                      )}
                    </div>

                    <h3 className="lead-headline">
                      <a
                        href={issue.leadStory.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lead-headline-link"
                      >
                        {issue.leadStory.title}
                        <ExternalLink size={12} className="inline-ext" />
                      </a>
                    </h3>

                    {issue.leadStory.note && (
                      <blockquote className="lead-pullquote">
                        &ldquo;{issue.leadStory.note}&rdquo;
                      </blockquote>
                    )}
                  </article>
                ) : (
                  <div className="gazette-empty-col">No lead story recorded this week.</div>
                )}

                {/* Additional Weekly Hoards */}
                {issue.weeklyHoards.length > 0 && (
                  <div className="gazette-sub-hoards">
                    <div className="sub-label">NOTABLE WEEKLY HOARDS</div>
                    <div className="sub-list">
                      {issue.weeklyHoards.map((b) => (
                        <a
                          key={b.id}
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sub-item"
                        >
                          <span className="sub-item-badge">#{b.tag}</span>
                          <span className="sub-item-title">{b.title}</span>
                          <span className="sub-item-src">{b.source}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: The Master Ledger & Executed Todos */}
              <div className="home-gazette-col ledger-col">
                <div className="col-header-label">
                  <TrendingUp size={12} />
                  <span>ALL-SYSTEMS LEDGER</span>
                </div>

                {/* Ledger Box */}
                <div className="gazette-ledger-stats">
                  <div className="stat-cell">
                    <span className="stat-val">{issue.ledger.totalHoards}</span>
                    <span className="stat-lbl">HOARDS</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-val">{issue.ledger.totalReads}</span>
                    <span className="stat-lbl">READS</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-val">~{issue.ledger.readingMinutes}m</span>
                    <span className="stat-lbl">READ TIME</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-val" style={{ color: "#00875A" }}>
                      {issue.ledger.totalTodosCompleted}
                    </span>
                    <span className="stat-lbl">TODOS DONE</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-val" style={{ color: "#7C4DFF" }}>
                      {issue.ledger.totalTilMinted}
                    </span>
                    <span className="stat-lbl">TIL MINTED</span>
                  </div>
                </div>

                {/* Executed Todos List */}
                <div className="gazette-todos-box">
                  <div className="sub-label">
                    <CheckSquare size={11} />
                    <span>EXECUTED & SHIPPED THIS WEEK</span>
                  </div>

                  {issue.completedTodos.length > 0 ? (
                    <div className="todos-shipped-list">
                      {issue.completedTodos.map((t) => (
                        <div key={t.id} className="shipped-todo-item">
                          <span className="todo-check">✓</span>
                          <span className="todo-title">{t.title}</span>
                          <span className="todo-time">{t.completedAt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="gazette-empty-col">No completed tasks this week yet.</div>
                  )}
                </div>

                {/* Topic Density Breakdown */}
                {issue.topicBreakdown.length > 0 && (
                  <div className="gazette-topic-radar">
                    <div className="sub-label">TOPIC DENSITY RADAR</div>
                    <div className="radar-bars">
                      {issue.topicBreakdown.map((topic) => (
                        <div key={topic.name} className="radar-row">
                          <div className="radar-info">
                            <span className="radar-name">#{topic.name}</span>
                            <span className="radar-count">{topic.count} hoards</span>
                          </div>
                          <div className="radar-track">
                            <div
                              className="radar-fill"
                              style={{ width: `${Math.max(15, topic.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 3: Knowledge Constellation & Vault Resurfacing */}
              <div className="home-gazette-col til-col">
                <div className="col-header-label">
                  <Zap size={12} />
                  <span>KNOWLEDGE MINTED (TIL)</span>
                </div>

                {issue.mintedTils.length > 0 ? (
                  <div className="gazette-tils-list">
                    {issue.mintedTils.map((til) => (
                      <div key={til.id} className="gazette-til-card">
                        <div className="til-card-top">
                          <span className="til-type-badge">{til.type}</span>
                          <span className="til-date">{til.createdAt}</span>
                        </div>
                        <p className="til-body-text">{til.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gazette-empty-col">No new TIL notes minted this week.</div>
                )}

                {/* Resurfaced from Deep Vault */}
                {issue.vaultResurfaced.length > 0 && (
                  <div className="gazette-vault-section">
                    <div className="sub-label">FROM THE DEEP VAULT</div>
                    <div className="vault-items-list">
                      {issue.vaultResurfaced.map((v) => (
                        <a
                          key={v.id}
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="vault-link-item"
                        >
                          <span className="vault-item-title">{v.title}</span>
                          <span className="vault-item-src">{v.source}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Newspaper Footer */}
            <footer className="home-gazette-footer">
              <div className="footer-line-text">
                HOARD AUTOMATED NEWSLETTER · AUTONOMOUSLY SYNTHESIZED ON SUNDAYS · NO CLUTTER
              </div>
            </footer>
          </div>
        )}
      </div>
    </section>
  );
};
