"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, Plus, X } from "lucide-react";
import {
  FORMAT_LABEL,
  PILLAR_LABEL,
  STUDIO_FORMATS,
  STUDIO_PILLARS,
  type StudioFormat,
  type StudioPillar,
} from "@/lib/studio/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (idea: {
    title: string;
    hook: string;
    pillar: StudioPillar;
    format: StudioFormat;
  }) => void;
}

export function QuickIdeaModal({ isOpen, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [pillar, setPillar] = useState<StudioPillar>("finance");
  const [format, setFormat] = useState<StudioFormat>("reel");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setHook("");
      setPillar("finance");
      setFormat("reel");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      hook: hook.trim(),
      pillar,
      format,
    });
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
            <Lightbulb size={18} aria-hidden="true" />
            <span>Quick Idea Capture</span>
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
          Jot a video hook or premise from anywhere in Studio. It will be saved into your Ideas hopper with one-click AI script drafting.
        </p>

        <form onSubmit={handleSubmit} className="studio-quick-idea-form">
          <div className="studio-field">
            <label className="studio-label" htmlFor="quick-idea-title">
              Idea Concept or Title *
            </label>
            <input
              id="quick-idea-title"
              ref={inputRef}
              className="studio-input"
              placeholder="e.g. Why credit card points are actually a hidden tax"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="studio-field">
            <label className="studio-label" htmlFor="quick-idea-hook">
              Opening Hook / Angle (Optional)
            </label>
            <textarea
              id="quick-idea-hook"
              className="studio-textarea"
              rows={2}
              placeholder="The 3-second visual or verbal opener that stops the scroll…"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
          </div>

          <div className="studio-row studio-gap">
            <div className="studio-field" style={{ flex: 1 }}>
              <label className="studio-label" htmlFor="quick-idea-pillar">
                Topic Pillar
              </label>
              <select
                id="quick-idea-pillar"
                className="studio-select-input"
                value={pillar}
                onChange={(e) => setPillar(e.target.value as StudioPillar)}
              >
                {STUDIO_PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {PILLAR_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="studio-field" style={{ flex: 1 }}>
              <label className="studio-label" htmlFor="quick-idea-format">
                Format
              </label>
              <select
                id="quick-idea-format"
                className="studio-select-input"
                value={format}
                onChange={(e) => setFormat(e.target.value as StudioFormat)}
              >
                {STUDIO_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              disabled={!title.trim()}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Capture Idea (⌘↵)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
