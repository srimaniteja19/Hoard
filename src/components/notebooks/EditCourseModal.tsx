"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { SeedCourse } from "@/lib/notebooks/seedData";
import { X, BookOpen, Check } from "lucide-react";

interface EditCourseModalProps {
  isOpen: boolean;
  course: SeedCourse | null;
  onClose: () => void;
  onSubmit: (updated: { title: string; provider: string; accent: string; accentFg: string }) => void;
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

export const EditCourseModal: React.FC<EditCourseModalProps> = ({
  isOpen,
  course,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [selectedAccent, setSelectedAccent] = useState(COLOR_PRESETS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && course) {
      setTitle(course.title);
      setProvider(course.provider);
      const match = COLOR_PRESETS.find((c) => c.hex.toLowerCase() === course.accent.toLowerCase());
      setSelectedAccent(match || { name: "Custom", hex: course.accent, fg: course.accentFg || "#FFFFFF" });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, course]);

  if (!isOpen || !course) return null;

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.7)",
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
          border: "3px solid #0A0A0A",
          background: "#FFFFFF",
          boxShadow: "10px 10px 0 #0A0A0A",
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
            borderBottom: "3px solid #0A0A0A",
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
              EDIT COURSE DETAILS
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
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
                color: "#0A0A0A",
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
              placeholder="e.g. Distributed Systems 101"
              style={{
                width: "100%",
                padding: "12px 14px",
                fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
                fontSize: "16px",
                fontWeight: 600,
                border: "2px solid #0A0A0A",
                background: "#F3F0E8",
                color: "#0A0A0A",
                outline: "none",
                borderRadius: 0,
                boxShadow: "3px 3px 0 rgba(10,10,10,0.1)",
              }}
            />
          </div>

          {/* Provider / Platform Input */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                marginBottom: "8px",
                color: "#0A0A0A",
              }}
            >
              PLATFORM / SOURCE / INSTRUCTOR
            </label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. MIT OPENCOURSEWARE, COURSERA, STANFORD"
              style={{
                width: "100%",
                padding: "11px 14px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "13px",
                fontWeight: 600,
                border: "2px solid #0A0A0A",
                background: "#F3F0E8",
                color: "#0A0A0A",
                outline: "none",
                borderRadius: 0,
                boxShadow: "3px 3px 0 rgba(10,10,10,0.1)",
              }}
            />
          </div>

          {/* Color Accent Picker */}
          <div style={{ marginBottom: "26px" }}>
            <label
              style={{
                display: "block",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                marginBottom: "10px",
                color: "#0A0A0A",
              }}
            >
              ACCENT THEME COLOR
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {COLOR_PRESETS.map((preset) => {
                const isSelected = selectedAccent.hex === preset.hex;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      playSound.click();
                      setSelectedAccent(preset);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      border: isSelected ? "2.5px solid #0A0A0A" : "1.5px solid rgba(10,10,10,0.2)",
                      background: isSelected ? "#FCE94F" : "#FFFFFF",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: isSelected ? "2px 2px 0 #0A0A0A" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        background: preset.hex,
                        border: "1.5px solid #0A0A0A",
                        flex: "none",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        color: "#0A0A0A",
                      }}
                    >
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "16px",
              borderTop: "2px solid rgba(10,10,10,0.12)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                border: "2px solid #0A0A0A",
                background: "transparent",
                color: "#0A0A0A",
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EBE7DC")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              CANCEL
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 22px",
                border: "2px solid #0A0A0A",
                background: "#0A0A0A",
                color: "#B8F04A",
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                cursor: "pointer",
                boxShadow: "3px 3px 0 #B8F04A",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-1px, -1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(0, 0)")}
            >
              <Check size={14} />
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
