"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { ScrapKind } from "@/db/schema";
import { parseSlabText } from "@/lib/scratch/parse";
import { findCollisions, CollisionHit, CollisionCandidate } from "@/lib/scratch/collision";
import {
  uploadScrapImage,
  extractImagesFromClipboard,
  extractImagesFromDragEvent,
} from "@/lib/scratch/image";
import { createInkEngine, InkTool } from "@/lib/scratch/ink";
import { playSound } from "@/lib/sound";

interface ScratchSlabProps {
  onFile: (
    text: string,
    options?: {
      kind?: ScrapKind;
      inkSvg?: string;
      inkStrokes?: any[];
      transcription?: string;
    }
  ) => Promise<void> | void;
  existingScraps: CollisionCandidate[];
  onWeldCandidate?: (candidate: CollisionHit, currentSlabText: string) => void;
  submitting?: boolean;
}

const SLAB_NIBS: Array<{ t: "pen" | "hi" | "er"; c: string; w: number; r: string }> = [
  { t: "pen", c: "#0A0A0A", w: 2.4, r: "-3deg" },
  { t: "pen", c: "#FF3D8A", w: 2.8, r: "2deg" },
  { t: "pen", c: "#7B5CF0", w: 2.8, r: "-2deg" },
  { t: "hi", c: "#FFE94A", w: 16, r: "3deg" },
  { t: "er", c: "#000000", w: 20, r: "-2deg" },
];

export const ScratchSlab: React.FC<ScratchSlabProps> = ({
  onFile,
  existingScraps,
  onWeldCandidate,
  submitting = false,
}) => {
  const [mode, setMode] = useState<"type" | "ink">("type");
  const [value, setValue] = useState("");
  const [transcription, setTranscription] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [inkDirty, setInkDirty] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [activeNibIndex, setActiveNibIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkEngineRef = useRef<ReturnType<typeof createInkEngine> | null>(null);

  // Initialize ink engine ONLY on mode switch to "ink"
  useEffect(() => {
    if (mode === "ink" && canvasRef.current) {
      const engine = createInkEngine(canvasRef.current, {
        onCount: (n) => setStrokeCount(n),
        onDirty: () => setInkDirty(true),
      });
      inkEngineRef.current = engine;
      engine.setTool(SLAB_NIBS[activeNibIndex] || SLAB_NIBS[0]);

      // Ensure canvas is properly sized
      requestAnimationFrame(() => engine.fit());
      const fitTimer = setTimeout(() => engine.fit(), 50);

      const handleResize = () => engine.fit();
      window.addEventListener("resize", handleResize);

      return () => {
        clearTimeout(fitTimer);
        window.removeEventListener("resize", handleResize);
        engine.destroy();
        inkEngineRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const parsed = useMemo(() => {
    return parseSlabText(value);
  }, [value]);

  // Collisions are shelf-only: disabled for log entries and ink mode
  const collisions = useMemo(() => {
    if (mode === "ink" || parsed.isLog) return [];
    return findCollisions(value, existingScraps, 3);
  }, [value, existingScraps, parsed.isLog, mode]);

  const handleCommit = useCallback(async () => {
    if (submitting || uploadingImage) return;

    if (mode === "ink") {
      const engine = inkEngineRef.current;
      if (!engine || engine.count() === 0) return;
      playSound.fileIt();
      const svg = engine.toSvg();
      const strokes = engine.getStrokes();
      const trans = transcription.trim();
      const content = trans || "Handwritten Ink Scrap";

      engine.clear();
      setInkDirty(false);
      setStrokeCount(0);
      setTranscription("");

      await onFile(content, {
        kind: "INK",
        inkSvg: svg,
        inkStrokes: strokes,
        transcription: trans,
      });
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) return;
    playSound.fileIt();
    setValue("");
    await onFile(trimmed);
  }, [mode, submitting, uploadingImage, value, transcription, onFile]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleCommit();
    } else if (e.key === "Escape") {
      if (mode === "type") setValue("");
      if (mode === "ink") {
        inkEngineRef.current?.clear();
        setInkDirty(false);
        setStrokeCount(0);
        setTranscription("");
      }
    }
  };

  const processImageFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const asset = await uploadScrapImage(file);
      setValue((prev) => (prev.trim() ? `${prev.trim()}\n\n${asset.markdown}` : asset.markdown));
    } catch (err) {
      console.error("Failed to upload image from slab", err);
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

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setIsDragOver(true);
    }
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processImageFile(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSelectNib = (index: number) => {
    playSound.pop();
    setActiveNibIndex(index);
    inkEngineRef.current?.setTool(SLAB_NIBS[index]);
  };

  return (
    <div>
      <div
        className={`slab${mode === "type" && parsed.isLog ? " islog" : ""}${
          mode === "ink" ? " isink" : ""
        }${isDragOver ? " drag-over" : ""}`}
        id="slab"
      >
        {/* ── SLAB MODES HEADER ── */}
        <div className="slab__modes" id="slabModes">
          <button
            type="button"
            data-c="type"
            aria-pressed={mode === "type"}
            onClick={() => {
              playSound.click();
              setMode("type");
              setTimeout(() => textareaRef.current?.focus(), 20);
            }}
          >
            TYPE
          </button>
          <button
            type="button"
            data-c="ink"
            aria-pressed={mode === "ink"}
            onClick={() => {
              playSound.click();
              setMode("ink");
            }}
          >
            ✎ WRITE BY HAND
          </button>
          <span className="sp" />
          <span className="hintk">⌘↵ FILES IT · ESC CLEARS</span>
        </div>

        {/* ── TYPE MODE TEXTAREA ── */}
        {mode === "type" && (
          <>
            <textarea
              ref={textareaRef}
              id="ta"
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              placeholder="walked 10 miles yesterday #fitness  ·  ? why does this keep happening  ·  → try isolation: isolate"
              disabled={submitting || uploadingImage}
            />
            {uploadingImage && (
              <div className="slab-upload-indicator">
                <span>⏳ COMPRESSING &amp; UPLOADING IMAGE...</span>
              </div>
            )}
            {(() => {
              const match = value.match(/!\[([^\]]*)\]\(([^)]+)\)/);
              if (!match) return null;
              const imgUrl = match[2];
              const imgAlt = match[1];
              return (
                <div className="slab-img-preview">
                  <div className="slab-img-preview__wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={imgAlt || "Image"} />
                    <button
                      type="button"
                      className="slab-img-preview__remove"
                      onClick={() => {
                        playSound.click();
                        setValue((prev) =>
                          prev.replace(/!\[([^\]]*)\]\(([^)]+)\)\n?/, "").trim()
                        );
                      }}
                      title="Remove image"
                    >
                      ✕ REMOVE
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ── INK MODE DRAWING STRIP ── */}
        {mode === "ink" && (
          <div className="slabink">
            <div className="slabink__row">
              <div className="miniTray" id="miniTray">
                {SLAB_NIBS.map((nib, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`nib${nib.t === "er" ? " er" : ""}`}
                    style={
                      {
                        "--n": nib.c,
                        "--r": nib.r,
                      } as React.CSSProperties
                    }
                    data-t={nib.t}
                    aria-pressed={activeNibIndex === idx}
                    onClick={() => handleSelectNib(idx)}
                    title={nib.t === "er" ? "Eraser" : nib.t === "hi" ? "Highlighter" : "Pen"}
                  />
                ))}
                <button
                  className="u"
                  id="sUndo"
                  type="button"
                  onClick={() => {
                    playSound.click();
                    inkEngineRef.current?.undo();
                  }}
                  title="Undo last stroke"
                >
                  UNDO
                </button>
                <button
                  className="u"
                  id="sClear"
                  type="button"
                  onClick={() => {
                    playSound.click();
                    inkEngineRef.current?.clear();
                    setInkDirty(false);
                    setStrokeCount(0);
                  }}
                  title="Clear canvas"
                >
                  CLR
                </button>
              </div>

              <div className={`strip${inkDirty || strokeCount > 0 ? " dirty" : ""}`} id="strip">
                <canvas ref={canvasRef} id="scv" style={{ touchAction: "none" }} />
                <div className="strip__ph">write here — ruled like a notebook</div>
              </div>
            </div>
          </div>
        )}

        <div className="slab__tear" />

        {/* ── SLAB BAR ── */}
        <div className="slab__bar" id="bar">
          {mode === "ink" ? (
            <>
              <span className="pchip dest">→ THE SHELF</span>
              <span className="pchip kind">✎ INK</span>
              <span className="pchip ghost">
                {strokeCount} STROKE{strokeCount === 1 ? "" : "S"}
              </span>
              <span className={transcription.trim() ? "pchip tag" : "pchip warn"}>
                {transcription.trim() ? "TRANSCRIBED" : "NOT SEARCHABLE YET"}
              </span>
              <input
                className="cap2"
                id="inkcap"
                type="text"
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="one line — what does it say? (optional, makes it findable)"
              />
              <button
                className="file"
                type="button"
                onClick={handleCommit}
                disabled={submitting || strokeCount === 0}
              >
                FILE IT ⌘↵
              </button>
            </>
          ) : (
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
                className="pchip img-picker"
                onClick={() => {
                  playSound.click();
                  fileInputRef.current?.click();
                }}
                disabled={uploadingImage || submitting}
                title="Upload or paste an image/screenshot"
              >
                📷 {uploadingImage ? "UPLOADING..." : "IMAGE"}
              </button>
              {parsed.chips.map((chip, idx) => (
                <span
                  key={idx}
                  className={`pchip ${chip.type}${chip.isSheet ? " sheet" : ""}${
                    parsed.isGhost ? " ghost" : ""
                  }`}
                >
                  {chip.label}
                </span>
              ))}
              <span className="pchip ghost">
                {parsed.wordCount} WORD{parsed.wordCount === 1 ? "" : "S"}
              </span>
              <span className="sp" />
              <button
                className="file"
                type="button"
                onClick={handleCommit}
                disabled={submitting || uploadingImage || !value.trim()}
              >
                FILE IT ⌘↵
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grammar">
        TWO RULES. A VERB OR PREFIX SETS THE KIND · #TAG SETS THE TOPIC. VERBS: WATCHED READ PLAYED
        WALKED RAN SWAM ATE COOKED WENT SAW MADE LISTENED. PREFIXES: ~ LOG · ? QUESTION · &gt; QUOTE
        · → ACTION · !! RANT. HANDWRITING FILES AS AN INK SCRAP.
      </div>

      {collisions.length > 0 && (
        <div className="hit on" id="hit">
          <div className="hit__h">
            <span>◈ YOU&apos;VE BEEN HERE BEFORE</span>
            <span>
              {collisions.length} EARLIER SCRAP{collisions.length > 1 ? "S" : ""} TOUCH THIS
            </span>
          </div>
          <div id="hitrows">
            {collisions.map((hit) => (
              <div
                key={hit.id}
                className="hit__r"
                onClick={() => onWeldCandidate?.(hit, value)}
              >
                <span className="ago">{hit.ago}</span>
                <span
                  className="tx"
                  dangerouslySetInnerHTML={{ __html: hit.highlightedText }}
                />
                <button
                  type="button"
                  className="weld"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWeldCandidate?.(hit, value);
                  }}
                >
                  WELD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
