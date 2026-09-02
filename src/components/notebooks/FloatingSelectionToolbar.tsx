"use client";

import React, { useState, useEffect, useRef } from "react";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import { Bold, Italic, Strikethrough, Code, Sparkles, Highlighter } from "lucide-react";

interface FloatingSelectionToolbarProps {
  theme?: NotebookTheme;
  onFormat: (prefix: string, suffix: string) => void;
  onAiExplain?: (selectedText: string) => void;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  theme = "cream",
  onFormat,
  onAiExplain,
}) => {
  const tokens = getThemeTokens(theme);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length === 0) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Check if selection is within editor canvas
      const editorCanvas = document.querySelector("[data-block-editor]");
      if (editorCanvas && !editorCanvas.contains(range.commonAncestorContainer)) {
        setPosition(null);
        return;
      }

      setSelectedText(text);
      setPosition({
        top: Math.max(10, rect.top - 46 + window.scrollY),
        left: rect.left + rect.width / 2,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  if (!position || !selectedText) return null;

  return (
    <div
      ref={toolbarRef}
      className="no-print"
      onMouseDown={(e) => e.preventDefault()} // prevent blur/loss of selection
      style={{
        position: "fixed",
        top: `${position.top - window.scrollY}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        background: tokens.popoverBg,
        border: `2px solid ${tokens.borderPrimary}`,
        boxShadow: tokens.popoverShadow,
        borderRadius: "4px",
        overflow: "hidden",
        fontFamily: "var(--mono, monospace)",
        animation: "fadeIn 0.1s ease",
      }}
    >
      {/* Bold */}
      <button
        type="button"
        onClick={() => {
          playSound.pop();
          onFormat("**", "**");
        }}
        title="Bold (Cmd+B)"
        style={{
          background: "transparent",
          border: "none",
          borderRight: `1px solid ${tokens.borderSubtle}`,
          color: tokens.textPrimary,
          padding: "6px 9px",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Bold size={12} strokeWidth={2.8} />
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => {
          playSound.pop();
          onFormat("*", "*");
        }}
        title="Italic (Cmd+I)"
        style={{
          background: "transparent",
          border: "none",
          borderRight: `1px solid ${tokens.borderSubtle}`,
          color: tokens.textPrimary,
          padding: "6px 9px",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Italic size={12} strokeWidth={2.5} />
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        onClick={() => {
          playSound.pop();
          onFormat("~~", "~~");
        }}
        title="Strikethrough"
        style={{
          background: "transparent",
          border: "none",
          borderRight: `1px solid ${tokens.borderSubtle}`,
          color: tokens.textPrimary,
          padding: "6px 9px",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Strikethrough size={12} strokeWidth={2.5} />
      </button>

      {/* Inline Code */}
      <button
        type="button"
        onClick={() => {
          playSound.pop();
          onFormat("`", "`");
        }}
        title="Inline Code"
        style={{
          background: "transparent",
          border: "none",
          borderRight: `1px solid ${tokens.borderSubtle}`,
          color: tokens.textPrimary,
          padding: "6px 9px",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Code size={12} strokeWidth={2.5} />
      </button>

      {/* Highlight Marker */}
      <button
        type="button"
        onClick={() => {
          playSound.pop();
          onFormat("==", "==");
        }}
        title="Highlight (Yellow Marker)"
        style={{
          background: "transparent",
          border: "none",
          borderRight: onAiExplain ? `1px solid ${tokens.borderSubtle}` : "none",
          color: tokens.textPrimary,
          padding: "6px 9px",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Highlighter size={12} strokeWidth={2.5} color="#FFD700" />
      </button>

      {/* Ask AI */}
      {onAiExplain && (
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onAiExplain(selectedText);
            setPosition(null);
          }}
          title="Explain selected text with AI"
          style={{
            background: "transparent",
            border: "none",
            color: tokens.textPrimary,
            padding: "6px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Sparkles size={11} color="#7B5CF0" />
          <span>✦ ASK AI</span>
        </button>
      )}
    </div>
  );
};
