"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { Bold, Code, Italic, Sparkles } from "lucide-react";

interface FloatingFormatBubbleProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onExplain?: (selectedText: string) => void;
}

export const FloatingFormatBubble: React.FC<FloatingFormatBubbleProps> = ({
  containerRef,
  onExplain,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 1) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      // Check if selection is within the containerRef
      const range = selection.getRangeAt(0);
      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setSelectedText(text);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  if (!position || !selectedText) return null;

  const applyFormat = (wrapper: (text: string) => string) => {
    playSound.click();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedContent = selection.toString();
    const formatted = wrapper(selectedContent);

    // If inside contentEditable or textarea
    document.execCommand("insertText", false, formatted);
    setPosition(null);
  };

  return (
    <div
      ref={bubbleRef}
      role="toolbar"
      aria-label="Text formatting options"
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 99999,
        background: "#0A0A0A",
        color: "#FFFFFF",
        border: "2px solid #0A0A0A",
        boxShadow: "4px 4px 0 #FCE94F",
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "3px 5px",
        borderRadius: "0px",
        animation: "fadeIn 0.1s ease",
      }}
      onMouseDown={(e) => e.preventDefault()} // prevent blur
    >
      {/* Bold */}
      <button
        type="button"
        title="Bold Highlight (Cmd+B)"
        onClick={() => applyFormat((t) => `**${t}**`)}
        style={{
          background: "transparent",
          border: "none",
          color: "#FFFFFF",
          padding: "4px 7px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "3px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#FCE94F";
          e.currentTarget.style.color = "#0A0A0A";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#FFFFFF";
        }}
      >
        <Bold size={12} />
      </button>

      {/* Code */}
      <button
        type="button"
        title="Code Inline (Cmd+E)"
        onClick={() => applyFormat((t) => `\`${t}\``)}
        style={{
          background: "transparent",
          border: "none",
          color: "#FFFFFF",
          padding: "4px 7px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "3px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#B8F04A";
          e.currentTarget.style.color = "#0A0A0A";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#FFFFFF";
        }}
      >
        <Code size={12} />
      </button>

      {/* Italic */}
      <button
        type="button"
        title="Italic (Cmd+I)"
        onClick={() => applyFormat((t) => `*${t}*`)}
        style={{
          background: "transparent",
          border: "none",
          color: "#FFFFFF",
          padding: "4px 7px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "3px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#FF2D8A";
          e.currentTarget.style.color = "#FFFFFF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#FFFFFF";
        }}
      >
        <Italic size={12} />
      </button>

      {/* AI Explain */}
      {onExplain && (
        <>
          <span style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />
          <button
            type="button"
            title="Explain selection with AI"
            onClick={() => {
              playSound.fileIt();
              onExplain(selectedText);
              setPosition(null);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#7FE9F7",
              padding: "4px 7px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#7FE9F7";
              e.currentTarget.style.color = "#0A0A0A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#7FE9F7";
            }}
          >
            <Sparkles size={11} />
            EXPLAIN
          </button>
        </>
      )}
    </div>
  );
};
