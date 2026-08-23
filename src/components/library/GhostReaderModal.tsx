"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bookmark } from "@/types";
import { formatQuoteMarkdown } from "@/lib/library/readerExtractor";
import {
  X,
  ExternalLink,
  BookOpen,
  Check,
  Zap,
  Copy,
  RotateCcw,
  Sparkles,
  Type,
  Maximize2,
  Minimize2,
  BookmarkPlus,
  Highlighter,
} from "lucide-react";

interface GhostReaderModalProps {
  bookmark: Bookmark | null;
  onClose: () => void;
  onToggleRead: (id: number) => void;
  onDischargeQuote?: (quoteText: string, bookmark: Bookmark) => void;
  onDischargeFull?: (bookmark: Bookmark) => void;
  onSaveQuoteBookmark?: (parentId: number, quoteText: string) => Promise<void>;
  onRecordUse?: (id: number) => void;
}

export const GhostReaderModal: React.FC<GhostReaderModalProps> = ({
  bookmark,
  onClose,
  onToggleRead,
  onDischargeQuote,
  onDischargeFull,
  onSaveQuoteBookmark,
  onRecordUse,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [byline, setByline] = useState<string | undefined>(undefined);
  const [wordCount, setWordCount] = useState<number>(0);
  const [readMins, setReadMins] = useState<number>(1);
  const [isCached, setIsCached] = useState<boolean>(false);

  // Typography & Theme preferences
  const [fontFamily, setFontFamily] = useState<"mono" | "sans" | "serif">("sans");
  const [fontSize, setFontSize] = useState<number>(16);
  const [readerTheme, setReaderTheme] = useState<"paper" | "dark" | "solar">("paper");
  const [isWide, setIsWide] = useState<boolean>(false);

  // Scroll Progress
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Selected Quote Popover
  const [selectedQuote, setSelectedQuote] = useState<{
    text: string;
    rect: { top: number; left: number };
  } | null>(null);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [savedQuoteSuccess, setSavedQuoteSuccess] = useState(false);

  // Highlights
  const [highlights, setHighlights] = useState<string[]>([]);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedFont = localStorage.getItem("hoard_reader_font") as "mono" | "sans" | "serif";
      if (savedFont) setFontFamily(savedFont);
      const savedSize = Number(localStorage.getItem("hoard_reader_size"));
      if (savedSize && savedSize >= 13 && savedSize <= 24) setFontSize(savedSize);
      const savedTheme = localStorage.getItem("hoard_reader_theme") as "paper" | "dark" | "solar";
      if (savedTheme) setReaderTheme(savedTheme);
    } catch {
      // Ignore
    }
  }, []);

  // Fetch article text
  const fetchArticle = useCallback(
    async (forceRefresh = false) => {
      if (!bookmark) return;
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/reader", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookmarkId: bookmark.id, forceRefresh }),
        });

        if (!res.ok) {
          throw new Error(`Failed to load article (${res.status})`);
        }

        const data = await res.json();
        setContent(data.content || "No content extracted.");
        setByline(data.byline);
        setWordCount(data.wordCount || 0);
        setReadMins(data.readMins || 1);
        setIsCached(Boolean(data.cached));

        if (onRecordUse) {
          onRecordUse(bookmark.id);
        }
      } catch (err) {
        console.error("[GhostReader] fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load reader text");
        setContent(bookmark.archivedText || bookmark.note || "Unable to extract remote article text.");
      } finally {
        setLoading(false);
      }
    },
    [bookmark, onRecordUse]
  );

  useEffect(() => {
    if (bookmark) {
      fetchArticle(false);
      setScrollProgress(0);
      setSelectedQuote(null);
    }
  }, [bookmark, fetchArticle]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Scroll listener for reading progress
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const total = el.scrollHeight - el.clientHeight;
    if (total <= 0) {
      setScrollProgress(100);
      return;
    }
    const current = el.scrollTop;
    setScrollProgress(Math.min(100, Math.max(0, Math.round((current / total) * 100))));
  };

  // Text selection listener for quote popover
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelectedQuote(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 5) {
      setSelectedQuote(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectedQuote({
      text,
      rect: {
        top: Math.max(10, rect.top - 46),
        left: Math.max(10, rect.left + rect.width / 2),
      },
    });
  };

  const handleCopyQuote = () => {
    if (!selectedQuote || !bookmark) return;
    const formatted = formatQuoteMarkdown(
      selectedQuote.text,
      bookmark.t,
      bookmark.src,
      bookmark.url
    );
    navigator.clipboard.writeText(formatted);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  const handleSnipToTil = () => {
    if (!selectedQuote || !bookmark || !onDischargeQuote) return;
    onDischargeQuote(selectedQuote.text, bookmark);
    setSelectedQuote(null);
  };

  const handleSaveAsQuote = async () => {
    if (!selectedQuote || !bookmark || !onSaveQuoteBookmark) return;
    try {
      await onSaveQuoteBookmark(bookmark.id, selectedQuote.text);
      setSavedQuoteSuccess(true);
      setTimeout(() => {
        setSavedQuoteSuccess(false);
        setSelectedQuote(null);
      }, 1500);
    } catch {
      // Ignore
    }
  };

  const handleAddHighlight = () => {
    if (!selectedQuote) return;
    setHighlights((prev) => [...prev, selectedQuote.text]);
    setSelectedQuote(null);
  };

  const setFont = (f: "mono" | "sans" | "serif") => {
    setFontFamily(f);
    try {
      localStorage.setItem("hoard_reader_font", f);
    } catch {
      // Ignore
    }
  };

  const setTheme = (t: "paper" | "dark" | "solar") => {
    setReaderTheme(t);
    try {
      localStorage.setItem("hoard_reader_theme", t);
    } catch {
      // Ignore
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(24, Math.max(13, prev + delta));
      try {
        localStorage.setItem("hoard_reader_size", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  if (!bookmark) return null;

  return (
    <div className="ghost-reader-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`ghost-reader-modal theme-${readerTheme} ${isWide ? "wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
      >
        {/* Top Sticky Toolbar */}
        <header className="ghost-reader-header">
          <div className="ghost-reader-brand">
            <span className="ghost-reader-badge">⚡ GHOST READER</span>
            <span className="ghost-reader-progress">{scrollProgress}% READ</span>
            {isCached && <span className="ghost-reader-cache-pill">OFFLINE CACHED</span>}
          </div>

          {/* Reader Controls: Font, Size, Theme, Width */}
          <div className="ghost-reader-tools">
            <div className="tool-btn-group">
              <button
                className={`tool-btn ${fontFamily === "mono" ? "active" : ""}`}
                onClick={() => setFont("mono")}
                title="Monospace Font"
              >
                MONO
              </button>
              <button
                className={`tool-btn ${fontFamily === "sans" ? "active" : ""}`}
                onClick={() => setFont("sans")}
                title="Sans Serif Font"
              >
                SANS
              </button>
              <button
                className={`tool-btn ${fontFamily === "serif" ? "active" : ""}`}
                onClick={() => setFont("serif")}
                title="Serif Font"
              >
                SERIF
              </button>
            </div>

            <div className="tool-btn-group">
              <button
                className="tool-btn"
                onClick={() => adjustFontSize(-1)}
                title="Decrease Font Size"
              >
                A-
              </button>
              <span className="tool-btn-label">{fontSize}px</span>
              <button
                className="tool-btn"
                onClick={() => adjustFontSize(1)}
                title="Increase Font Size"
              >
                A+
              </button>
            </div>

            <div className="tool-btn-group">
              <button
                className={`tool-btn ${readerTheme === "paper" ? "active" : ""}`}
                onClick={() => setTheme("paper")}
                title="Paper Cream Theme"
              >
                PAPER
              </button>
              <button
                className={`tool-btn ${readerTheme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
                title="Cyberpunk Dark Theme"
              >
                DARK
              </button>
              <button
                className={`tool-btn ${readerTheme === "solar" ? "active" : ""}`}
                onClick={() => setTheme("solar")}
                title="Solarized Ink Theme"
              >
                SOLAR
              </button>
            </div>

            <button
              className={`tool-btn width-toggle ${isWide ? "active" : ""}`}
              onClick={() => setIsWide(!isWide)}
              title={isWide ? "Standard Column Width" : "Wide Column Width"}
            >
              {isWide ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>

            <button
              className="tool-btn refresh-btn"
              onClick={() => fetchArticle(true)}
              title="Force re-fetch readable text"
            >
              <RotateCcw size={12} />
            </button>

            <button
              className="ghost-reader-close-btn"
              onClick={onClose}
              title="Close Ghost Reader (Esc)"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        {/* Scrollable Reading Viewport */}
        <div
          className="ghost-reader-viewport"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <div
            className={`ghost-reader-content font-${fontFamily}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {/* Article Header Metadata */}
            <div className="ghost-reader-meta">
              <div className="meta-tags-row">
                <span className="meta-source">{bookmark.src}</span>
                <span className="meta-sep">·</span>
                <span className="meta-tag">#{bookmark.tag}</span>
                <span className="meta-sep">·</span>
                <span className="meta-stats">{wordCount} words</span>
                <span className="meta-sep">·</span>
                <span className="meta-mins">~{readMins} min read</span>
              </div>

              <h1 className="ghost-reader-title">{bookmark.t}</h1>

              {byline && <div className="ghost-reader-byline">By {byline}</div>}

              <div className="ghost-reader-actions-bar">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="reader-action-link"
                >
                  <ExternalLink size={12} /> OPEN ORIGINAL
                </a>

                {onDischargeFull && (
                  <button
                    className="reader-action-btn discharge"
                    onClick={() => onDischargeFull(bookmark)}
                  >
                    <Zap size={12} /> DISCHARGE ARTICLE TO TIL
                  </button>
                )}

                <button
                  className={`reader-action-btn ${!bookmark.unread ? "read-done" : "mark-read"}`}
                  onClick={() => onToggleRead(bookmark.id)}
                >
                  <Check size={12} />
                  {!bookmark.unread ? "MARKED AS READ" : "MARK AS READ"}
                </button>
              </div>
            </div>

            <hr className="ghost-reader-divider" />

            {/* Content Body */}
            {loading ? (
              <div className="ghost-reader-loading">
                <div className="ghost-reader-spinner" />
                <span>EXTRACTING CLEAN ARTICLE TEXT...</span>
              </div>
            ) : error ? (
              <div className="ghost-reader-error">
                <p>⚠️ {error}</p>
                <button
                  className="time-capsule-btn-secondary"
                  onClick={() => fetchArticle(true)}
                >
                  <RotateCcw size={12} /> RETRY FETCH
                </button>
              </div>
            ) : (
              <div className="ghost-reader-body">
                {content.split("\n\n").map((para, idx) => {
                  const trimmed = para.trim();
                  if (!trimmed) return null;

                  // Headings
                  if (trimmed.startsWith("# ")) {
                    return <h1 key={idx}>{trimmed.slice(2)}</h1>;
                  }
                  if (trimmed.startsWith("## ")) {
                    return <h2 key={idx}>{trimmed.slice(3)}</h2>;
                  }
                  if (trimmed.startsWith("### ")) {
                    return <h3 key={idx}>{trimmed.slice(4)}</h3>;
                  }
                  if (trimmed.startsWith("#### ")) {
                    return <h4 key={idx}>{trimmed.slice(5)}</h4>;
                  }

                  // Code blocks
                  if (trimmed.startsWith("```")) {
                    const cleanCode = trimmed.replace(/^```[a-z0-9]*\n?/, "").replace(/\n?```$/, "");
                    return (
                      <pre key={idx} className="ghost-reader-code">
                        <code>{cleanCode}</code>
                      </pre>
                    );
                  }

                  // Images, Figures & Interactive Graphic Demos
                  if (trimmed.startsWith("![") && trimmed.includes("](") && trimmed.endsWith(")")) {
                    const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
                    if (match) {
                      const alt = match[1];
                      const src = match[2];

                      // If it's an interactive demo / widget
                      if (alt.startsWith("Interactive Demo:") || src === bookmark.url) {
                        return (
                          <div key={idx} className="ghost-reader-demo-card">
                            <div className="demo-card-top">
                              <span className="demo-badge">⚡ INTERACTIVE SIMULATION & GRAPHIC</span>
                              <span className="demo-src">{bookmark.src}</span>
                            </div>
                            <h4 className="demo-title">{alt.replace(/^Interactive Demo:\s*/, "")}</h4>
                            <p className="demo-desc">
                              This article features an interactive visual simulation on the live page.
                            </p>
                            <a
                              href={bookmark.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="demo-launch-btn"
                            >
                              <ExternalLink size={12} /> OPEN LIVE SIMULATION ↗
                            </a>
                          </div>
                        );
                      }

                      return (
                        <figure key={idx} className="ghost-reader-figure">
                          <img
                            src={src}
                            alt={alt || "Article illustration"}
                            loading="lazy"
                            className="ghost-reader-img"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          {alt && alt.trim() && (
                            <figcaption className="ghost-reader-caption">{alt}</figcaption>
                          )}
                        </figure>
                      );
                    }
                  }

                  // Blockquotes
                  if (trimmed.startsWith("> ")) {
                    return (
                      <blockquote key={idx} className="ghost-reader-quote">
                        {trimmed.slice(2)}
                      </blockquote>
                    );
                  }

                  // Unordered lists
                  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    const items = trimmed.split("\n").map((i) => i.replace(/^[-*]\s*/, ""));
                    return (
                      <ul key={idx} className="ghost-reader-list">
                        {items.map((item, iIdx) => (
                          <li key={iIdx}>{item}</li>
                        ))}
                      </ul>
                    );
                  }

                  // Standard paragraph (with highlights if present)
                  return (
                    <p key={idx} className="ghost-reader-p">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            )}

            {/* Bottom Complete Footer */}
            {!loading && (
              <div className="ghost-reader-footer">
                <div className="ghost-reader-footer-card">
                  <div className="footer-card-heading">
                    <Sparkles size={16} color="var(--yel)" />
                    <span>FINISHED READING?</span>
                  </div>
                  <p>Capture your key takeaways in TIL, or mark this article as read.</p>
                  <div className="footer-actions">
                    <button
                      className="reader-action-btn mark-read"
                      onClick={() => {
                        if (bookmark.unread) onToggleRead(bookmark.id);
                        onClose();
                      }}
                    >
                      <Check size={13} /> MARK AS READ & CLOSE
                    </button>
                    {onDischargeFull && (
                      <button
                        className="reader-action-btn discharge"
                        onClick={() => onDischargeFull(bookmark)}
                      >
                        <Zap size={13} /> DISCHARGE TO TIL NOTE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Quote Snip Popover */}
        {selectedQuote && (
          <div
            className="ghost-quote-popover"
            style={{
              top: `${selectedQuote.rect.top}px`,
              left: `${selectedQuote.rect.left}px`,
            }}
          >
            {onDischargeQuote && (
              <button
                className="quote-popover-btn til-btn"
                onClick={handleSnipToTil}
                title="Convert highlighted quote into a TIL note"
              >
                <Zap size={12} /> SNIP TO TIL
              </button>
            )}

            {onSaveQuoteBookmark && (
              <button
                className="quote-popover-btn quote-btn"
                onClick={handleSaveAsQuote}
                title="Save quote as child bookmark"
              >
                {savedQuoteSuccess ? <Check size={12} /> : <BookmarkPlus size={12} />}
                {savedQuoteSuccess ? "SAVED!" : "SAVE QUOTE"}
              </button>
            )}

            <button
              className="quote-popover-btn copy-btn"
              onClick={handleCopyQuote}
              title="Copy quote markdown to clipboard"
            >
              {copiedQuote ? <Check size={12} /> : <Copy size={12} />}
              {copiedQuote ? "COPIED" : "COPY"}
            </button>

            <button
              className="quote-popover-btn highlight-btn"
              onClick={handleAddHighlight}
              title="Highlight text"
            >
              <Highlighter size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
