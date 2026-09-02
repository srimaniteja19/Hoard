"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { X, FolderPlus } from "lucide-react";

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
  courseTitle?: string;
  defaultIndex?: number;
}

export const AddModuleModal: React.FC<AddModuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  courseTitle = "COURSE",
  defaultIndex = 1,
}) => {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(`MODULE ${defaultIndex} · `);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }, 50);
    }
  }, [isOpen, defaultIndex]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    playSound.fileIt();
    onSubmit(title.trim());
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
            background: "#B8F04A",
            color: "#0A0A0A",
            borderBottom: "3px solid #0A0A0A",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <FolderPlus size={17} />
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
              }}
            >
              ADD NEW MODULE
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playSound.click();
              onClose();
            }}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              color: "#0A0A0A",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              padding: "2px",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px 22px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="module-title-input"
              style={{
                display: "block",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "#0A0A0A",
                marginBottom: "8px",
              }}
            >
              MODULE TITLE IN &quot;{courseTitle.toUpperCase()}&quot;
            </label>
            <input
              ref={inputRef}
              id="module-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MODULE 3 · ADVANCED PROMPTING"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
                fontSize: "15px",
                fontWeight: 600,
                border: "2px solid #0A0A0A",
                background: "#F3F0E8",
                color: "#0A0A0A",
                outline: "none",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onClose();
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "2px solid #0A0A0A",
                background: "transparent",
                color: "#0A0A0A",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "2px solid #0A0A0A",
                background: "#B8F04A",
                color: "#0A0A0A",
                padding: "8px 18px",
                cursor: "pointer",
                boxShadow: "3px 3px 0 #0A0A0A",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#A3E635")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#B8F04A")}
            >
              CREATE MODULE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
