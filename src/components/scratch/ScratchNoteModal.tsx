"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ScrapRow, ScrapEntities } from "@/db/schema";
import { ScratchMarkdown } from "./ScratchMarkdown";
import {
  uploadScrapImage,
  extractImagesFromClipboard,
  extractImagesFromDragEvent,
} from "@/lib/scratch/image";
import { createInkEngine, SAMPLE_SKETCHES } from "@/lib/scratch/ink";
import { playSound } from "@/lib/sound";

interface ScratchNoteModalProps {
  isOpen: boolean;
  scrap: ScrapRow;
  notes: string;
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onClose: () => void;
  onPromoteTil: (id: string) => Promise<void> | void;
  initialMode?: "split" | "edit" | "read" | "ink";
}

type NoteMode = "split" | "edit" | "read" | "ink";

export const ScratchNoteModal: React.FC<ScratchNoteModalProps> = ({
  isOpen,
  scrap,
  notes: initialNotes,
  onUpdateNotes,
  onClose,
  onPromoteTil,
  initialMode = "split",
}) => {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<NoteMode>(initialMode);
  const [notes, setNotes] = useState(initialNotes);
  const [savedStatus, setSavedStatus] = useState("AUTOSAVED");
  const [copied, setCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Ink Studio state
  const [studioActivePen, setStudioActivePen] = useState(0);
  const [studioPaper, setStudioPaper] = useState<"plain" | "dot" | "rule" | "iso">("dot");
  const [studioStrokeCount, setStudioStrokeCount] = useState(0);
  const [isStylusLive, setIsStylusLive] = useState(false);

  // AI expansion state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamedText, setAiStreamedText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDone, setAiDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const aiPreviewRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement>(null);
  const studioEngineRef = useRef<ReturnType<typeof createInkEngine> | null>(null);

  const ent = (scrap.entities || {}) as ScrapEntities;

  const PENS = useMemo<
    Array<{ t: "pen" | "hi" | "er"; c: string; w: number; r: string; wt: string; name: string }>
  >(
    () => [
      { t: "pen", c: "#0A0A0A", w: 2, r: "-3deg", wt: "2px", name: "PEN · 2PX" },
      { t: "pen", c: "#0A0A0A", w: 5, r: "2deg", wt: "5px", name: "PEN · 5PX" },
      { t: "pen", c: "#FF3D8A", w: 3, r: "-2deg", wt: "3px", name: "PEN · 3PX" },
      { t: "pen", c: "#7B5CF0", w: 3, r: "3deg", wt: "3px", name: "PEN · 3PX" },
      { t: "hi", c: "#FFE94A", w: 18, r: "2deg", wt: "18px", name: "HIGHLIGHTER · 18PX" },
      { t: "hi", c: "#A8E85C", w: 18, r: "-3deg", wt: "18px", name: "HIGHLIGHTER · 18PX" },
      { t: "er", c: "#000000", w: 22, r: "2deg", wt: "22px", name: "ERASER · 22PX" },
    ],
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // Keyboard shortcut listener for ESC to close and cmd+1..4 to switch modes
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        setMode("split");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "2") {
        e.preventDefault();
        setMode("edit");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "3") {
        e.preventDefault();
        setMode("read");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "4") {
        e.preventDefault();
        setMode("ink");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).filter(Boolean).length : 0;

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
    }, 500);
  };

  const handleInsertDirective = (directive: string) => {
    playSound.pop();
    const textarea = textareaRef.current;
    if (!textarea) {
      setNotes((prev) => `${prev}\n\n${directive}\n`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = notes.substring(0, start);
    const after = notes.substring(end);
    const updated = `${before}${before.endsWith("\n") || !before ? "" : "\n"}${directive}\n${after}`;
    setNotes(updated);
    void onUpdateNotes(scrap.id, updated);
    setTimeout(() => {
      textarea.focus();
      const pos = start + directive.length + 1;
      textarea.setSelectionRange(pos, pos);
    }, 20);
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

  const processImageFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const asset = await uploadScrapImage(file);
      const insertText = `\n\n${asset.markdown}\n\n`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newNotes = notes.substring(0, start) + insertText + notes.substring(end);
        setNotes(newNotes);
        await onUpdateNotes(scrap.id, newNotes);
      } else {
        const newNotes = notes + insertText;
        setNotes(newNotes);
        await onUpdateNotes(scrap.id, newNotes);
      }
    } catch (err) {
      console.error("Failed to upload image to note", err);
    } finally {
      setUploadingImage(false);
      setIsDragOver(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = extractImagesFromClipboard(e);
    if (images.length > 0) {
      e.preventDefault();
      void processImageFile(images[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const images = extractImagesFromDragEvent(e);
    if (images.length > 0) {
      e.preventDefault();
      void processImageFile(images[0]);
    } else {
      setIsDragOver(false);
    }
  };

  const handleDropInSketch = () => {
    playSound.fileIt();
    const engine = studioEngineRef.current;
    if (!engine || engine.count() === 0) return;
    const svg = engine.toSvg();
    const caption = "Handmade sketch";
    const block = `\n\n:::ink ${caption}\n${svg}\n:::\n\n`;

    const updated = notes.trim() ? `${notes.trim()}${block}` : block.trim();
    setNotes(updated);
    void onUpdateNotes(scrap.id, updated);
    setMode("split");
  };

  // AI Expand note handler
  const handleAiExpand = useCallback(async () => {
    if (aiStreaming) {
      abortRef.current?.abort();
      setAiStreaming(false);
      return;
    }

    setShowAiPanel(true);
    setAiStreaming(true);
    setAiStreamedText("");
    setAiError(null);
    setAiDone(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/scratch/${scrap.id}/expand-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existingNotes: notes }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setAiStreamedText(fullText);
      }

      setAiDone(true);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setAiDone(true);
      } else {
        setAiError(err?.message || "Failed to generate notes");
      }
    } finally {
      setAiStreaming(false);
    }
  }, [aiStreaming, scrap.id, notes]);

  const handleAcceptAi = useCallback(async () => {
    if (!aiStreamedText.trim()) return;
    const merged = notes.trim()
      ? `${notes.trim()}\n\n---\n\n${aiStreamedText.trim()}`
      : aiStreamedText.trim();
    setNotes(merged);
    await onUpdateNotes(scrap.id, merged);
    setShowAiPanel(false);
    setAiStreamedText("");
    setAiDone(false);
  }, [aiStreamedText, notes, onUpdateNotes, scrap.id]);

  const handleDiscardAi = useCallback(() => {
    abortRef.current?.abort();
    setShowAiPanel(false);
    setAiStreaming(false);
    setAiStreamedText("");
    setAiError(null);
    setAiDone(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalNode = (
    <div className="note-modal-backdrop" onClick={onClose}>
      <div className="note-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* ── TOP BAR 1: SCRAP CONTEXT & CLOSE ── */}
        <div className="note-modal-topbar">
          <div className="note-modal-topbar__left">
            <span className="pchip kind">{scrap.kind}</span>
            <div className="note-modal-scrap-text" title={scrap.content}>
              {scrap.content}
            </div>
          </div>

          <div className="note-modal-topbar__right">
            <span className="pchip ghost">
              {wordCount} WORD{wordCount === 1 ? "" : "S"}
            </span>
            <span className="pchip act">{savedStatus}</span>
            <button className="note-modal-close" type="button" onClick={onClose} title="Close Studio (Esc)">
              ✕ CLOSE (ESC)
            </button>
          </div>
        </div>

        {/* ── TOP BAR 2: MODE TABS + DIRECTIVES + ACTIONS ── */}
        <div className="note-modal-controls">
          <div className="note-modal-modes">
            <button
              type="button"
              data-m="split"
              aria-pressed={mode === "split"}
              onClick={() => {
                playSound.click();
                setMode("split");
              }}
              title="Split Editor & Preview (⌘1)"
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
              title="Full Editor (⌘2)"
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
              title="Reading View (⌘3)"
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
              title="Ink Drawing Studio (⌘4)"
            >
              ✎ INK STUDIO
            </button>
          </div>

          {mode !== "ink" && (
            <div className="note-modal-directives">
              <span className="dir-label">INSERT:</span>
              <button
                type="button"
                onClick={() => handleInsertDirective(":::gotcha Critical insight\nWatch out for...\n:::")}
                title="Insert Gotcha callout"
              >
                :::gotcha
              </button>
              <button
                type="button"
                onClick={() => handleInsertDirective(":::action Action item\n- [ ] Next step\n:::")}
                title="Insert Action checklist"
              >
                :::action
              </button>
              <button
                type="button"
                onClick={() => handleInsertDirective(":::question Inquiry\nWhy does this happen?\n:::")}
                title="Insert Question callout"
              >
                :::question
              </button>
              <button
                type="button"
                onClick={() => handleInsertDirective(":::marg\nMargin annotation\n:::")}
                title="Insert Margin note"
              >
                :::marg
              </button>
              <button
                type="button"
                onClick={() => handleInsertDirective(":::hand\nHandwritten cursive block\n:::")}
                title="Insert Handwriting block"
              >
                :::hand
              </button>
              <button
                type="button"
                onClick={() => handleInsertDirective("```ts\n// Code snippet\n\n```")}
                title="Insert Code block"
              >
                ```code
              </button>
            </div>
          )}

          <div className="note-modal-acts">
            {mode !== "ink" && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) void processImageFile(files[0]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    playSound.click();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploadingImage}
                  title="Upload image / screenshot"
                >
                  📷 {uploadingImage ? "UPLOADING..." : "IMAGE"}
                </button>
                <button
                  type="button"
                  className={`ai-expand-btn${aiStreaming ? " streaming" : ""}`}
                  onClick={() => {
                    playSound.click();
                    void handleAiExpand();
                  }}
                  title={aiStreaming ? "Stop AI generation" : "AI: synthesize & expand this note"}
                >
                  {aiStreaming ? "◼ STOP" : "✦ AI EXPAND"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                playSound.promote();
                void onPromoteTil(scrap.id);
              }}
              title="Promote notes to TIL"
            >
              → TIL
            </button>
            {mode === "ink" && (
              <button type="button" onClick={handleExportSvg} title="Export Vector SVG">
                EXPORT SVG
              </button>
            )}
            <button type="button" onClick={handleCopyMd} title="Copy Raw Markdown">
              {copied ? "COPIED!" : "COPY MD"}
            </button>
          </div>
        </div>

        {/* ── AI STREAMING PANEL ── */}
        {showAiPanel && mode !== "ink" && (
          <div className="ai-panel">
            <div className="ai-panel__header">
              <span className="ai-panel__badge">
                <span className={`ai-panel__dot${aiStreaming ? " pulse" : ""}`} />
                {aiStreaming ? "AI EXPANDING NOTES..." : aiError ? "AI ERROR" : "AI DRAFT"}
              </span>
              {aiDone && (
                <span className="ai-panel__hint">
                  Review the structured draft below, then accept or discard
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

        {/* ── MODAL BODY: SPLIT, WRITE, READ, INK ── */}
        <div className="note-modal-body">
          {mode !== "ink" ? (
            <div
              className={`note__body ${
                mode === "split" ? "split" : mode === "edit" ? "edit" : "read"
              }`}
            >
              <div
                className={`ed${isDragOver ? " drag-over" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <textarea
                  ref={textareaRef}
                  spellCheck="false"
                  value={notes}
                  onChange={handleNotesChange}
                  onPaste={handlePaste}
                  placeholder="# Notes &amp; Synthesis&#10;&#10;Write with rich markdown, paste screenshots, or sketch in ✎ INK mode...&#10;&#10;:::gotcha&#10;Key insight here&#10;:::"
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
            <div className="paneInk on">
              <div className="studio">
                <div className="tray">
                  <div className="tray__lab">PENS</div>
                  <div className="pens">
                    {PENS.map((p, idx) => (
                      <button
                        key={idx}
                        className={`pen${p.t === "hi" ? " hi" : p.t === "er" ? " er" : ""}`}
                        style={
                          {
                            "--n": p.c,
                            "--r": p.r,
                            "--wt": p.wt,
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
                        <div className="w" />
                      </button>
                    ))}
                  </div>

                  <div className="tray__lab">PAPER</div>
                  <div className="papers">
                    {(["plain", "dot", "rule", "iso"] as const).map((paper) => (
                      <button
                        key={paper}
                        type="button"
                        data-paper={paper}
                        aria-pressed={studioPaper === paper}
                        onClick={() => {
                          playSound.click();
                          setStudioPaper(paper);
                        }}
                      >
                        {paper.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="tray__lab">ACTIONS</div>
                  <div className="tools">
                    <button
                      className="undo"
                      type="button"
                      onClick={() => {
                        playSound.click();
                        studioEngineRef.current?.undo();
                      }}
                      title="Undo stroke"
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
                      title="Clear canvas"
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
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
