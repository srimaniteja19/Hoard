"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { getThemeTokens, NotebookTheme } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";
import { X, FileText, Plus, Sparkles } from "lucide-react";

interface AddPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
  onOpenAiDraft?: (initialTopic?: string) => void;
  courseTitle?: string;
  theme?: NotebookTheme;
}

export const AddPageModal: React.FC<AddPageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenAiDraft,
  courseTitle = "COURSE",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const [title, setTitle] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useModalFocusTrap({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
  });

  useEffect(() => {
    if (isOpen) {
      setTitle("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    playSound.fileIt();
    onSubmit(title.trim());
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Create new notebook page"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.65)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "16px",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          border: `3px solid ${tokens.borderPrimary}`,
          background: tokens.cardBg,
          color: tokens.textPrimary,
          boxShadow: tokens.boxShadow,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            background: "#FCE94F",
            color: "#0A0A0A",
            borderBottom: `3px solid ${tokens.borderPrimary}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <FileText size={17} />
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
              }}
            >
              ADD NEW LESSON PAGE
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: "4px",
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "22px 20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: tokens.textMuted,
                marginBottom: "6px",
              }}
            >
              ADDING TO: {courseTitle.toUpperCase()}
            </div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                marginBottom: "8px",
                color: tokens.textPrimary,
              }}
            >
              LESSON / PAGE TITLE *
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Multi-Agent Workflows & Tool Use"
              style={{
                width: "100%",
                padding: "12px 14px",
                fontFamily: "var(--display, sans-serif)",
                fontSize: "17px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                border: `2.5px solid ${tokens.borderPrimary}`,
                background: tokens.sidebarBg,
                color: tokens.textPrimary,
                boxShadow: "3px 3px 0 rgba(10,10,10,0.1)",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "14px",
              borderTop: `2px solid ${tokens.borderSubtle}`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "9px 16px",
                border: `2px solid ${tokens.borderSubtle}`,
                background: "transparent",
                color: tokens.textPrimary,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              CANCEL
            </button>

            {onOpenAiDraft && (
              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  onClose();
                  onOpenAiDraft(title.trim());
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  padding: "9px 14px",
                  border: `2.5px solid ${tokens.borderPrimary}`,
                  background: "#FCE94F",
                  color: "#0A0A0A",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: tokens.boxShadow,
                }}
              >
                <Sparkles size={13} />
                <span>DRAFT WITH AI</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!title.trim()}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                padding: "9px 20px",
                border: `2.5px solid ${tokens.borderPrimary}`,
                background: title.trim() ? "#B8F04A" : tokens.sidebarBg,
                color: title.trim() ? "#0A0A0A" : tokens.textMuted,
                cursor: title.trim() ? "pointer" : "not-allowed",
                boxShadow: title.trim() ? tokens.boxShadow : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                if (title.trim()) {
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (title.trim()) {
                  e.currentTarget.style.transform = "none";
                }
              }}
            >
              <Plus size={14} />
              ADD LESSON
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
