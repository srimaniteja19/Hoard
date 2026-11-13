"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { getThemeTokens, NotebookTheme } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";
import { X, Sparkles, BookOpen, Layers } from "lucide-react";

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; provider?: string; accent?: string; accentFg?: string }) => void;
  theme?: NotebookTheme;
}

const COLOR_PRESETS = [
  { name: "Violet", hex: "#7B5CF0", fg: "#FFFFFF" },
  { name: "Orange", hex: "#FF9E2C", fg: "#0A0A0A" },
  { name: "Pink", hex: "#FF2D8A", fg: "#FFFFFF" },
  { name: "Lime", hex: "#B8F04A", fg: "#0A0A0A" },
  { name: "Cyan", hex: "#7FE9F7", fg: "#0A0A0A" },
  { name: "Emerald", hex: "#10B981", fg: "#FFFFFF" },
  { name: "Indigo", hex: "#3B82F6", fg: "#FFFFFF" },
  { name: "Crimson", hex: "#E11D48", fg: "#FFFFFF" },
];

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("DEEPLEARNING.AI");
  const [selectedAccent, setSelectedAccent] = useState(COLOR_PRESETS[0]);
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
    onSubmit({
      title: title.trim(),
      provider: provider.trim() || "SELF STUDY",
      accent: selectedAccent.hex,
      accentFg: selectedAccent.fg,
    });
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Create new notebook course"
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
          maxWidth: "520px",
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
            background: selectedAccent.hex,
            color: selectedAccent.fg,
            borderBottom: `3px solid ${tokens.borderPrimary}`,
            transition: "background 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <BookOpen size={17} />
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
              }}
            >
              CREATE NEW COURSE
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
              opacity: 0.8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px 22px 20px" }}>
          {/* Course Title Input */}
          <div style={{ marginBottom: "18px" }}>
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
              COURSE TITLE *
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. LLM Systems & AI Agents"
              style={{
                width: "100%",
                padding: "12px 14px",
                fontFamily: "var(--display, sans-serif)",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                border: `2.5px solid ${tokens.borderPrimary}`,
                background: tokens.sidebarBg,
                color: tokens.textPrimary,
                boxShadow: "3px 3px 0 rgba(10,10,10,0.1)",
              }}
            />
          </div>

          {/* Provider / Platform */}
          <div style={{ marginBottom: "18px" }}>
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
              PROVIDER / PLATFORM
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              {["DEEPLEARNING.AI", "STANFORD", "FAST.AI", "YOUTUBE", "CUSTOM"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    if (p === "CUSTOM") setProvider("");
                    else setProvider(p);
                  }}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "4px 8px",
                    border: `1.5px solid ${tokens.borderPrimary}`,
                    background: provider === p ? tokens.accentColor : tokens.cardBg,
                    color: provider === p ? tokens.accentFg : tokens.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="nb-mobile-16px"
              value={provider}
              onChange={(e) => setProvider(e.target.value.toUpperCase())}
              placeholder="e.g. HARVARD CS50, ANTHROPIC"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                border: `2px solid ${tokens.borderPrimary}`,
                background: tokens.sidebarBg,
                color: tokens.textPrimary,
              }}
            />
          </div>

          {/* Accent Color Picker */}
          <div style={{ marginBottom: "24px" }}>
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
              ACCENT COLOR THEME
            </label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {COLOR_PRESETS.map((preset) => {
                const isSelected = selectedAccent.hex === preset.hex;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    title={preset.name}
                    aria-label={`Select ${preset.name} accent color`}
                    onClick={() => {
                      playSound.click();
                      setSelectedAccent(preset);
                    }}
                    style={{
                      width: "32px",
                      height: "32px",
                      background: preset.hex,
                      border: isSelected ? `3px solid ${tokens.borderPrimary}` : `2px solid ${tokens.borderSubtle}`,
                      boxShadow: isSelected ? `3px 3px 0 ${tokens.borderPrimary}` : "none",
                      cursor: "pointer",
                      transform: isSelected ? "scale(1.1)" : "scale(1)",
                      transition: "transform 0.1s ease, box-shadow 0.1s ease",
                      borderRadius: "0px",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "16px",
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
                padding: "10px 18px",
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

            <button
              type="submit"
              disabled={!title.trim()}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                padding: "10px 22px",
                border: `2.5px solid ${tokens.borderPrimary}`,
                background: title.trim() ? "#FCE94F" : tokens.sidebarBg,
                color: title.trim() ? "#0A0A0A" : tokens.textMuted,
                cursor: title.trim() ? "pointer" : "not-allowed",
                boxShadow: title.trim() ? tokens.boxShadow : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
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
              <Sparkles size={13} />
              CREATE COURSE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
