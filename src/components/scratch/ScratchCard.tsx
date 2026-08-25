"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ScrapRow, ScrapEntities } from "@/db/schema";
import { ScratchMarkdown } from "./ScratchMarkdown";
import {
  uploadScrapImage,
  extractImagesFromClipboard,
  extractImagesFromDragEvent,
} from "@/lib/scratch/image";
import { createInkEngine, SAMPLE_SKETCHES } from "@/lib/scratch/ink";
import { ScratchNoteModal } from "./ScratchNoteModal";
import { playSound } from "@/lib/sound";

interface ScratchCardProps {
  scrap: ScrapRow;
  isOpenDefault?: boolean;
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onPromoteTodo: (id: string) => Promise<void> | void;
  onWeld: (id: string) => void;
  onBury: (id: string) => Promise<void> | void;
  onTogglePin?: (id: string) => Promise<void> | void;
}

type NoteMode = "split" | "edit" | "read" | "ink";

export const ScratchCard: React.FC<ScratchCardProps> = ({
  scrap,
  isOpenDefault = false,
  onUpdateNotes,
  onPromoteTil,
  onPromoteTodo,
  onWeld,
  onBury,
  onTogglePin,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<NoteMode>("split");
  const [notes, setNotes] = useState(scrap.notes || "");
  const [savedStatus, setSavedStatus] = useState("AUTOSAVED");
  const [copied, setCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Ink Studio state
  const [studioActivePen, setStudioActivePen] = useState(0);
  const [studioPaper, setStudioPaper] = useState<"plain" | "dot" | "rule" | "iso">("dot");
  const [studioStrokeCount, setStudioStrokeCount] = useState(0);
  const [isStylusLive, setIsStylusLive] = useState(false);

  // Inline Transcription editing for INK cards
  const [editingTranscription, setEditingTranscription] = useState(false);
  const ent = (scrap.entities || {}) as ScrapEntities;
  const isPinned = Boolean(ent.isPinned);
  const currentTranscription = ent.transcription || (scrap.kind === "INK" && scrap.content !== "Handwritten Ink Scrap" ? scrap.content : "");
  const [transcriptionVal, setTranscriptionVal] = useState(currentTranscription);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Studio canvas ref & engine
  const studioCanvasRef = useRef<HTMLCanvasElement>(null);
  const studioEngineRef = useRef<ReturnType<typeof createInkEngine> | null>(null);

  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamedText, setAiStreamedText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDone, setAiDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const aiPreviewRef = useRef<HTMLDivElement>(null);

  const PENS = useMemo<Array<{ t: "pen" | "hi" | "er"; c: string; w: number; r: string; wt: string; name: string }>>(() => [
    { t: "pen", c: "#0A0A0A", w: 2, r: "-3deg", wt: "2px", name: "PEN · 2PX" },
    { t: "pen", c: "#0A0A0A", w: 5, r: "2deg", wt: "5px", name: "PEN · 5PX" },
    { t: "pen", c: "#FF3D8A", w: 3, r: "-2deg", wt: "3px", name: "PEN · 3PX" },
    { t: "pen", c: "#7B5CF0", w: 3, r: "3deg", wt: "3px", name: "PEN · 3PX" },
    { t: "hi", c: "#FFE94A", w: 18, r: "2deg", wt: "18px", name: "HIGHLIGHTER · 18PX" },
    { t: "hi", c: "#A8E85C", w: 18, r: "-3deg", wt: "18px", name: "HIGHLIGHTER · 18PX" },
    { t: "er", c: "#000000", w: 22, r: "2deg", wt: "22px", name: "ERASER · 22PX" },
  ], []);

  // Initialize studio canvas when mode is "ink"
  useEffect(() => {
    if (isOpen && mode === "ink" && studioCanvasRef.current) {
      const engine = createInkEngine(studioCanvasRef.current, {
        onCount: (n) => setStudioStrokeCount(n),
        onPen: () => setIsStylusLive(true),
      });
      studioEngineRef.current = engine;
      engine.setTool(PENS[studioActivePen] || PENS[0]);

      requestAnimationFrame(() => engine.fit());
      const fitTimer = setTimeout(() => engine.fit(), 50);

      const handleResize = () => engine.fit();
      window.addEventListener("resize", handleResize);

      return () => {
        clearTimeout(fitTimer);
        window.removeEventListener("resize", handleResize);
        engine.destroy();
        studioEngineRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  useEffect(() => {
    if (aiStreaming && aiPreviewRef.current) {
      aiPreviewRef.current.scrollTop = aiPreviewRef.current.scrollHeight;
    }
  }, [aiStreamedText, aiStreaming]);

  useEffect(() => {
    setNotes(scrap.notes || "");
  }, [scrap.notes]);

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).filter(Boolean).length : 0;
  const hasNotes = !!notes.trim();

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setSavedStatus("SAVING...");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await onUpdateNotes(scrap.id, val);
      setSavedStatus("AUTOSAVED");
    }, 600);
  };

  const handleCopyMd = () => {
    playSound.copy();
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleExportSvg = () => {
    playSound.click();
    let svg = "";
    if (mode === "ink" && studioEngineRef.current) {
      svg = studioEngineRef.current.toSvg();
    } else if (ent.inkSvg) {
      svg = ent.inkSvg;
    } else {
      svg = SAMPLE_SKETCHES.d;
    }

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scratch-sketch-${scrap.id.slice(0, 8)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDropInSketch = () => {
    playSound.fileIt();
    const engine = studioEngineRef.current;
    if (!engine || engine.count() === 0) {
      const dropText = "\n\n:::ink untitled sketch\n:::\n";
      insertTextAtCursor(dropText);
      setMode("split");
      return;
    }

    const svg = engine.toSvg();
    const dropBlock = `\n\n:::ink sketch\n${svg}\n:::\n`;
    insertTextAtCursor(dropBlock);
    setMode("split");
  };

  const handleSaveTranscription = async () => {
    const trimmed = transcriptionVal.trim();
    setEditingTranscription(false);
    try {
      await fetch(`/api/scratch/${scrap.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: {
            ...ent,
            transcription: trimmed,
          },
          status: trimmed ? "pages" : "raw",
          statusLabel: trimmed ? "OPEN · TRANSCRIBED" : "NOT SEARCHABLE — ADD A LINE",
        }),
      });
      playSound.fileIt();
    } catch (err) {
      console.error("Failed to save transcription", err);
    }
  };

  const toggleOpen = () => {
    const next = !isOpen;
    playSound.toggle(next);
    setIsOpen(next);
    if (next && mode !== "read" && mode !== "ink") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // ── INSERT TEXT AT CURSOR ──
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const updated = notes ? `${notes}\n\n${textToInsert}` : textToInsert;
      setNotes(updated);
      void onUpdateNotes(scrap.id, updated);
      return;
    }

    const start = textarea.selectionStart ?? notes.length;
    const end = textarea.selectionEnd ?? notes.length;
    const before = notes.substring(0, start);
    const after = notes.substring(end);

    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after.length > 0 && !after.startsWith("\n") ? "\n\n" : "";

    const updated = `${before}${prefix}${textToInsert}${suffix}${after}`;
    setNotes(updated);
    setSavedStatus("AUTOSAVED");
    void onUpdateNotes(scrap.id, updated);

    // Reposition cursor after insert
    setTimeout(() => {
      const newPos = start + prefix.length + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // ── IMAGE UPLOAD HANDLER ──
  const processImageFile = async (file: File) => {
    setUploadingImage(true);
    setSavedStatus("UPLOADING IMAGE...");
    try {
      const asset = await uploadScrapImage(file, scrap.id);
      insertTextAtCursor(asset.markdown);
      setSavedStatus("AUTOSAVED");
    } catch (err) {
      console.error("Failed to upload image", err);
      setSavedStatus("UPLOAD FAILED");
      setTimeout(() => setSavedStatus("AUTOSAVED"), 3000);
    } finally {
      setUploadingImage(false);
      setIsDragOver(false);
    }
  };

  // ── CLIPBOARD PASTE LISTENER ──
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = extractImagesFromClipboard(e);
    if (images.length > 0) {
      e.preventDefault();
      void processImageFile(images[0]);
    }
  };

  // ── DRAG & DROP LISTENERS ──
  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const images = extractImagesFromDragEvent(e);
    if (images.length > 0) {
      e.preventDefault();
      void processImageFile(images[0]);
    } else {
      setIsDragOver(false);
    }
  };

  // ── FILE INPUT PICKER ──
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processImageFile(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── AI EXPAND ──
  const handleAiExpand = async () => {
    if (aiStreaming) {
      abortRef.current?.abort();
      setAiStreaming(false);
      return;
    }

    setAiStreaming(true);
    setAiStreamedText("");
    setAiError(null);
    setAiDone(false);
    setMode("split");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/scratch/${scrap.id}/expand`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "AI request failed" }));
        setAiError(data.error || "AI request failed");
        setAiStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setAiError("No response stream");
        setAiStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setAiStreamedText(accumulated);
      }

      setAiDone(true);
      setAiStreaming(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setAiStreaming(false);
        return;
      }
      setAiError(err instanceof Error ? err.message : "AI expand failed");
      setAiStreaming(false);
    }
  };

  const handleAcceptAi = async () => {
    const merged = notes.trim()
      ? `${notes.trim()}\n\n---\n\n${aiStreamedText}`
      : aiStreamedText;
    setNotes(merged);
    setAiStreamedText("");
    setAiDone(false);
    setAiError(null);

    await onUpdateNotes(scrap.id, merged);
    setSavedStatus("AUTOSAVED");
  };

  const handleDiscardAi = () => {
    setAiStreamedText("");
    setAiDone(false);
    setAiError(null);
  };

  // Format creation time
  const createdDate = new Date(scrap.createdAt);
  const timeStr = createdDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const isInk = scrap.kind === "INK";
  const hasTranscription = Boolean(currentTranscription);

  const renderFormattedText = useCallback((text: string) => {
    if (/!\[([^\]]*)\]\(([^)]+)\)/.test(text)) {
      return <ScratchMarkdown content={text} className="md-card-content" />;
    }
    let t = text;
    if (/^\?/.test(t) || /\?\s*$/.test(t)) {
      return <span className="q">{t}</span>;
    }
    if (/^>/.test(t)) {
      return <em>{t}</em>;
    }
    const parts = t.split(/(#[\w-]+)/g);
    return (
      <>
        {parts.map((p, idx) => {
          if (p.startsWith("#")) {
            return (
              <mark key={idx} style={{ background: "var(--cyan)", padding: "0 2px" }}>
                {p}
              </mark>
            );
          }
          return <React.Fragment key={idx}>{p}</React.Fragment>;
        })}
      </>
    );
  }, []);

  const showAiPanel = aiStreaming || aiStreamedText || aiError;

  return (
    <article
      id={`scrap-${scrap.id}`}
      className={`scrap${isOpen ? " open" : ""}${isPinned ? " is-pinned" : ""}`}
      style={
        {
          "--c": `var(--${scrap.color || (isInk ? "lime" : "cyan")})`,
          "--tilt": isOpen ? "0deg" : scrap.tilt || "0deg",
        } as React.CSSProperties
      }
    >
      {/* ── TOP-LEFT PAPERCLIP PIN BUTTON ── */}
      <button
        type="button"
        className={`scrap__clip-pin${isPinned ? " is-pinned" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          playSound.pin(!isPinned);
          void onTogglePin?.(scrap.id);
        }}
        title={isPinned ? "Unpin scrap (Remove paperclip)" : "Pin scrap (Attach paperclip)"}
        aria-label={isPinned ? "Unpin scrap" : "Pin scrap"}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="clip-icon"
        >
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.88-7.88" />
        </svg>
      </button>

      {/* ── CARD BODY (TEXT OR VECTOR INK) ── */}
      <div className="scrap__b">
        <span className="scrap__mk" />
        {isInk ? (
          <div
            className="scrap__ink"
            dangerouslySetInnerHTML={{
              __html: ent.inkSvg || SAMPLE_SKETCHES.d,
            }}
          />
        ) : (
          <div className="scrap__t">{renderFormattedText(scrap.content)}</div>
        )}
      </div>

      {/* ── INK TRANSCRIPTION SAYS BAR ── */}
      {isInk && hasTranscription && (
        <div className="trans">
          <b>SAYS</b>
          <span>{currentTranscription}</span>
        </div>
      )}

      {/* ── INLINE TRANSCRIPTION EDITOR ── */}
      {isInk && editingTranscription && (
        <div className="trans-editor" style={{ padding: "8px 16px 10px 35px", display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="cap2"
            value={transcriptionVal}
            onChange={(e) => setTranscriptionVal(e.target.value)}
            placeholder="one line — what does it say?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSaveTranscription();
              if (e.key === "Escape") setEditingTranscription(false);
            }}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="file"
            onClick={() => void handleSaveTranscription()}
            style={{ padding: "6px 12px", fontSize: "10px" }}
          >
            SAVE
          </button>
        </div>
      )}

      {/* ── CARD FOOTER ── */}
      <div className="scrap__f">
        <span className={`k${isInk ? " ink" : scrap.color === "violet" ? " is-violet" : ""}`}>
          {isInk ? "✎ INK" : scrap.kind}
        </span>
        {(scrap.tags || []).map((t) => (
          <span key={t} className="tg">
            {t}
          </span>
        ))}
        <span className="when">{timeStr}</span>
        <span className={`st ${isInk && !hasTranscription ? "nosearch" : isInk ? "pages" : scrap.status}`}>
          {isInk
            ? hasTranscription
              ? "OPEN · TRANSCRIBED"
              : "NOT SEARCHABLE — ADD A LINE"
            : scrap.statusLabel || scrap.status.toUpperCase()}
        </span>
      </div>

      {scrap.threadN && scrap.threadN > 0 && scrap.threadSummary ? (
        <div className="thread">
          <b>COLLIDES ×{scrap.threadN}</b>
          <span>{scrap.threadSummary}</span>
        </div>
      ) : null}

      {/* ── CARD NOTE PREVIEW BADGE (IF SCRAP HAS NOTES) ── */}
      {hasNotes && (
        <div
          className="scrap__note-preview"
          onClick={(e) => {
            e.stopPropagation();
            playSound.click();
            setIsModalOpen(true);
          }}
          title="Click to open Full Note Studio (Spacious View)"
        >
          <div className="scrap__note-preview-h">
            <span>📝 NOTES ({wordCount} WORDS)</span>
            <span className="expand-hint">STUDIO ⤢</span>
          </div>
          <div className="scrap__note-preview-t">
            {notes.slice(0, 160)}
          </div>
        </div>
      )}

      {/* ── ACTIONS BAR ── */}
      <div className="scrap__p">
        <button
          className="notes-btn"
          type="button"
          onClick={() => {
            playSound.click();
            setIsModalOpen(true);
          }}
          title="Open rich note studio & drawing board"
        >
          {hasNotes ? `📝 NOTES (${wordCount}w) ⤢` : "＋ NOTES ⤢"}
        </button>

        {isInk && !hasTranscription ? (
          <button
            type="button"
            onClick={() => {
              playSound.click();
              setEditingTranscription((prev) => !prev);
            }}
          >
            TRANSCRIBE
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              playSound.promote();
              void onPromoteTil(scrap.id);
            }}
            title="Promote this scrap to a minted TIL entry"
          >
            → TIL
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            playSound.promote();
            void onPromoteTodo(scrap.id);
          }}
          title="Promote this scrap to a Todo item"
        >
          → TODO
        </button>
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onWeld(scrap.id);
          }}
        >
          WELD
        </button>
        <button
          type="button"
          onClick={() => {
            playSound.bury();
            void onBury(scrap.id);
          }}
        >
          COMPOST
        </button>
      </div>

      {/* ── EXPANDED NOTES & INK STUDIO DRAWER ── */}
      {isOpen && (
        <div className="note-drawer">
          <div className="note__bar">
            <div className="modes">
              <button
                type="button"
                data-m="split"
                aria-pressed={mode === "split"}
                onClick={() => {
                  playSound.click();
                  setMode("split");
                }}
              >
                SPLIT
              </button>
              <button
                type="button"
                data-m="edit"
                aria-pressed={mode === "edit"}
                onClick={() => {
                  playSound.click();
                  setMode("edit");
                }}
              >
                WRITE
              </button>
              <button
                type="button"
                data-m="read"
                aria-pressed={mode === "read"}
                onClick={() => {
                  playSound.click();
                  setMode("read");
                }}
              >
                READ
              </button>
              <button
                type="button"
                data-m="ink"
                aria-pressed={mode === "ink"}
                onClick={() => {
                  playSound.click();
                  setMode("ink");
                }}
              >
                ✎ INK
              </button>
            </div>

            <div className="note__meta">
              <span className="wc">{wordCount} WORDS</span>
              {mode === "ink" && <span className="ic">{studioStrokeCount} STROKES</span>}
              <span>{savedStatus}</span>
              <span className="cheat">:::ink :::marg :::hand :::gotcha</span>
            </div>

            <div className="note__acts">
              {mode !== "ink" && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    style={{ display: "none" }}
                    onChange={handleFileInputChange}
                  />
                  <button
                    type="button"
                    className="img-btn"
                    onClick={() => {
                      playSound.click();
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingImage}
                    title="Upload screenshot or image"
                  >
                    {uploadingImage ? "⏳ UPLOADING..." : "📷 IMAGE"}
                  </button>
                  <button
                    type="button"
                    className={`ai-expand-btn${aiStreaming ? " streaming" : ""}`}
                    onClick={() => {
                      playSound.click();
                      void handleAiExpand();
                    }}
                    title={aiStreaming ? "Stop AI generation" : "AI: expand this scrap into structured notes"}
                  >
                    {aiStreaming ? "◼ STOP" : "✦ EXPAND"}
                  </button>
                </>
              )}
              <button
                type="button"
                className="expand-modal-btn"
                onClick={() => {
                  playSound.click();
                  setIsModalOpen(true);
                }}
                title="Expand note studio to full window"
              >
                ⤢ FULL STUDIO
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound.promote();
                  void onPromoteTil(scrap.id);
                }}
              >
                → TIL
              </button>
              <button type="button" onClick={handleExportSvg}>
                EXPORT SVG
              </button>
              <button type="button" onClick={handleCopyMd}>
                {copied ? "COPIED!" : "COPY MD"}
              </button>
              <button
                className="close"
                type="button"
                onClick={toggleOpen}
              >
                CLOSE ▴
              </button>
            </div>
          </div>

          {/* ── AI STREAMING PANEL ── */}
          {showAiPanel && mode !== "ink" && (
            <div className="ai-panel">
              <div className="ai-panel__header">
                <span className="ai-panel__badge">
                  <span className={`ai-panel__dot${aiStreaming ? " pulse" : ""}`} />
                  {aiStreaming ? "AI EXPANDING..." : aiError ? "AI ERROR" : "AI DRAFT"}
                </span>
                {aiDone && (
                  <span className="ai-panel__hint">
                    Review the draft below, then accept or discard
                  </span>
                )}
              </div>

              {aiError ? (
                <div className="ai-panel__error">
                  <span>⚠</span> {aiError}
                  <button type="button" onClick={handleDiscardAi}>DISMISS</button>
                </div>
              ) : (
                <>
                  <div
                    ref={aiPreviewRef}
                    className={`ai-panel__preview${aiStreaming ? " streaming" : ""}${aiDone ? " done" : ""}`}
                  >
                    {aiStreamedText ? (
                      <ScratchMarkdown content={aiStreamedText} />
                    ) : (
                      <div className="ai-panel__skeleton">
                        <div className="sk-line w80" />
                        <div className="sk-line w60" />
                        <div className="sk-line w90" />
                        <div className="sk-line w45" />
                      </div>
                    )}
                  </div>

                  {aiDone && (
                    <div className="ai-panel__actions">
                      <button
                        type="button"
                        className="ai-accept"
                        onClick={() => {
                          playSound.promote();
                          void handleAcceptAi();
                        }}
                      >
                        ✓ ACCEPT &amp; MERGE
                      </button>
                      <button
                        type="button"
                        className="ai-discard"
                        onClick={() => {
                          playSound.click();
                          handleDiscardAi();
                        }}
                      >
                        ✕ DISCARD
                      </button>
                      <button
                        type="button"
                        className="ai-retry"
                        onClick={() => {
                          playSound.click();
                          void handleAiExpand();
                        }}
                      >
                        ↻ RETRY
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── SPLIT / WRITE / READ PANES ── */}
          {mode !== "ink" ? (
            <div
              className={`note__body ${
                mode === "split" ? "" : mode === "edit" ? "edit" : "read"
              }`}
            >
              <div className={`ed${isDragOver ? " drag-over" : ""}`}>
                <textarea
                  ref={textareaRef}
                  spellCheck="false"
                  value={notes}
                  onChange={handleNotesChange}
                  onPaste={handlePaste}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  placeholder="Write in Markdown... :::ink, :::marg, :::hand, :::gotcha, #tags, ```code"
                />
                {uploadingImage && (
                  <div className="ed-upload-overlay">
                    <span>⏳ COMPRESSING &amp; UPLOADING IMAGE...</span>
                  </div>
                )}
                {isDragOver && (
                  <div className="ed-drag-overlay">
                    <span>📷 DROP IMAGE TO UPLOAD</span>
                  </div>
                )}
              </div>
              <div className="pv">
                <ScratchMarkdown content={notes} />
              </div>
            </div>
          ) : (
            /* ── FULL INK STUDIO PANE ── */
            <div className="pane paneInk on">
              <div className="studio">
                <div className="tray">
                  <div className="tray__lab">NIB</div>
                  <div className="pens">
                    {PENS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`pen${p.t === "hi" ? " hi" : ""}${p.t === "er" ? " er" : ""}`}
                        style={
                          {
                            "--n": p.c,
                            "--wt": p.wt,
                            "--r": p.r,
                          } as React.CSSProperties
                        }
                        data-t={p.t}
                        aria-pressed={studioActivePen === idx}
                        onClick={() => {
                          playSound.pop();
                          setStudioActivePen(idx);
                          studioEngineRef.current?.setTool(p);
                        }}
                        title={p.name}
                      >
                        <span className="w" />
                      </button>
                    ))}
                  </div>

                  <div className="tray__lab">SHEET</div>
                  <div className="papers">
                    {(["plain", "dot", "rule", "iso"] as const).map((pap) => (
                      <button
                        key={pap}
                        type="button"
                        data-p={pap}
                        aria-pressed={studioPaper === pap}
                        onClick={() => {
                          playSound.click();
                          setStudioPaper(pap);
                        }}
                      >
                        {pap.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="tray__lab">DO</div>
                  <div className="tools">
                    <button
                      className="undo"
                      type="button"
                      onClick={() => {
                        playSound.click();
                        studioEngineRef.current?.undo();
                      }}
                    >
                      UNDO
                    </button>
                    <button
                      className="clear"
                      type="button"
                      onClick={() => {
                        playSound.click();
                        studioEngineRef.current?.clear();
                        setStudioStrokeCount(0);
                      }}
                    >
                      CLEAR
                    </button>
                    <button
                      className="drop"
                      type="button"
                      onClick={handleDropInSketch}
                      title="Insert this sketch into notes as :::ink block"
                    >
                      DROP IN
                    </button>
                  </div>
                </div>

                <div className="board" data-paper={studioPaper}>
                  <div className="board__paper" />
                  <canvas ref={studioCanvasRef} style={{ touchAction: "none" }} />
                  <div className="board__hud">
                    <span className="hudT">{PENS[studioActivePen]?.name || "PEN"}</span>
                    <span className="hudC">{studioStrokeCount} STROKES</span>
                    <span className={`hudP${isStylusLive ? "" : " warn"}`}>
                      {isStylusLive ? "PRESSURE LIVE — STYLUS" : "NO PRESSURE — MOUSE"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SPACIOUS FULL NOTE STUDIO MODAL ── */}
      <ScratchNoteModal
        isOpen={isModalOpen}
        scrap={scrap}
        notes={notes}
        initialMode={mode}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
        onUpdateNotes={onUpdateNotes}
        onClose={() => setIsModalOpen(false)}
        onPromoteTil={onPromoteTil}
      />
    </article>
  );
};
