"use client";

import React, { useState, useEffect, useRef } from "react";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Sparkles,
  Highlighter,
  Palette,
  ChevronDown,
  X,
  Link2,
} from "lucide-react";

export interface ColorOption {
  id: string;
  label: string;
  color: string;
  dotColor: string;
}

export interface BgColorOption {
  id: string;
  label: string;
  bg: string;
  border: string;
  lightFg: string;
  darkFg: string;
}

export const NOTION_TEXT_COLORS: ColorOption[] = [
  { id: "default", label: "Default", color: "inherit", dotColor: "#9CA3AF" },
  { id: "gray", label: "Muted", color: "#6B7280", dotColor: "#6B7280" },
  { id: "purple", label: "Purple", color: "#7C3AED", dotColor: "#7C3AED" },
  { id: "blue", label: "Blue", color: "#2563EB", dotColor: "#2563EB" },
  { id: "red", label: "Red", color: "#DC2626", dotColor: "#DC2626" },
];

export const NOTION_BG_COLORS: BgColorOption[] = [
  { id: "default", label: "Default (No highlight)", bg: "transparent", border: "transparent", lightFg: "inherit", darkFg: "inherit" },
  { id: "yellow", label: "Yellow highlight", bg: "rgba(234, 179, 8, 0.22)", border: "#EAB308", lightFg: "#713F12", darkFg: "#FEF08A" },
  { id: "green", label: "Green highlight", bg: "rgba(16, 185, 129, 0.22)", border: "#10B981", lightFg: "#064E3B", darkFg: "#A7F3D0" },
  { id: "blue", label: "Blue highlight", bg: "rgba(59, 130, 246, 0.22)", border: "#3B82F6", lightFg: "#1E3A8A", darkFg: "#BFDBFE" },
  { id: "purple", label: "Purple highlight", bg: "rgba(139, 92, 246, 0.28)", border: "#A78BFA", lightFg: "#4C1D95", darkFg: "#F3E8FF" },
];

interface FloatingSelectionToolbarProps {
  theme?: NotebookTheme;
  onFormat: (prefix: string, suffix: string, explicitText?: string, explicitBlockIdx?: number | null) => void;
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<{ text: string; blockIdx: number | null }>({
    text: "",
    blockIdx: null,
  });

  const handleApplyLink = () => {
    if (!linkUrl.trim()) return;
    const targetUrl = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    playSound.pop();
    const saved = savedSelectionRef.current;
    onFormat("[", `](${targetUrl})`, saved.text, saved.blockIdx);
    setShowLinkInput(false);
    setLinkUrl("");
  };

  useEffect(() => {
    const updateSelectionPosition = () => {
      let rect: DOMRect | null = null;
      let text = "";
      let foundBlockIdx: number | null = null;

      // 1. Try DOM Selection
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const candidate = sel.toString().trim();
        if (candidate) {
          try {
            const range = sel.getRangeAt(0);
            const node = range.commonAncestorContainer;
            const containerNode = node.nodeType === 3 ? node.parentElement : (node as Element);
            const editorCanvas = document.querySelector("[data-block-editor]");

            if (editorCanvas && containerNode && editorCanvas.contains(containerNode)) {
              let r = range.getBoundingClientRect();
              if ((r.width === 0 || r.height === 0) && range.getClientRects().length > 0) {
                r = range.getClientRects()[0];
              }
              if (r && (r.width > 0 || r.height > 0)) {
                rect = r;
                text = candidate;
                const blockEl = containerNode.closest("[data-block-index]");
                const bIdxStr = blockEl?.getAttribute("data-block-index");
                if (bIdxStr !== null && bIdxStr !== undefined) {
                  const parsed = parseInt(bIdxStr, 10);
                  if (!isNaN(parsed)) foundBlockIdx = parsed;
                }
              }
            }
          } catch {
            // Ignore range reading error
          }
        }
      }

      // 2. Fallback: check active textarea or input inside [data-block-editor]
      if (!text || !rect) {
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
          const editorCanvas = document.querySelector("[data-block-editor]");
          if (editorCanvas && editorCanvas.contains(active)) {
            const start = active.selectionStart;
            const end = active.selectionEnd;
            if (start !== null && end !== null && start !== end) {
              const candidate = active.value.substring(start, end).trim();
              if (candidate) {
                text = candidate;
                rect = active.getBoundingClientRect();
                const blockEl = active.closest("[data-block-index]");
                const bIdxStr = blockEl?.getAttribute("data-block-index");
                if (bIdxStr !== null && bIdxStr !== undefined) {
                  const parsed = parseInt(bIdxStr, 10);
                  if (!isNaN(parsed)) foundBlockIdx = parsed;
                }
              }
            }
          }
        }
      }

      if (!text || !rect || (rect.width === 0 && rect.height === 0)) {
        if (!showColorPicker && !showLinkInput) {
          setPosition(null);
          setSelectedText("");
        }
        return;
      }

      setSelectedText(text);
      savedSelectionRef.current = {
        text,
        blockIdx: foundBlockIdx,
      };

      // Clamp horizontal position so toolbar doesn't overflow screen
      const toolbarHalfWidth = 145;
      const safeLeft = Math.max(
        toolbarHalfWidth + 12,
        Math.min(window.innerWidth - toolbarHalfWidth - 12, rect.left + rect.width / 2)
      );

      // If near top of viewport, flip toolbar to appear right below the selection
      const safeTop = rect.top >= 54 ? rect.top - 46 : rect.bottom + 8;

      setPosition({
        top: safeTop,
        left: safeLeft,
      });
    };

    const handleDelayedCheck = () => {
      setTimeout(updateSelectionPosition, 10);
    };

    document.addEventListener("selectionchange", updateSelectionPosition);
    document.addEventListener("mouseup", handleDelayedCheck);
    document.addEventListener("dblclick", handleDelayedCheck);
    document.addEventListener("keyup", handleDelayedCheck);
    window.addEventListener("scroll", updateSelectionPosition, true);

    return () => {
      document.removeEventListener("selectionchange", updateSelectionPosition);
      document.removeEventListener("mouseup", handleDelayedCheck);
      document.removeEventListener("dblclick", handleDelayedCheck);
      document.removeEventListener("keyup", handleDelayedCheck);
      window.removeEventListener("scroll", updateSelectionPosition, true);
    };
  }, [showColorPicker, showLinkInput]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node) &&
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowLinkInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!position || !selectedText) return null;

  const handleApplyTextColor = (c: ColorOption) => {
    playSound.pop();
    const saved = savedSelectionRef.current;
    if (c.id === "default") {
      onFormat("", "", saved.text, saved.blockIdx);
    } else {
      onFormat(`<span style="color: ${c.color}">`, `</span>`, saved.text, saved.blockIdx);
    }
    setShowColorPicker(false);
  };

  const handleApplyBgColor = (c: BgColorOption) => {
    playSound.pop();
    const saved = savedSelectionRef.current;
    if (c.id === "default") {
      onFormat("", "", saved.text, saved.blockIdx);
    } else {
      const fg = tokens.isDark ? c.darkFg : c.lightFg;
      onFormat(
        `<mark style="background: ${c.bg}; color: ${fg}; border-bottom: 2px solid ${c.border}; border-radius: 3px; padding: 1px 5px">`,
        `</mark>`,
        saved.text,
        saved.blockIdx
      );
    }
    setShowColorPicker(false);
  };

  return (
    <div
      ref={toolbarRef}
      data-floating-selection-toolbar="true"
      className="no-print"
      onMouseDown={(e) => e.preventDefault()} // prevent blur/loss of selection
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        background: tokens.popoverBg,
        border: `2px solid ${tokens.borderPrimary}`,
        boxShadow: tokens.popoverShadow,
        borderRadius: "4px",
        fontFamily: "var(--mono, monospace)",
        animation: "fadeIn 0.1s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
      {/* Bold */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          playSound.pop();
          onFormat("**", "**", savedSelectionRef.current.text, savedSelectionRef.current.blockIdx);
        }}
        aria-label="Bold"
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          playSound.pop();
          onFormat("*", "*", savedSelectionRef.current.text, savedSelectionRef.current.blockIdx);
        }}
        aria-label="Italic"
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          playSound.pop();
          onFormat("~~", "~~", savedSelectionRef.current.text, savedSelectionRef.current.blockIdx);
        }}
        aria-label="Strikethrough"
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          playSound.pop();
          onFormat("`", "`", savedSelectionRef.current.text, savedSelectionRef.current.blockIdx);
        }}
        aria-label="Inline code"
        title="Inline Code (Cmd+E)"
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

      {/* Quick Cyber Lavender Highlighter */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          playSound.pop();
          onFormat("==", "==", savedSelectionRef.current.text, savedSelectionRef.current.blockIdx);
        }}
        aria-label="Highlight selection"
        title="Highlight selection"
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
        <Highlighter size={12} strokeWidth={2.5} color="#A78BFA" />
      </button>

      {/* Link */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          playSound.pop();
          setShowColorPicker(false);
          setShowLinkInput(!showLinkInput);
          setTimeout(() => linkInputRef.current?.focus(), 50);
        }}
        aria-label="Add or edit link"
        aria-expanded={showLinkInput}
        title="Add or edit link"
        style={{
          background: showLinkInput ? tokens.popoverHoverBg : "transparent",
          border: "none",
          borderRight: `1px solid ${tokens.borderSubtle}`,
          color: showLinkInput ? tokens.accentColor : tokens.textPrimary,
          padding: "6px 9px",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
        onMouseLeave={(e) => {
          if (!showLinkInput) e.currentTarget.style.background = "transparent";
        }}
      >
        <Link2 size={12} strokeWidth={2.5} />
      </button>

      {/* Color & Highlight Palette Trigger (Notion Style 'A' Color Picker) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          playSound.click();
          setShowColorPicker(!showColorPicker);
        }}
        aria-label="Text and highlight color palette"
        aria-expanded={showColorPicker}
        title="Text & Background Color Palette"
        style={{
          background: showColorPicker ? tokens.popoverHoverBg : "transparent",
          border: "none",
          borderRight: onAiExplain ? `1px solid ${tokens.borderSubtle}` : "none",
          color: tokens.textPrimary,
          padding: "6px 9px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "3px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
        onMouseLeave={(e) => {
          if (!showColorPicker) e.currentTarget.style.background = "transparent";
        }}
      >
        <span style={{ fontWeight: 900, fontSize: "12px", textDecoration: "underline", textDecorationColor: "#8B5CF6" }}>
          A
        </span>
        <ChevronDown size={10} style={{ opacity: 0.6 }} />
      </button>

      {/* Ask AI */}
      {onAiExplain && (
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onAiExplain(selectedText);
            setPosition(null);
            setShowColorPicker(false);
          }}
          aria-label="Explain selected text with AI"
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
          <Sparkles size={11} color={tokens.linkColor} />
          <span>✦ ASK AI</span>
        </button>
      )}
      </div>

      {/* ── Inline Link URL Input Row ── */}
      {showLinkInput && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 8px",
            borderTop: `1.5px solid ${tokens.borderSubtle}`,
            background: tokens.isDark ? "#1A1D26" : "#F5F3EB",
          }}
        >
          <Link2 size={11} style={{ opacity: 0.6, flex: "none" }} />
          <input
            ref={linkInputRef}
            className="nb-mobile-16px"
            aria-label="Link URL"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyLink();
              if (e.key === "Escape") setShowLinkInput(false);
            }}
            placeholder="Paste or type URL (https://...)"
            autoFocus
            style={{
              width: "190px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              padding: "3px 6px",
              background: tokens.isDark ? "#12141B" : "#FFFFFF",
              color: tokens.textPrimary,
              border: `1px solid ${tokens.borderPrimary}`,
            }}
          />
          <button
            type="button"
            onClick={handleApplyLink}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              background: tokens.accentColor,
              color: tokens.accentFg,
              border: "none",
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            LINK
          </button>
        </div>
      )}

      {/* ── Notion-Style Color & Background Dropdown Popover ── */}
      {showColorPicker && (
        <div
          ref={colorPickerRef}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            position: "absolute",
            top: "38px",
            left: "50%",
            transform: "translateX(-50%)",
            background: tokens.popoverBg,
            border: `2px solid ${tokens.borderPrimary}`,
            boxShadow: tokens.popoverShadow,
            width: "230px",
            maxHeight: "340px",
            overflowY: "auto",
            padding: "8px 0",
            zIndex: 100000,
            borderRadius: "4px",
            animation: "fadeIn 0.1s ease",
          }}
        >
          {/* SECTION 1: TEXT COLOR */}
          <div
            style={{
              padding: "4px 12px 6px",
              fontSize: "8.5px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: tokens.textMuted,
            }}
          >
            TEXT COLOR
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1px", padding: "0 4px" }}>
            {NOTION_TEXT_COLORS.map((tc) => (
              <button
                key={tc.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleApplyTextColor(tc)}
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  background: "transparent",
                  border: "none",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "3px",
                    background: tokens.isDark ? "#222226" : "#EBE7DC",
                    border: `1px solid ${tokens.borderSubtle}`,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    fontSize: "11px",
                    color: tc.color === "inherit" ? tokens.textPrimary : tc.color,
                  }}
                >
                  A
                </div>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: tc.color === "inherit" ? tokens.textPrimary : tc.color,
                  }}
                >
                  {tc.label}
                </span>
              </button>
            ))}
          </div>

          {/* DIVIDER */}
          <div style={{ height: "1px", background: tokens.borderSubtle, margin: "8px 0" }} />

          {/* SECTION 2: BACKGROUND (HIGHLIGHT) */}
          <div
            style={{
              padding: "4px 12px 6px",
              fontSize: "8.5px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: tokens.textMuted,
            }}
          >
            BACKGROUND (HIGHLIGHT)
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1px", padding: "0 4px" }}>
            {NOTION_BG_COLORS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleApplyBgColor(bg)}
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  background: "transparent",
                  border: "none",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "3px",
                    background: bg.bg === "transparent" ? (tokens.isDark ? "#222226" : "#EBE7DC") : bg.bg,
                    border: `1px solid ${bg.border === "transparent" ? tokens.borderSubtle : bg.border}`,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    fontSize: "11px",
                    color: bg.bg === "transparent" ? tokens.textPrimary : (tokens.isDark ? bg.darkFg : bg.lightFg),
                  }}
                >
                  A
                </div>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: tokens.textPrimary,
                  }}
                >
                  {bg.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
