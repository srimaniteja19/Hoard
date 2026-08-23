"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ScrapRow } from "@/db/schema";
import { ScratchMarkdown } from "./ScratchMarkdown";
import {
  uploadScrapImage,
  extractImagesFromClipboard,
  extractImagesFromDragEvent,
} from "@/lib/scratch/image";

interface ScratchCardProps {
  scrap: ScrapRow;
  isOpenDefault?: boolean;
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onPromoteTodo: (id: string) => Promise<void> | void;
  onWeld: (id: string) => void;
  onBury: (id: string) => Promise<void> | void;
}

type NoteMode = "split" | "edit" | "read";

export const ScratchCard: React.FC<ScratchCardProps> = ({
  scrap,
  isOpenDefault = false,
  onUpdateNotes,
  onPromoteTil,
  onPromoteTodo,
  onWeld,
  onBury,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [mode, setMode] = useState<NoteMode>("split");
  const [notes, setNotes] = useState(scrap.notes || "");
  const [savedStatus, setSavedStatus] = useState("AUTOSAVED");
  const [copied, setCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamedText, setAiStreamedText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDone, setAiDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const aiPreviewRef = useRef<HTMLDivElement>(null);

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
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && mode !== "read") {
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
    // reset input
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

  const renderFormattedText = useCallback((text: string) => {
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
      className={`scrap${isOpen ? " open" : ""}`}
      style={
        {
          "--c": `var(--${scrap.color || "cyan"})`,
          "--tilt": isOpen ? "0deg" : scrap.tilt || "0deg",
        } as React.CSSProperties
      }
    >
      <div className="scrap__b">
        <span className="scrap__mk" />
        <div className="scrap__t">{renderFormattedText(scrap.content)}</div>
      </div>

      <div className="scrap__f">
        <span className={`k ${scrap.color === "violet" ? "is-violet" : ""}`}>
          {scrap.kind}
        </span>
        <span className="when">{timeStr}</span>
        <span className={`st ${scrap.status}`}>
          {scrap.statusLabel || scrap.status.toUpperCase()}
        </span>
      </div>

      {scrap.threadN && scrap.threadN > 0 && scrap.threadSummary ? (
        <div className="thread">
          <b>COLLIDES ×{scrap.threadN}</b>
          <span>{scrap.threadSummary}</span>
        </div>
      ) : null}

      <div className="scrap__p">
        <button
          className="notes-btn"
          type="button"
          onClick={toggleOpen}
        >
          {isOpen ? "NOTES ▴" : hasNotes ? "NOTES ▾" : "＋ ADD NOTES"}
        </button>
        <button
          type="button"
          onClick={() => onPromoteTil(scrap.id)}
          title="Promote this scrap to a minted TIL entry"
        >
          → TIL
        </button>
        <button
          type="button"
          onClick={() => onPromoteTodo(scrap.id)}
          title="Promote this scrap to a Todo item"
        >
          → TODO
        </button>
        <button type="button" onClick={() => onWeld(scrap.id)}>
          WELD
        </button>
        <button type="button" onClick={() => onBury(scrap.id)}>
          BURY
        </button>
      </div>

      {isOpen && (
        <div className="note-drawer">
          <div className="note__bar">
            <div className="modes">
              <button
                type="button"
                data-m="split"
                aria-pressed={mode === "split"}
                onClick={() => setMode("split")}
              >
                SPLIT
              </button>
              <button
                type="button"
                data-m="edit"
                aria-pressed={mode === "edit"}
                onClick={() => setMode("edit")}
              >
                WRITE
              </button>
              <button
                type="button"
                data-m="read"
                aria-pressed={mode === "read"}
                onClick={() => setMode("read")}
              >
                READ
              </button>
            </div>

            <div className="note__meta">
              <span className="wc">{wordCount} WORDS</span>
              <span>{savedStatus}</span>
              <span className="cheat">:::gotcha :::question :::action :::fact</span>
            </div>

            <div className="note__acts">
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
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Paste, drag-and-drop, or click to upload screenshots and images"
              >
                {uploadingImage ? "⏳ UPLOADING..." : "📷 IMAGE"}
              </button>
              <button
                type="button"
                className={`ai-expand-btn${aiStreaming ? " streaming" : ""}`}
                onClick={handleAiExpand}
                title={aiStreaming ? "Stop AI generation" : "AI: expand this scrap into structured notes"}
              >
                {aiStreaming ? "◼ STOP" : "✦ EXPAND"}
              </button>
              <button type="button" onClick={() => onPromoteTil(scrap.id)}>
                → TIL
              </button>
              <button type="button" onClick={handleCopyMd}>
                {copied ? "COPIED!" : "COPY MD"}
              </button>
              <button
                className="close"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                CLOSE ▴
              </button>
            </div>
          </div>

          {/* ── AI STREAMING PANEL ── */}
          {showAiPanel && (
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
                        onClick={handleAcceptAi}
                      >
                        ✓ ACCEPT &amp; MERGE
                      </button>
                      <button
                        type="button"
                        className="ai-discard"
                        onClick={handleDiscardAi}
                      >
                        ✕ DISCARD
                      </button>
                      <button
                        type="button"
                        className="ai-retry"
                        onClick={handleAiExpand}
                      >
                        ↻ RETRY
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

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
                placeholder="Write in Markdown... Paste screenshots (Cmd+V), drop images, #tags, ```code, :::gotcha, | tables"
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
        </div>
      )}
    </article>
  );
};
