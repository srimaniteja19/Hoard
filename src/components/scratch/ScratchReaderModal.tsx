"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ScrapRow, ScrapEntities } from "@/db/schema";
import { ScratchMarkdown } from "./ScratchMarkdown";
import { SAMPLE_SKETCHES } from "@/lib/scratch/ink";
import { playSound } from "@/lib/sound";
import {
  Copy,
  Check,
  Maximize2,
  X,
  Layers,
  ListTodo,
  Sparkles,
  Printer,
  FileText,
  Clock,
  Pin,
  Flame,
  ArrowRight,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface ScratchReaderModalProps {
  isOpen: boolean;
  scrap: ScrapRow;
  onClose: () => void;
  onPromoteTil?: (id: string) => Promise<void> | void;
  onPromoteTodo?: (id: string) => Promise<void> | void;
  onWeld?: (id: string) => void;
  onBury?: (id: string) => Promise<void> | void;
  onTogglePin?: (id: string) => Promise<void> | void;
  onOpenStudio?: () => void;
}

export const ScratchReaderModal: React.FC<ScratchReaderModalProps> = ({
  isOpen,
  scrap,
  onClose,
  onPromoteTil,
  onPromoteTodo,
  onWeld,
  onBury,
  onTogglePin,
  onOpenStudio,
}) => {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAttachedNotes, setShowAttachedNotes] = useState(false);

  const ent = (scrap.entities || {}) as ScrapEntities;
  const isPinned = Boolean(ent.isPinned);
  const isInk = scrap.kind === "INK";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scrolling when modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Keyboard controls: ESC to close, Cmd+C to copy
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        playSound.click();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c" && !window.getSelection()?.toString()) {
        e.preventDefault();
        handleCopyAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, scrap.content, onClose]);

  const handleCopyAll = useCallback(() => {
    playSound.copy();
    navigator.clipboard.writeText(scrap.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [scrap.content]);

  const handleExportSvg = useCallback(() => {
    playSound.click();
    const svg = ent.inkSvg || SAMPLE_SKETCHES.d;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scratch-sketch-${scrap.id.slice(0, 8)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [ent.inkSvg, scrap.id]);

  const wordCount = useMemo(() => {
    return scrap.content.trim() ? scrap.content.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [scrap.content]);

  const lineCount = useMemo(() => {
    return scrap.content.split("\n").length;
  }, [scrap.content]);

  const charCount = scrap.content.length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const createdDate = new Date(scrap.createdAt);
  const timeStr = createdDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dateStr = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const structureKicker = useMemo(() => {
    if (isInk) return "✎ INK SKETCH";
    if (scrap.content.includes("```")) return "⌨ CODE SNIPPET";
    if (/- \[[ xX]\]/.test(scrap.content)) return "☑ TASK LIST";
    if (/https?:\/\//.test(scrap.content)) return "🔗 LINKED INTEL";
    return `📄 NOTE · ${wordCount}w`;
  }, [isInk, scrap.content, wordCount]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="scratch-reader-backdrop"
      onClick={() => {
        playSound.click();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Full Note Reader"
    >
      <div
        className="scratch-reader-window"
        onClick={(e) => e.stopPropagation()}
        style={
          {
            "--c": `var(--${scrap.color || (isInk ? "lime" : "cyan")})`,
          } as React.CSSProperties
        }
      >
        {/* ── HEADER BAR ── */}
        <header className="scratch-reader-header">
          <div className="scratch-reader-header__left">
            <button
              type="button"
              className={`scratch-reader-pin-btn${isPinned ? " is-pinned" : ""}`}
              onClick={() => {
                playSound.pin(!isPinned);
                void onTogglePin?.(scrap.id);
              }}
              title={isPinned ? "Unpin scrap" : "Pin scrap to top"}
              aria-label={isPinned ? "Unpin scrap" : "Pin scrap"}
            >
              <Pin size={13} strokeWidth={2.4} />
            </button>

            <span className={`scratch-reader-kind-badge ${scrap.color || "cyan"}`}>
              {isInk ? "✎ INK" : scrap.kind}
            </span>

            <span className="scratch-reader-kicker">
              {structureKicker}
            </span>

            <span className="scratch-reader-date">
              {dateStr} · {timeStr}
            </span>
          </div>

          <div className="scratch-reader-header__right">
            <button
              type="button"
              className="scratch-reader-tool-btn"
              onClick={handleCopyAll}
              title="Copy entire raw markdown (Cmd+C)"
            >
              {copied ? (
                <>
                  <Check size={12} strokeWidth={2.6} />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy size={12} strokeWidth={2.2} />
                  <span>COPY ALL</span>
                </>
              )}
            </button>

            {onOpenStudio && (
              <button
                type="button"
                className="scratch-reader-tool-btn"
                onClick={() => {
                  playSound.click();
                  onClose();
                  onOpenStudio();
                }}
                title="Open in Note Studio for editing or drawing"
              >
                <Maximize2 size={12} strokeWidth={2.2} />
                <span>STUDIO</span>
              </button>
            )}

            <button
              type="button"
              className="scratch-reader-close-btn"
              onClick={() => {
                playSound.click();
                onClose();
              }}
              title="Close reader (Esc)"
            >
              <X size={14} strokeWidth={2.8} />
              <span>ESC</span>
            </button>
          </div>
        </header>

        {/* ── STATS RIBBON ── */}
        <div className="scratch-reader-stats-bar">
          <div className="scratch-reader-stats-items">
            <span className="stat-pill">
              <b>{wordCount}</b> WORDS
            </span>
            <span className="stat-sep">·</span>
            <span className="stat-pill">
              <b>{lineCount}</b> {lineCount === 1 ? "LINE" : "LINES"}
            </span>
            <span className="stat-sep">·</span>
            <span className="stat-pill">
              <b>{charCount}</b> CHARS
            </span>
            <span className="stat-sep">·</span>
            <span className="stat-pill">
              <b>~{readTimeMin}</b> MIN READ
            </span>
          </div>

          <div className="scratch-reader-id-tag">
            <span>ID: #{scrap.id.slice(0, 8)}</span>
            <span className="status-indicator">{scrap.status.toUpperCase()}</span>
          </div>
        </div>

        {/* ── READING BODY SURFACE ── */}
        <main className="scratch-reader-body">
          {isInk ? (
            <div className="scratch-reader-ink-wrap">
              <div
                className="scratch-reader-ink-svg"
                dangerouslySetInnerHTML={{
                  __html: ent.inkSvg || SAMPLE_SKETCHES.d,
                }}
              />
              <div className="scratch-reader-ink-meta">
                {ent.transcription && (
                  <div className="scratch-reader-transcription">
                    <b>SAYS:</b>
                    <span>{ent.transcription}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="scratch-reader-export-btn"
                  onClick={handleExportSvg}
                >
                  DOWNLOAD SVG
                </button>
              </div>
            </div>
          ) : (
            <article className="scratch-reader-prose">
              <ScratchMarkdown content={scrap.content} className="scratch-reader-markdown" />
            </article>
          )}

          {/* ── TAGS CHIP ROW ── */}
          {scrap.tags && scrap.tags.length > 0 && (
            <div className="scratch-reader-tags-row">
              <span className="tags-label">TAGS:</span>
              {scrap.tags.map((t) => (
                <span key={t} className="scratch-reader-tag-chip">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* ── ATTACHED STUDIO SCRATCHPAD DRAWER ── */}
          {scrap.notes && scrap.notes.trim().length > 0 && (
            <section className="scratch-reader-attached-notes">
              <button
                type="button"
                className="scratch-reader-attached-toggle"
                onClick={() => setShowAttachedNotes((prev) => !prev)}
              >
                <span>
                  {showAttachedNotes ? "▲ HIDE ATTACHED STUDIO NOTES" : "▼ SHOW ATTACHED STUDIO NOTES"}
                </span>
                <span className="attached-count">
                  ({scrap.notes.trim().split(/\s+/).length} WORDS)
                </span>
              </button>

              {showAttachedNotes && (
                <div className="scratch-reader-attached-body">
                  <ScratchMarkdown content={scrap.notes} className="scratch-reader-markdown" />
                </div>
              )}
            </section>
          )}
        </main>

        {/* ── ACTION FOOTER TOOLBAR ── */}
        <footer className="scratch-reader-footer">
          {onOpenStudio && (
            <button
              type="button"
              className="scratch-reader-act-btn notes"
              onClick={() => {
                playSound.click();
                onClose();
                onOpenStudio();
              }}
              title="Open scratchpad studio"
            >
              <FileText size={12} strokeWidth={2.2} />
              <span>+ NOTES ↗</span>
            </button>
          )}

          {onPromoteTil && (
            <button
              type="button"
              className="scratch-reader-act-btn til"
              onClick={() => {
                playSound.fileIt();
                void onPromoteTil(scrap.id);
                onClose();
              }}
              title="Promote insight to Today I Learned stream"
            >
              <Sparkles size={12} strokeWidth={2.4} />
              <span>→ TIL</span>
            </button>
          )}

          {onPromoteTodo && (
            <button
              type="button"
              className="scratch-reader-act-btn todo"
              onClick={() => {
                playSound.fileIt();
                void onPromoteTodo(scrap.id);
                onClose();
              }}
              title="Promote action to Todo list"
            >
              <ListTodo size={12} strokeWidth={2.4} />
              <span>→ TODO</span>
            </button>
          )}

          {onWeld && (
            <button
              type="button"
              className="scratch-reader-act-btn weld"
              onClick={() => {
                playSound.click();
                onWeld(scrap.id);
                onClose();
              }}
              title="Weld note with another memory"
            >
              <Layers size={12} strokeWidth={2.2} />
              <span>WELD</span>
            </button>
          )}

          {onBury && (
            <button
              type="button"
              className="scratch-reader-act-btn compost"
              onClick={() => {
                playSound.click();
                void onBury(scrap.id);
                onClose();
              }}
              title="Compost / archive scrap"
            >
              <span>COMPOST</span>
            </button>
          )}

          <div className="scratch-reader-footer__spacer" />

          <button
            type="button"
            className="scratch-reader-act-btn close-action"
            onClick={() => {
              playSound.click();
              onClose();
            }}
          >
            <span>CLOSE</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};
