"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListPlus, Plus, Sparkles, X } from "lucide-react";
import type { StudioSeries } from "@/lib/studio/types";

interface Props {
  series: StudioSeries | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (seriesId: string, titles: string[]) => void;
}

export function BatchEpisodesModal({ series, isOpen, onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText("");
      setTimeout(() => textareaRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const titles = useMemo(() => {
    return text
      .split("\n")
      .map((line) => line.replace(/^(\d+[\.\-\)]\s*|Part\s*\d+:\s*|Episode\s*\d+:\s*)/i, "").trim())
      .filter((line) => line.length > 0);
  }, [text]);

  if (!isOpen || !series) return null;

  const currentCount = series.parts.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titles.length) return;
    onSubmit(series.id, titles);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="studio-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="studio-modal studio-modal-sm"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="studio-modal-head">
          <h2 className="studio-paste-h">
            <ListPlus size={18} aria-hidden="true" />
            <span>Batch Add Episodes to “{series.title}”</span>
          </h2>
          <button
            type="button"
            className="studio-btn studio-btn-plain studio-btn-sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={14} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>

        <p className="studio-muted studio-small">
          Paste multiple episode titles or part outlines (one title per line). Numbering and prefixes like “Part 1:” or “1.” are cleaned automatically.
        </p>

        <form onSubmit={handleSubmit} className="studio-quick-idea-form">
          <div className="studio-field">
            <label className="studio-label" htmlFor="batch-episodes-text">
              Episode Titles (one per line)
            </label>
            <textarea
              id="batch-episodes-text"
              ref={textareaRef}
              className="studio-textarea studio-mono"
              rows={7}
              placeholder={
                "The origin story\nHow the money moves behind the scenes\nThe regulatory crackdown\nWho actually wins\nThe future of the industry"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {titles.length > 0 ? (
            <div className="studio-batch-preview">
              <span className="studio-label">Preview ({titles.length} episodes to be appended):</span>
              <ul className="studio-batch-preview-list">
                {titles.map((t, idx) => (
                  <li key={idx}>
                    <span className="studio-batch-preview-n">Part {currentCount + idx + 1}</span>
                    <span className="studio-batch-preview-title">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="studio-row studio-row-end" style={{ marginTop: "16px", gap: "8px" }}>
            <button
              type="button"
              className="studio-btn studio-btn-plain"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="studio-btn"
              disabled={!titles.length}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add {titles.length ? `${titles.length} Episodes` : "Episodes"} (⌘↵)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
