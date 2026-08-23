"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { parseSlabText } from "@/lib/scratch/parse";
import { findCollisions, CollisionHit, CollisionCandidate } from "@/lib/scratch/collision";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parsed = useMemo(() => {
    return parseSlabText(value);
  }, [value]);

  const collisions = useMemo(() => {
    return findCollisions(value, existingScraps, 3);
  }, [value, existingScraps]);

  const handleCommit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setValue("");
    await onFile(trimmed);
  }, [value, submitting, onFile]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleCommit();
    }
  };

  return (
    <div>
      <div className="slab">
        <textarea
          ref={textareaRef}
          id="slab"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing.  ? question  ·  > quote  ·  → action  ·  !! rant  ·  #tag"
          disabled={submitting}
        />
        <div className="slab__tear" />
        <div className="slab__bar" id="bar">
          {parsed.chips.map((chip, idx) => (
            <span
              key={idx}
              className={`pchip ${chip.type}${parsed.isGhost ? " ghost" : ""}`}
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
            disabled={submitting || !value.trim()}
          >
            FILE IT ⌘↵
          </button>
        </div>
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
