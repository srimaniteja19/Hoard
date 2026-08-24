"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { parseSlabText } from "@/lib/scratch/parse";
import { findCollisions, CollisionHit, CollisionCandidate } from "@/lib/scratch/collision";
import {
  uploadScrapImage,
  extractImagesFromClipboard,
  extractImagesFromDragEvent,
} from "@/lib/scratch/image";
import { playSound } from "@/lib/sound";

interface ScratchSlabProps {
  onFile: (text: string) => Promise<void> | void;
  existingScraps: CollisionCandidate[];
  onWeldCandidate?: (candidate: CollisionHit, currentSlabText: string) => void;
  submitting?: boolean;
}

export const ScratchSlab: React.FC<ScratchSlabProps> = ({
  onFile,
  existingScraps,
  onWeldCandidate,
  submitting = false,
}) => {
  const [value, setValue] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    return parseSlabText(value);
  }, [value]);

  // Collisions are shelf-only: disabled for log entries
  const collisions = useMemo(() => {
    if (parsed.isLog) return [];
    return findCollisions(value, existingScraps, 3);
  }, [value, existingScraps, parsed.isLog]);

  const handleCommit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting || uploadingImage) return;
    playSound.fileIt();
    setValue("");
    await onFile(trimmed);
  }, [value, submitting, uploadingImage, onFile]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleCommit();
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

  return (
    <div>
      <div className={`slab${parsed.isLog ? " islog" : ""}${isDragOver ? " drag-over" : ""}`}>
        <textarea
          ref={textareaRef}
          id="slab"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          placeholder="Type anything.  walked 10 miles yesterday #fitness  ·  ? why does this keep happening  ·  → try isolation: isolate"
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
        <div className="slab__tear" />
        <div className="slab__bar" id="bar">
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
              className={`pchip ${chip.type}${chip.isSheet ? " sheet" : ""}${parsed.isGhost ? " ghost" : ""}`}
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
        </div>
      </div>

      <div className="grammar">
        TWO RULES, THAT&apos;S ALL. A VERB OR PREFIX SETS THE KIND · #TAG SETS THE TOPIC. VERBS: WATCHED READ PLAYED WALKED RAN SWAM ATE COOKED WENT SAW MADE LISTENED. PREFIXES: ~ LOG · ? QUESTION · &gt; QUOTE · → ACTION · !! RANT.
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
