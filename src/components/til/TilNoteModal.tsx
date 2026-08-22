"use client";

import React, { useState, useEffect, useRef } from "react";
import { TilType } from "@/db/schema";
import { X, StickyNote, Trash2 } from "lucide-react";
import { tilTypeColorVar } from "@/lib/til/typeColorTokens";

interface TilNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNote: string;
  onSave: (note: string) => Promise<void>;
  shortHash: string;
  cardTitle: string;
  cardType: TilType;
}

export const TilNoteModal: React.FC<TilNoteModalProps> = ({
  isOpen,
  onClose,
  initialNote,
  onSave,
  shortHash,
  cardTitle,
  cardType,
}) => {
  const [noteText, setNoteText] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNoteText(initialNote);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }, 50);
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await onSave(noteText.trim());
      onClose();
    } catch (e) {
      console.error("Failed to save note", e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await onSave("");
      onClose();
    } catch (e) {
      console.error("Failed to clear note", e);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="til-note-modal-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 10, 10, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="til-note-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "85vh",
          background: "var(--card, #FFFDF7)",
          border: "3px solid var(--ink)",
          boxShadow: "8px 8px 0 var(--ink)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            background: tilTypeColorVar(cardType),
            borderBottom: "3px solid var(--ink)",
            color: "#000",
            fontFamily: "var(--mono)",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "0.12em",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <StickyNote size={16} />
            <span>
              NOTE ON #{shortHash} ({cardType})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
              padding: "4px",
              fontWeight: 900,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable if tall) */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Parent card context quote */}
          <div
            style={{
              padding: "10px 14px",
              background: "var(--shelf, #E7E2D8)",
              border: "2px solid var(--ink)",
              fontFamily: "var(--body)",
              fontSize: "13.5px",
              fontWeight: 600,
              lineHeight: 1.35,
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9.5px",
                fontWeight: 800,
                opacity: 0.6,
                display: "block",
                marginBottom: "3px",
                letterSpacing: "0.1em",
              }}
            >
              ENTRY CONTEXT
            </span>
            {cardTitle || "Untitled entry"}
          </div>

          {/* Note Editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                opacity: 0.65,
                textTransform: "uppercase",
              }}
            >
              YOUR NOTES / SYNTHESIS
            </label>
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              placeholder="Add key timestamps, reflections, follow-up questions, or personal takeaways..."
              style={{
                width: "100%",
                minHeight: "120px",
                border: "2.5px solid var(--ink)",
                background: "var(--paper)",
                color: "var(--ink)",
                fontFamily: "var(--body)",
                fontSize: "15px",
                lineHeight: 1.45,
                fontWeight: 600,
                padding: "12px 14px",
                boxSizing: "border-box",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 700,
              opacity: 0.6,
            }}
          >
            <span>{noteText.length} CHARACTERS</span>
            <span>PRESS ⌘↵ TO SAVE</span>
          </div>
        </div>

        {/* Modal Footer Actions (Always visible at bottom) */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: "3px solid var(--ink)",
            background: "var(--shelf, #E7E2D8)",
            gap: "12px",
          }}
        >
          {initialNote ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                background: "var(--paper)",
                color: "var(--pink)",
                border: "2px solid var(--ink)",
                padding: "9px 14px",
                cursor: "pointer",
                boxShadow: "2px 2px 0 var(--ink)",
              }}
            >
              <Trash2 size={13} /> CLEAR NOTE
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11.5px",
                fontWeight: 800,
                background: "var(--paper)",
                color: "var(--ink)",
                border: "2px solid var(--ink)",
                padding: "9px 16px",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "var(--mono)",
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                background: "var(--ink)",
                color: "var(--yellow, #FFE94A)",
                border: "2px solid var(--ink)",
                padding: "9px 22px",
                cursor: "pointer",
                boxShadow: "3px 3px 0 var(--pink)",
              }}
            >
              {saving ? "SAVING..." : "SAVE NOTE ↵"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
